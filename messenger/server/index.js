#!/usr/bin/env node

/**
 * Messenger Server
 *
 * Main server file that provides both HTTP server for static files
 * and WebSocket server for real-time messaging and signaling.
 */

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 3000;

// Express app setup
const app = express();
const server = createServer(app);

// Serve static files from client directory
app.use(express.static(join(__dirname, '..', 'client')));

// WebSocket server for real-time communication
const wss = new WebSocketServer({ server });

// Store connected clients
const clients = new Map();
const rooms = new Map();

wss.on('connection', (ws, req) => {
  const clientId = generateId();
  clients.set(clientId, { ws, userId: null, roomId: null });

  console.log(`[Server] Client connected: ${clientId}`);

  // Send initial connection confirmation
  ws.send(JSON.stringify({
    type: 'connected',
    clientId,
    timestamp: Date.now()
  }));

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      handleMessage(clientId, message);
    } catch (error) {
      console.error('[Server] Error parsing message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        error: 'Invalid message format'
      }));
    }
  });

  ws.on('close', () => {
    console.log(`[Server] Client disconnected: ${clientId}`);
    const client = clients.get(clientId);
    if (client && client.roomId) {
      leaveRoom(clientId, client.roomId);
    }
    clients.delete(clientId);
  });

  ws.on('error', (error) => {
    console.error(`[Server] WebSocket error for ${clientId}:`, error);
  });
});

/**
 * Handle incoming messages from clients
 */
function handleMessage(clientId, message) {
  const client = clients.get(clientId);
  if (!client) return;

  console.log(`[Server] Message from ${clientId}:`, message.type);

  switch (message.type) {
    case 'register':
      handleRegister(clientId, message.userId);
      break;

    case 'join-room':
      handleJoinRoom(clientId, message.roomId);
      break;

    case 'leave-room':
      handleLeaveRoom(clientId);
      break;

    case 'chat-message':
      handleChatMessage(clientId, message);
      break;

    case 'webrtc-offer':
    case 'webrtc-answer':
    case 'webrtc-ice-candidate':
      handleWebRTCSignaling(clientId, message);
      break;

    case 'call-user':
      handleCallUser(clientId, message);
      break;

    case 'call-response':
      handleCallResponse(clientId, message);
      break;

    case 'end-call':
      handleEndCall(clientId, message);
      break;

    default:
      console.log(`[Server] Unknown message type: ${message.type}`);
  }
}

/**
 * Register a user with a userId
 */
function handleRegister(clientId, userId) {
  const client = clients.get(clientId);
  if (client) {
    client.userId = userId;
    client.ws.send(JSON.stringify({
      type: 'registered',
      userId,
      timestamp: Date.now()
    }));
    console.log(`[Server] User registered: ${userId} (${clientId})`);
  }
}

/**
 * Handle joining a chat room
 */
function handleJoinRoom(clientId, roomId) {
  const client = clients.get(clientId);
  if (!client || !client.userId) {
    client.ws.send(JSON.stringify({
      type: 'error',
      error: 'Must register before joining room'
    }));
    return;
  }

  // Leave current room if in one
  if (client.roomId) {
    leaveRoom(clientId, client.roomId);
  }

  // Join new room
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }

  rooms.get(roomId).add(clientId);
  client.roomId = roomId;

  // Get list of users in room
  const usersInRoom = Array.from(rooms.get(roomId))
    .map(cId => clients.get(cId)?.userId)
    .filter(Boolean);

  // Notify user of successful join
  client.ws.send(JSON.stringify({
    type: 'joined-room',
    roomId,
    users: usersInRoom,
    timestamp: Date.now()
  }));

  // Notify others in room
  broadcastToRoom(roomId, {
    type: 'user-joined',
    userId: client.userId,
    timestamp: Date.now()
  }, clientId);

  console.log(`[Server] User ${client.userId} joined room: ${roomId}`);
}

/**
 * Handle leaving a chat room
 */
function handleLeaveRoom(clientId) {
  const client = clients.get(clientId);
  if (client && client.roomId) {
    leaveRoom(clientId, client.roomId);
  }
}

/**
 * Leave a room (internal helper)
 */
