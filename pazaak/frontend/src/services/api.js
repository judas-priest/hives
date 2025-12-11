const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('pazaak_token');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('pazaak_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('pazaak_token');
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  }

  async register(username, password) {
    const data = await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });

    return data;
  }

  async login(username, password) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });

    if (data.token) {
      this.setToken(data.token);
    }

    return data;
  }

  async getProfile() {
    return this.request('/api/user/profile');
  }

  async getStats() {
    return this.request('/api/user/stats');
  }

  async getHistory(limit = 10) {
    return this.request(`/api/user/history?limit=${limit}`);
  }

  async getLeaderboard(limit = 10) {
    return this.request(`/api/leaderboard?limit=${limit}`);
  }
}

export default new ApiService();
