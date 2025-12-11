import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import DatabaseManager from './database.js';
import { AuthService } from './auth.js';
import { SocketHandler } from './socket-handler.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Initialize services
const db = new DatabaseManager();
const authService = new AuthService(db);
const socketHandler = new SocketHandler(io, db, authService);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Authentication routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await authService.register(username, password);
    res.status(201).json({ success: true, user });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await authService.login(username, password);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(401).json({ success: false, error: error.message });
  }
});

// Protected routes
const requireAuth = authService.requireAuth.bind(authService);

app.get('/api/user/profile', requireAuth, (req, res) => {
  const user = db.getUserById(req.user.userId);
  const stats = db.getPlayerStats(req.user.userId);
  res.json({ user, stats });
});

app.get('/api/user/stats', requireAuth, (req, res) => {
  const stats = db.getPlayerStats(req.user.userId);
  res.json(stats);
});

app.get('/api/user/history', requireAuth, (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const history = db.getMatchHistory(req.user.userId, limit);
  res.json(history);
});

app.get('/api/leaderboard', (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const leaderboard = db.getLeaderboard(limit);
  res.json(leaderboard);
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  socketHandler.handleConnection(socket);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║                                            ║
║         PAZAAK SERVER ONLINE               ║
║                                            ║
║  Server running on port ${PORT}              ║
║  Database: SQLite (pazaak.db)              ║
║  WebSocket: Socket.IO ready                ║
║                                            ║
╚════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  httpServer.close(() => {
    db.close();
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, closing server...');
  httpServer.close(() => {
    db.close();
    console.log('Server closed');
    process.exit(0);
  });
});
