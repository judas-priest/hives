import { PazaakGame } from './game-logic.js';

export class SocketHandler {
  constructor(io, database, authService) {
    this.io = io;
    this.db = database;
    this.auth = authService;
    this.games = new Map(); // matchId -> PazaakGame
    this.waitingPlayers = [];
    this.userSockets = new Map(); // userId -> socketId
  }

  handleConnection(socket) {
    console.log(`Client connected: ${socket.id}`);

    // Authenticate socket connection
    socket.on('authenticate', async (token) => {
      try {
        const decoded = this.auth.verifyToken(token);
        socket.userId = decoded.userId;
        socket.username = decoded.username;
        this.userSockets.set(decoded.userId, socket.id);

        socket.emit('authenticated', {
          userId: decoded.userId,
          username: decoded.username
        });

        console.log(`User authenticated: ${decoded.username} (${decoded.userId})`);
      } catch (error) {
        socket.emit('auth_error', { error: error.message });
      }
    });

    // Find match (matchmaking)
    socket.on('find_match', () => {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      // Check if already in a game
      const existingGame = this.findUserGame(socket.userId);
      if (existingGame) {
        socket.emit('error', { message: 'Already in a game' });
        return;
      }

      // Check if already waiting
      if (this.waitingPlayers.find(p => p.userId === socket.userId)) {
        socket.emit('error', { message: 'Already searching for match' });
        return;
      }

      // Try to match with waiting player
      if (this.waitingPlayers.length > 0) {
        const opponent = this.waitingPlayers.shift();
        this.createMatch(socket.userId, opponent.userId, socket, opponent.socket);
      } else {
        // Add to waiting list
        this.waitingPlayers.push({ userId: socket.userId, socket });
        socket.emit('searching', { message: 'Searching for opponent...' });
      }
    });

    // Cancel matchmaking
    socket.on('cancel_search', () => {
      this.waitingPlayers = this.waitingPlayers.filter(p => p.userId !== socket.userId);
      socket.emit('search_cancelled');
    });

    // Game actions
    socket.on('draw_card', () => this.handleDrawCard(socket));
    socket.on('play_side_card', (data) => this.handlePlaySideCard(socket, data));
    socket.on('stand', () => this.handleStand(socket));

    // Get current game state
    socket.on('get_state', () => {
      const game = this.findUserGame(socket.userId);
      if (game) {
        const state = game.getGameState(socket.userId);
        socket.emit('game_state', state);
      }
    });

    // Get player statistics
    socket.on('get_stats', () => {
      if (socket.userId) {
        const stats = this.db.getPlayerStats(socket.userId);
        socket.emit('stats', stats);
      }
    });

    // Get leaderboard
    socket.on('get_leaderboard', () => {
      const leaderboard = this.db.getLeaderboard();
      socket.emit('leaderboard', leaderboard);
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);

      // Remove from waiting list
      this.waitingPlayers = this.waitingPlayers.filter(p => p.userId !== socket.userId);

      // Handle game disconnect
      if (socket.userId) {
        this.userSockets.delete(socket.userId);
        this.handleGameDisconnect(socket.userId);
      }
    });
  }

  createMatch(player1Id, player2Id, socket1, socket2) {
    // Create match in database
    const matchId = this.db.createMatch(player1Id, player2Id);

    // Create game instance
    const game = new PazaakGame(player1Id, player2Id);
    this.games.set(matchId, { game, matchId, player1Id, player2Id });

    // Join both players to a room
    const roomId = `match_${matchId}`;
    socket1.join(roomId);
    socket2.join(roomId);

    // Notify both players
    this.io.to(roomId).emit('match_found', {
      matchId,
      player1: { id: player1Id, username: socket1.username },
      player2: { id: player2Id, username: socket2.username }
    });

    // Send initial game state
    socket1.emit('game_state', game.getGameState(player1Id));
    socket2.emit('game_state', game.getGameState(player2Id));

    console.log(`Match created: ${matchId} (${socket1.username} vs ${socket2.username})`);
  }

  handleDrawCard(socket) {
    const gameData = this.findUserGame(socket.userId);
    if (!gameData) {
      socket.emit('error', { message: 'Not in a game' });
      return;
    }

    const { game, matchId } = gameData;

    if (game.currentPlayer !== socket.userId) {
      socket.emit('error', { message: 'Not your turn' });
      return;
    }

    const result = game.drawMainCard(socket.userId);

    if (result.error) {
      socket.emit('error', { message: result.error });
      return;
    }

    // Broadcast to room
    const roomId = `match_${matchId}`;
    this.io.to(roomId).emit('card_drawn', {
      playerId: socket.userId,
      card: result.card,
      newScore: result.newScore,
      busted: result.busted
    });

    // If busted, auto-end round
    if (result.busted) {
      setTimeout(() => this.handleStand(socket), 1000);
    } else {
      // Switch player
      game.switchPlayer();
      this.broadcastGameState(matchId, game);
    }
  }

  handlePlaySideCard(socket, data) {
    const gameData = this.findUserGame(socket.userId);
    if (!gameData) {
      socket.emit('error', { message: 'Not in a game' });
      return;
    }

    const { game, matchId } = gameData;

    if (game.currentPlayer !== socket.userId) {
      socket.emit('error', { message: 'Not your turn' });
      return;
    }

    const result = game.playSideCard(socket.userId, data.cardIndex, data.modifier);

    if (result.error) {
      socket.emit('error', { message: result.error });
      return;
    }

    // Broadcast to room
    const roomId = `match_${matchId}`;
    this.io.to(roomId).emit('side_card_played', {
      playerId: socket.userId,
      card: result.card,
      valueChange: result.valueChange,
      newScore: result.newScore,
      busted: result.busted
    });

    // Update game state
    this.broadcastGameState(matchId, game);
  }

  handleStand(socket) {
    const gameData = this.findUserGame(socket.userId);
    if (!gameData) {
      socket.emit('error', { message: 'Not in a game' });
      return;
    }

    const { game, matchId, player1Id, player2Id } = gameData;

    const result = game.stand(socket.userId);

    // Broadcast to room
    const roomId = `match_${matchId}`;
    this.io.to(roomId).emit('player_stood', { playerId: socket.userId });

    // Check if round ended
    if (result.roundNumber !== undefined) {
      // Round ended
      setTimeout(() => {
        this.io.to(roomId).emit('round_ended', result);

        // Save round to database
        this.db.addRound(
          matchId,
          result.roundNumber,
          result.winner,
          result.player1Score,
          result.player2Score
        );

        // Check if game is over
        if (result.gameOver) {
          this.endMatch(matchId, result.matchWinner, result.player1RoundsWon, result.player2RoundsWon);
        } else {
          // Start next round
          setTimeout(() => {
            this.broadcastGameState(matchId, game);
          }, 2000);
        }
      }, 1000);
    } else {
      // Just standing, switch player
      game.switchPlayer();
      this.broadcastGameState(matchId, game);
    }
  }

  endMatch(matchId, winnerId, player1Score, player2Score) {
    const gameData = this.games.get(matchId);
    if (!gameData) return;

    const { player1Id, player2Id } = gameData;

    // Update database
    this.db.updateMatchResult(matchId, winnerId, player1Score, player2Score);

    // Update player statistics
    this.db.updatePlayerStats(player1Id, {
      matchesPlayed: 1,
      matchesWon: winnerId === player1Id ? 1 : 0,
      matchesLost: winnerId === player2Id ? 1 : 0,
      roundsWon: player1Score,
      roundsLost: player2Score
    });

    this.db.updatePlayerStats(player2Id, {
      matchesPlayed: 1,
      matchesWon: winnerId === player2Id ? 1 : 0,
      matchesLost: winnerId === player1Id ? 1 : 0,
      roundsWon: player2Score,
      roundsLost: player1Score
    });

    // Notify players
    const roomId = `match_${matchId}`;
    this.io.to(roomId).emit('match_ended', {
      winner: winnerId,
      player1Score,
      player2Score
    });

    // Clean up
    this.games.delete(matchId);
  }

  handleGameDisconnect(userId) {
    const gameData = this.findUserGame(userId);
    if (!gameData) return;

    const { matchId, player1Id, player2Id } = gameData;
    const opponentId = userId === player1Id ? player2Id : player1Id;
    const winnerId = opponentId;

    // Opponent wins by forfeit
    const roomId = `match_${matchId}`;
    this.io.to(roomId).emit('player_disconnected', {
      disconnectedPlayer: userId,
      winner: winnerId
    });

    // End match with opponent as winner
    const player1Score = userId === player1Id ? 0 : 3;
    const player2Score = userId === player2Id ? 0 : 3;
    this.endMatch(matchId, winnerId, player1Score, player2Score);
  }

  findUserGame(userId) {
    for (const [matchId, data] of this.games.entries()) {
      if (data.player1Id === userId || data.player2Id === userId) {
        return data;
      }
    }
    return null;
  }

  broadcastGameState(matchId, game) {
    const gameData = this.games.get(matchId);
    if (!gameData) return;

    const { player1Id, player2Id } = gameData;
    const roomId = `match_${matchId}`;

    // Send personalized state to each player
    const socket1 = this.io.sockets.sockets.get(this.userSockets.get(player1Id));
    const socket2 = this.io.sockets.sockets.get(this.userSockets.get(player2Id));

    if (socket1) {
      socket1.emit('game_state', game.getGameState(player1Id));
    }
    if (socket2) {
      socket2.emit('game_state', game.getGameState(player2Id));
    }
  }
}
