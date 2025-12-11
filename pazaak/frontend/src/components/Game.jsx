import React, { useState, useEffect } from 'react';
import socket from '../services/socket';
import { NumberCard, SideCard, CardBack, EmptySlot } from '../assets/CardSVG';

export default function Game({ user, onLeaveGame }) {
  const [gameState, setGameState] = useState(null);
  const [searching, setSearching] = useState(true);
  const [matchInfo, setMatchInfo] = useState(null);
  const [message, setMessage] = useState('Searching for opponent...');
  const [selectedSideCard, setSelectedSideCard] = useState(null);
  const [showModifierChoice, setShowModifierChoice] = useState(false);

  useEffect(() => {
    // Start searching for match
    socket.findMatch();

    // Set up event listeners
    socket.on('searching', (data) => {
      setMessage(data.message);
    });

    socket.on('match_found', (data) => {
      setSearching(false);
      setMatchInfo(data);
      setMessage('Match found! Starting game...');
    });

    socket.on('game_state', (state) => {
      setGameState(state);
    });

    socket.on('card_drawn', (data) => {
      setMessage(`${data.playerId === user.id ? 'You' : 'Opponent'} drew a card!`);
    });

    socket.on('side_card_played', (data) => {
      setMessage(`${data.playerId === user.id ? 'You' : 'Opponent'} played a side card!`);
    });

    socket.on('player_stood', (data) => {
      setMessage(`${data.playerId === user.id ? 'You' : 'Opponent'} stood!`);
    });

    socket.on('round_ended', (data) => {
      const winnerText = data.winner === user.id ? 'You won' : 'Opponent won';
      setMessage(`Round ended! ${winnerText} this round.`);
    });

    socket.on('match_ended', (data) => {
      const winnerText = data.winner === user.id ? 'You won' : 'You lost';
      setMessage(`Match over! ${winnerText} the match!`);
      setTimeout(() => {
        onLeaveGame();
      }, 5000);
    });

    socket.on('player_disconnected', (data) => {
      setMessage('Opponent disconnected. You win!');
      setTimeout(() => {
        onLeaveGame();
      }, 3000);
    });

    socket.on('error', (data) => {
      console.error('Game error:', data.message);
    });

    return () => {
      socket.off('searching');
      socket.off('match_found');
      socket.off('game_state');
      socket.off('card_drawn');
      socket.off('side_card_played');
      socket.off('player_stood');
      socket.off('round_ended');
      socket.off('match_ended');
      socket.off('player_disconnected');
      socket.off('error');
    };
  }, [user.id, onLeaveGame]);

  const handleDrawCard = () => {
    if (canTakeAction()) {
      socket.drawCard();
    }
  };

  const handlePlaySideCard = (index) => {
    if (!canTakeAction()) return;

    const card = gameState.player.sideDeck[index];

    // Check if card requires modifier choice
    if (card.modifier === '+/-' || card.modifier === '2x') {
      setSelectedSideCard(index);
      setShowModifierChoice(true);
    } else {
      socket.playSideCard(index, '+');
    }
  };

  const handleModifierChoice = (modifier) => {
    socket.playSideCard(selectedSideCard, modifier);
    setSelectedSideCard(null);
    setShowModifierChoice(false);
  };

  const handleStand = () => {
    if (canTakeAction()) {
      socket.stand();
    }
  };

  const canTakeAction = () => {
    return gameState &&
           !gameState.gameOver &&
           gameState.currentPlayer === user.id &&
           !gameState.player.standing &&
           !gameState.player.busted;
  };

  const handleCancelSearch = () => {
    socket.cancelSearch();
    onLeaveGame();
  };

  if (searching) {
    return (
      <div style={styles.container}>
        <div style={styles.searchingCard}>
          <h2 style={styles.title}>Finding Opponent...</h2>
          <p style={styles.message}>{message}</p>
          <div style={styles.spinner}></div>
          <button style={styles.cancelButton} onClick={handleCancelSearch}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div style={styles.container}>
        <div style={styles.searchingCard}>
          <p style={styles.message}>Loading game...</p>
        </div>
      </div>
    );
  }

  const isMyTurn = gameState.currentPlayer === user.id;
  const myScore = gameState.player.score;
  const opponentScore = gameState.opponent.score;

  return (
    <div style={styles.gameContainer}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.scoreBoard}>
          <div style={styles.playerInfo}>
            <div style={styles.playerName}>{matchInfo?.player2?.username || 'Opponent'}</div>
            <div style={styles.score}>{opponentScore}</div>
            <div style={styles.rounds}>Rounds: {gameState.opponent.roundsWon}/3</div>
          </div>
          <div style={styles.roundInfo}>
            Round {gameState.roundNumber}
            <div style={styles.turnIndicator}>
              {isMyTurn ? 'Your Turn' : "Opponent's Turn"}
            </div>
          </div>
          <div style={styles.playerInfo}>
            <div style={styles.playerName}>{user.username} (You)</div>
            <div style={styles.score}>{myScore}</div>
            <div style={styles.rounds}>Rounds: {gameState.player.roundsWon}/3</div>
          </div>
        </div>
      </div>

      {/* Message */}
      <div style={styles.messageBar}>{message}</div>

      {/* Opponent's area */}
      <div style={styles.opponentArea}>
        <div style={styles.deckArea}>
          <div style={styles.deckLabel}>Opponent's Side Deck</div>
          <div style={styles.cardRow}>
            {[...Array(gameState.opponent.sideDeckCount)].map((_, i) => (
              <CardBack key={i} width={80} height={112} />
            ))}
          </div>
        </div>
      </div>

      {/* Player's area */}
      <div style={styles.playerArea}>
        <div style={styles.deckArea}>
          <div style={styles.deckLabel}>Your Side Deck</div>
          <div style={styles.cardRow}>
            {gameState.player.sideDeck.map((card, index) => (
              <div
                key={index}
                onClick={() => handlePlaySideCard(index)}
                style={{
                  ...styles.clickableCard,
                  opacity: canTakeAction() ? 1 : 0.5,
                  cursor: canTakeAction() ? 'pointer' : 'not-allowed'
                }}
              >
                <SideCard value={card.value} modifier={card.modifier} width={80} height={112} />
              </div>
            ))}
            {[...Array(4 - gameState.player.sideDeck.length)].map((_, i) => (
              <EmptySlot key={`empty-${i}`} width={80} height={112} />
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div style={styles.actions}>
          <button
            onClick={handleDrawCard}
            disabled={!canTakeAction()}
            style={{
              ...styles.actionButton,
              opacity: canTakeAction() ? 1 : 0.5
            }}
          >
            Draw Card
          </button>
          <button
            onClick={handleStand}
            disabled={!canTakeAction()}
            style={{
              ...styles.actionButton,
              ...styles.standButton,
              opacity: canTakeAction() ? 1 : 0.5
            }}
          >
            Stand
          </button>
        </div>
      </div>

      {/* Modifier choice modal */}
      {showModifierChoice && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Choose Modifier</h3>
            <div style={styles.modalButtons}>
              {gameState.player.sideDeck[selectedSideCard]?.modifier === '+/-' ? (
                <>
                  <button onClick={() => handleModifierChoice('+')} style={styles.modifierButton}>
                    Add (+)
                  </button>
                  <button onClick={() => handleModifierChoice('-')} style={styles.modifierButton}>
                    Subtract (-)
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => handleModifierChoice('double')} style={styles.modifierButton}>
                    Double (×2)
                  </button>
                  <button onClick={() => handleModifierChoice('half')} style={styles.modifierButton}>
                    Half (÷2)
                  </button>
                </>
              )}
            </div>
            <button onClick={() => setShowModifierChoice(false)} style={styles.cancelModButton}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Leave button */}
      <button onClick={onLeaveGame} style={styles.leaveButton}>
        Leave Game
      </button>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    padding: '20px'
  },
  searchingCard: {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    padding: '40px',
    textAlign: 'center',
    maxWidth: '400px',
    border: '2px solid rgba(255, 215, 0, 0.3)'
  },
  title: {
    fontSize: '28px',
    color: '#ffd700',
    marginBottom: '20px'
  },
  message: {
    fontSize: '16px',
    color: '#b0b0b0',
    marginBottom: '20px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    margin: '0 auto 20px',
    border: '4px solid rgba(255, 215, 0, 0.3)',
    borderTop: '4px solid #ffd700',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  cancelButton: {
    padding: '10px 20px',
    fontSize: '14px',
    borderRadius: '8px',
    border: 'none',
    background: 'rgba(244, 67, 54, 0.3)',
    color: '#ff5252',
    cursor: 'pointer'
  },
  gameContainer: {
    minHeight: '100vh',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column'
  },
  header: {
    marginBottom: '20px'
  },
  scoreBoard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    borderRadius: '15px',
    padding: '20px',
    border: '2px solid rgba(255, 215, 0, 0.3)'
  },
  playerInfo: {
    textAlign: 'center',
    flex: 1
  },
  playerName: {
    fontSize: '16px',
    color: '#ffd700',
    marginBottom: '10px'
  },
  score: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: '5px'
  },
  rounds: {
    fontSize: '14px',
    color: '#b0b0b0'
  },
  roundInfo: {
    textAlign: 'center',
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#ffd700',
    flex: 1
  },
  turnIndicator: {
    fontSize: '14px',
    color: '#b0b0b0',
    marginTop: '5px'
  },
  messageBar: {
    textAlign: 'center',
    padding: '15px',
    background: 'rgba(255, 215, 0, 0.1)',
    borderRadius: '10px',
    color: '#ffd700',
    marginBottom: '20px',
    fontSize: '16px'
  },
  opponentArea: {
    marginBottom: '30px'
  },
  playerArea: {
    marginTop: 'auto'
  },
  deckArea: {
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '15px',
    padding: '20px',
    border: '1px solid rgba(255, 215, 0, 0.2)'
  },
  deckLabel: {
    fontSize: '14px',
    color: '#b0b0b0',
    marginBottom: '15px',
    textTransform: 'uppercase'
  },
  cardRow: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  clickableCard: {
    transition: 'transform 0.2s',
    '&:hover': {
      transform: 'translateY(-5px)'
    }
  },
  actions: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'center',
    marginTop: '20px'
  },
  actionButton: {
    padding: '15px 30px',
    fontSize: '18px',
    fontWeight: 'bold',
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
    color: '#1a1a2e',
    cursor: 'pointer',
    transition: 'transform 0.2s'
  },
  standButton: {
    background: 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)'
  },
  leaveButton: {
    marginTop: '20px',
    padding: '10px',
    fontSize: '14px',
    borderRadius: '8px',
    border: 'none',
    background: 'rgba(244, 67, 54, 0.2)',
    color: '#ff5252',
    cursor: 'pointer',
    alignSelf: 'center'
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  modalContent: {
    background: 'rgba(26, 26, 46, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    padding: '30px',
    border: '2px solid rgba(255, 215, 0, 0.5)',
    textAlign: 'center'
  },
  modalTitle: {
    fontSize: '24px',
    color: '#ffd700',
    marginBottom: '20px'
  },
  modalButtons: {
    display: 'flex',
    gap: '15px',
    marginBottom: '15px'
  },
  modifierButton: {
    padding: '15px 25px',
    fontSize: '16px',
    fontWeight: 'bold',
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
    color: '#1a1a2e',
    cursor: 'pointer'
  },
  cancelModButton: {
    padding: '10px 20px',
    fontSize: '14px',
    borderRadius: '8px',
    border: '1px solid rgba(255, 215, 0, 0.5)',
    background: 'transparent',
    color: '#ffd700',
    cursor: 'pointer'
  }
};
