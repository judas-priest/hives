// Pazaak Game Logic
// Based on Star Wars: Knights of the Old Republic card game

export class PazaakGame {
  constructor(player1Id, player2Id) {
    this.player1 = {
      id: player1Id,
      score: 0,
      hand: [],
      mainDeck: this.createMainDeck(),
      sideDeck: this.createSideDeck(),
      standing: false,
      busted: false,
      roundsWon: 0
    };

    this.player2 = {
      id: player2Id,
      score: 0,
      hand: [],
      mainDeck: this.createMainDeck(),
      sideDeck: this.createSideDeck(),
      standing: false,
      busted: false,
      roundsWon: 0
    };

    this.currentPlayer = player1Id;
    this.roundNumber = 1;
    this.gameOver = false;
    this.winner = null;
  }

  // Create main deck (4 cards each of values 1-10)
  createMainDeck() {
    const deck = [];
    for (let value = 1; value <= 10; value++) {
      for (let i = 0; i < 4; i++) {
        deck.push({ type: 'main', value });
      }
    }
    return this.shuffleDeck(deck);
  }

  // Create side deck (10 special cards with +/- values)
  createSideDeck() {
    const cards = [
      { type: 'side', value: 1, modifier: '+' },
      { type: 'side', value: 2, modifier: '+' },
      { type: 'side', value: 3, modifier: '+' },
      { type: 'side', value: 4, modifier: '+' },
      { type: 'side', value: 1, modifier: '-' },
      { type: 'side', value: 2, modifier: '-' },
      { type: 'side', value: 3, modifier: '-' },
      { type: 'side', value: 4, modifier: '-' },
      { type: 'side', value: 6, modifier: '+/-' }, // Can be used as + or -
      { type: 'side', value: 1, modifier: '2x' }   // Doubles or halves
    ];

    // Shuffle and give player 4 random cards from side deck
    const shuffled = this.shuffleDeck(cards);
    return shuffled.slice(0, 4);
  }

  shuffleDeck(deck) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  getCurrentPlayer() {
    return this.currentPlayer === this.player1.id ? this.player1 : this.player2;
  }

  getOpponent() {
    return this.currentPlayer === this.player1.id ? this.player2 : this.player1;
  }

  // Draw a card from main deck
  drawMainCard(playerId) {
    const player = playerId === this.player1.id ? this.player1 : this.player2;

    if (player.standing || player.busted) {
      return { error: 'Player cannot draw' };
    }

    if (player.mainDeck.length === 0) {
      return { error: 'No cards left in main deck' };
    }

    const card = player.mainDeck.pop();
    player.score += card.value;

    // Check if busted
    if (player.score > 20) {
      player.busted = true;
    }

    return { card, newScore: player.score, busted: player.busted };
  }

  // Play a card from side deck
  playSideCard(playerId, cardIndex, modifier = '+') {
    const player = playerId === this.player1.id ? this.player1 : this.player2;

    if (player.standing || player.busted) {
      return { error: 'Player cannot play cards' };
    }

    if (cardIndex < 0 || cardIndex >= player.sideDeck.length) {
      return { error: 'Invalid card index' };
    }

    const card = player.sideDeck[cardIndex];
    let valueChange = 0;

    // Apply card effect based on type
    if (card.modifier === '+') {
      valueChange = card.value;
    } else if (card.modifier === '-') {
      valueChange = -card.value;
    } else if (card.modifier === '+/-') {
      // Player chooses + or -
      valueChange = modifier === '+' ? card.value : -card.value;
    } else if (card.modifier === '2x') {
      // Doubles or halves the current score
      if (modifier === 'double') {
        valueChange = player.score;
      } else {
        valueChange = -Math.floor(player.score / 2);
      }
    }

    player.score += valueChange;
    player.sideDeck.splice(cardIndex, 1);

    // Check if busted
    if (player.score > 20) {
      player.busted = true;
    } else if (player.score < 0) {
      player.score = 0;
    }

    return { card, valueChange, newScore: player.score, busted: player.busted };
  }

