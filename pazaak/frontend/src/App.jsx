import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import Menu from './components/Menu';
import Game from './components/Game';
import socket from './services/socket';
import api from './services/api';

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('auth'); // auth, menu, game

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('pazaak_token');
    if (token) {
      api.setToken(token);
      loadUserProfile(token);
    }
  }, []);

  const loadUserProfile = async (token) => {
    try {
      const data = await api.getProfile();
      setUser(data.user);
      socket.connect(token);
      setView('menu');
    } catch (err) {
      console.error('Failed to load profile:', err);
      handleLogout();
    }
  };

  const handleLogin = (userData, token) => {
    setUser(userData);
    socket.connect(token);
    setView('menu');
  };

  const handleLogout = () => {
    api.clearToken();
    socket.disconnect();
    setUser(null);
    setView('auth');
  };

  const handleFindMatch = () => {
    setView('game');
  };

  const handleLeaveGame = () => {
    setView('menu');
  };

  return (
    <div className="App">
      {view === 'auth' && <Auth onLogin={handleLogin} />}
      {view === 'menu' && (
        <Menu user={user} onLogout={handleLogout} onFindMatch={handleFindMatch} />
      )}
      {view === 'game' && <Game user={user} onLeaveGame={handleLeaveGame} />}
    </div>
  );
}

export default App;