function leaveRoom(clientId, roomId) {
  const client = clients.get(clientId);
  const room = rooms.get(roomId);

  if (room) {
    room.delete(clientId);

    // Notify others
    if (client && client.userId) {
      broadcastToRoom(roomId, {
        type: 'user-left',
        userId: client.userId,
        timestamp: Date.now()
      });
    }

    // Clean up empty rooms
    if (room.size === 0) {
      rooms.delete(roomId);
    }
  }

  if (client) {
    client.roomId = null;
  }
}

/**
 * Handle chat messages
 */
function handleChatMessage(clientId, message) {
  const client = clients.get(clientId);
  if (!client || !client.roomId) {
    client.ws.send(JSON.stringify({
      type: 'error',
      error: 'Must be in a room to send messages'
    }));
    return;
  }

  // Broadcast message to room (including sender for confirmation)
  broadcastToRoom(client.roomId, {
    type: 'chat-message',
    userId: client.userId,
    message: message.message,
    encrypted: message.encrypted,
    timestamp: Date.now()
  });
}

/**
 * Handle WebRTC signaling for P2P connections
 */
function handleWebRTCSignaling(clientId, message) {
  const client = clients.get(clientId);
  if (!client || !client.roomId) return;

  const targetClient = findClientByUserId(message.targetUserId);
  if (!targetClient) {
    client.ws.send(JSON.stringify({
      type: 'error',
      error: 'Target user not found'
    }));
    return;
  }

  // Forward signaling message to target
  targetClient.ws.send(JSON.stringify({
    type: message.type,
    fromUserId: client.userId,
    data: message.data,
    timestamp: Date.now()
  }));
}

/**
 * Handle initiating a call
 */
function handleCallUser(clientId, message) {
  const client = clients.get(clientId);
  if (!client || !client.userId) return;

  const targetClient = findClientByUserId(message.targetUserId);
  if (!targetClient) {
    client.ws.send(JSON.stringify({
      type: 'error',
      error: 'Target user not found'
    }));
    return;
  }

  // Forward call request to target
  targetClient.ws.send(JSON.stringify({
    type: 'incoming-call',
    fromUserId: client.userId,
    callType: message.callType, // 'voice' or 'video'
    timestamp: Date.now()
  }));

  console.log(`[Server] Call from ${client.userId} to ${message.targetUserId}`);
}

/**
 * Handle call response (accept/reject)
 */
function handleCallResponse(clientId, message) {
  const client = clients.get(clientId);
  if (!client || !client.userId) return;

  const targetClient = findClientByUserId(message.targetUserId);
  if (!targetClient) return;

  // Forward response to caller
  targetClient.ws.send(JSON.stringify({
    type: 'call-response',
    fromUserId: client.userId,
    accepted: message.accepted,
    timestamp: Date.now()
  }));

  console.log(`[Server] Call response from ${client.userId}: ${message.accepted ? 'accepted' : 'rejected'}`);
}

/**
 * Handle ending a call
 */
function handleEndCall(clientId, message) {
  const client = clients.get(clientId);
  if (!client || !client.userId) return;

  const targetClient = findClientByUserId(message.targetUserId);
  if (!targetClient) return;

  // Notify other party
  targetClient.ws.send(JSON.stringify({
    type: 'call-ended',
    fromUserId: client.userId,
    timestamp: Date.now()
  }));

  console.log(`[Server] Call ended by ${client.userId}`);
}

/**
 * Helper: Broadcast message to all users in a room
 */
function broadcastToRoom(roomId, message, excludeClientId = null) {
  const room = rooms.get(roomId);
  if (!room) return;

  const messageStr = JSON.stringify(message);

  room.forEach(cId => {
    if (cId !== excludeClientId) {
      const client = clients.get(cId);
      if (client && client.ws.readyState === 1) { // OPEN
        client.ws.send(messageStr);
      }
    }
  });
}

/**
 * Helper: Find client by userId
 */
function findClientByUserId(userId) {
  for (const [clientId, client] of clients.entries()) {
    if (client.userId === userId) {
      return client;
    }
  }
  return null;
}

/**
 * Helper: Generate unique ID
 */
function generateId() {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}

// Start server
server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════╗
║                                                   ║
║           🚀  MESSENGER SERVER STARTED           ║
║                                                   ║
║  Server running on: http://localhost:${PORT}       ║
║                                                   ║
║  Features:                                        ║
║  ✅ WebSocket real-time messaging                ║
║  ✅ WebRTC signaling for P2P calls               ║
║  ✅ Room-based chat                               ║
║  ✅ Voice and video call support                 ║
║  ✅ End-to-end encryption ready                  ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
  `);
});