  // Player chooses to stand
  stand(playerId) {
    const player = playerId === this.player1.id ? this.player1 : this.player2;
    player.standing = true;

    // Check if round is over
    if (this.player1.standing && this.player2.standing ||
        this.player1.busted || this.player2.busted) {
      return this.endRound();
    }

    return { standing: true };
  }

  // End current round and determine winner
  endRound() {
    let roundWinner = null;

    // Determine round winner
    if (this.player1.busted && this.player2.busted) {
      // Both busted, no winner
      roundWinner = null;
    } else if (this.player1.busted) {
      roundWinner = this.player2.id;
      this.player2.roundsWon++;
    } else if (this.player2.busted) {
      roundWinner = this.player1.id;
      this.player1.roundsWon++;
    } else if (this.player1.standing && this.player2.standing) {
      // Both standing, higher score wins
      if (this.player1.score > this.player2.score) {
        roundWinner = this.player1.id;
        this.player1.roundsWon++;
      } else if (this.player2.score > this.player1.score) {
        roundWinner = this.player2.id;
        this.player2.roundsWon++;
      }
      // Tie = no winner
    }

    const roundResult = {
      roundNumber: this.roundNumber,
      winner: roundWinner,
      player1Score: this.player1.score,
      player2Score: this.player2.score,
      player1RoundsWon: this.player1.roundsWon,
      player2RoundsWon: this.player2.roundsWon
    };

    // Check if match is over (first to 3 rounds wins)
    if (this.player1.roundsWon >= 3) {
      this.gameOver = true;
      this.winner = this.player1.id;
    } else if (this.player2.roundsWon >= 3) {
      this.gameOver = true;
      this.winner = this.player2.id;
    } else {
      // Start new round
      this.startNewRound();
    }

    return {
      ...roundResult,
      gameOver: this.gameOver,
      matchWinner: this.winner
    };
  }

  // Start a new round
  startNewRound() {
    this.roundNumber++;

    // Reset round state
    this.player1.score = 0;
    this.player1.standing = false;
    this.player1.busted = false;
    this.player1.mainDeck = this.createMainDeck();

    this.player2.score = 0;
    this.player2.standing = false;
    this.player2.busted = false;
    this.player2.mainDeck = this.createMainDeck();
  }

  // Switch to next player
  switchPlayer() {
    this.currentPlayer = this.currentPlayer === this.player1.id ? this.player2.id : this.player1.id;
  }

  // Get game state for a specific player (hides opponent's hand)
  getGameState(playerId) {
    const player = playerId === this.player1.id ? this.player1 : this.player2;
    const opponent = playerId === this.player1.id ? this.player2 : this.player1;

    return {
      roundNumber: this.roundNumber,
      currentPlayer: this.currentPlayer,
      gameOver: this.gameOver,
      winner: this.winner,
      player: {
        id: player.id,
        score: player.score,
        sideDeck: player.sideDeck,
        standing: player.standing,
        busted: player.busted,
        roundsWon: player.roundsWon,
        mainDeckCount: player.mainDeck.length
      },
      opponent: {
        id: opponent.id,
        score: opponent.score,
        sideDeckCount: opponent.sideDeck.length,
        standing: opponent.standing,
        busted: opponent.busted,
        roundsWon: opponent.roundsWon,
        mainDeckCount: opponent.mainDeck.length
      }
    };
  }

  // Get full game state (for server/admin)
  getFullState() {
    return {
      roundNumber: this.roundNumber,
      currentPlayer: this.currentPlayer,
      gameOver: this.gameOver,
      winner: this.winner,
      player1: {
        id: this.player1.id,
        score: this.player1.score,
        sideDeck: this.player1.sideDeck,
        standing: this.player1.standing,
        busted: this.player1.busted,
        roundsWon: this.player1.roundsWon,
        mainDeckCount: this.player1.mainDeck.length
      },
      player2: {
        id: this.player2.id,
        score: this.player2.score,
        sideDeck: this.player2.sideDeck,
        standing: this.player2.standing,
        busted: this.player2.busted,
        roundsWon: this.player2.roundsWon,
        mainDeckCount: this.player2.mainDeck.length
      }
    };
  }
}
