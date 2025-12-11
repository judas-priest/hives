import React, { useState, useEffect } from 'react';
import api from '../services/api';
import socket from '../services/socket';

export default function Menu({ user, onLogout, onFindMatch }) {
  const [stats, setStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [view, setView] = useState('menu'); // menu, stats, leaderboard

  useEffect(() => {
    loadStats();
    loadLeaderboard();
  }, []);

  const loadStats = async () => {
    try {
      const data = await api.getStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const data = await api.getLeaderboard();
      setLeaderboard(data);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
    }
  };

  const renderMenu = () => (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>PAZAAK</h1>
        <p style={styles.welcome}>Welcome, {user.username}!</p>

        <div style={styles.buttonGroup}>
          <button style={styles.primaryButton} onClick={onFindMatch}>
            Find Match
          </button>
          <button style={styles.secondaryButton} onClick={() => setView('stats')}>
            My Statistics
          </button>
          <button style={styles.secondaryButton} onClick={() => setView('leaderboard')}>
            Leaderboard
          </button>
          <button style={styles.logoutButton} onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>
    </div>
  );

  const renderStats = () => (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.subtitle}>My Statistics</h2>

        {stats && (
          <div style={styles.statsGrid}>
            <div style={styles.statBox}>
              <div style={styles.statLabel}>Matches Played</div>
              <div style={styles.statValue}>{stats.matches_played}</div>
            </div>
            <div style={styles.statBox}>
              <div style={styles.statLabel}>Matches Won</div>
              <div style={styles.statValue}>{stats.matches_won}</div>
            </div>
            <div style={styles.statBox}>
              <div style={styles.statLabel}>Matches Lost</div>
              <div style={styles.statValue}>{stats.matches_lost}</div>
            </div>
            <div style={styles.statBox}>
              <div style={styles.statLabel}>Win Rate</div>
              <div style={styles.statValue}>
                {stats.matches_played > 0
                  ? `${((stats.matches_won / stats.matches_played) * 100).toFixed(1)}%`
                  : '0%'}
              </div>
            </div>
            <div style={styles.statBox}>
              <div style={styles.statLabel}>Rounds Won</div>
              <div style={styles.statValue}>{stats.rounds_won}</div>
            </div>
            <div style={styles.statBox}>
              <div style={styles.statLabel}>Rounds Lost</div>
              <div style={styles.statValue}>{stats.rounds_lost}</div>
            </div>
          </div>
        )}

        <button style={styles.secondaryButton} onClick={() => setView('menu')}>
          Back to Menu
        </button>
      </div>
    </div>
  );

  const renderLeaderboard = () => (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.subtitle}>Leaderboard</h2>

        <div style={styles.leaderboardList}>
          {leaderboard.map((player, index) => (
            <div key={index} style={styles.leaderboardItem}>
              <span style={styles.rank}>#{index + 1}</span>
              <span style={styles.playerName}>{player.username}</span>
              <span style={styles.playerStats}>
                {player.matches_won}W / {player.matches_lost}L ({player.win_rate}%)
              </span>
            </div>
          ))}
        </div>

        <button style={styles.secondaryButton} onClick={() => setView('menu')}>
          Back to Menu
        </button>
      </div>
    </div>
  );

  if (view === 'stats') return renderStats();
  if (view === 'leaderboard') return renderLeaderboard();
  return renderMenu();
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    padding: '20px'
  },
  card: {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    padding: '40px',
    maxWidth: '600px',
    width: '100%',
    border: '2px solid rgba(255, 215, 0, 0.3)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
  },
  title: {
    fontSize: '48px',
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#ffd700',
    marginBottom: '10px',
    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)'
  },
  subtitle: {
    fontSize: '28px',
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#ffd700',
    marginBottom: '20px'
  },
  welcome: {
    textAlign: 'center',
    color: '#b0b0b0',
    marginBottom: '30px',
    fontSize: '16px'
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  primaryButton: {
    padding: '15px',
    fontSize: '18px',
    fontWeight: 'bold',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
    color: '#1a1a2e',
    cursor: 'pointer',
    transition: 'transform 0.2s'
  },
  secondaryButton: {
    padding: '12px',
    fontSize: '16px',
    fontWeight: 'bold',
    borderRadius: '8px',
    border: '2px solid rgba(255, 215, 0, 0.5)',
    background: 'rgba(255, 215, 0, 0.1)',
    color: '#ffd700',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  logoutButton: {
    padding: '10px',
    fontSize: '14px',
    borderRadius: '8px',
    border: 'none',
    background: 'rgba(244, 67, 54, 0.2)',
    color: '#ff5252',
    cursor: 'pointer',
    marginTop: '10px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '15px',
    marginBottom: '30px'
  },
  statBox: {
    background: 'rgba(255, 255, 255, 0.05)',
    padding: '20px',
    borderRadius: '10px',
    textAlign: 'center',
    border: '1px solid rgba(255, 215, 0, 0.2)'
  },
  statLabel: {
    fontSize: '12px',
    color: '#b0b0b0',
    marginBottom: '8px',
    textTransform: 'uppercase'
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#ffd700'
  },
  leaderboardList: {
    marginBottom: '20px'
  },
  leaderboardItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px',
    marginBottom: '10px',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
    border: '1px solid rgba(255, 215, 0, 0.2)'
  },
  rank: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#ffd700',
    minWidth: '40px'
  },
  playerName: {
    fontSize: '16px',
    color: '#e0e0e0',
    flex: 1
  },
  playerStats: {
    fontSize: '14px',
    color: '#b0b0b0'
  }
};
