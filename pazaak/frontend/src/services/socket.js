import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect(token) {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(SOCKET_URL);

    this.socket.on('connect', () => {
      console.log('Socket connected');
      if (token) {
        this.socket.emit('authenticate', token);
      }
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    // Forward all events to registered listeners
    this.socket.onAny((event, ...args) => {
      const callbacks = this.listeners.get(event) || [];
      callbacks.forEach(callback => callback(...args));
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;

    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  emit(event, data) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  // Game-specific methods
  findMatch() {
    this.emit('find_match');
  }

  cancelSearch() {
    this.emit('cancel_search');
  }

  drawCard() {
    this.emit('draw_card');
  }

  playSideCard(cardIndex, modifier) {
    this.emit('play_side_card', { cardIndex, modifier });
  }

  stand() {
    this.emit('stand');
  }

  getState() {
    this.emit('get_state');
  }

  getStats() {
    this.emit('get_stats');
  }

  getLeaderboard() {
    this.emit('get_leaderboard');
  }
}

export default new SocketService();
