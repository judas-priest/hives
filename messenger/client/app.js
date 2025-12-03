/**
 * Messenger Client Application
 *
 * Main client-side application handling:
 * - WebSocket connection
 * - Chat messaging
 * - E2E encryption
 * - WebRTC for voice/video calls
 * - UI interactions
 */

import * as crypto from '../shared/crypto.js';

// ===== Application State =====
const state = {
  ws: null,
  clientId: null,
  userId: null,
  roomId: null,
  encryptionEnabled: false,
  transferMode: 'server',
  symmetricKey: null,
  peerConnection: null,
  localStream: null,
  currentCall: null,
  users: new Set()
};

// ===== DOM Elements =====
const elements = {
  // Screens
  loginScreen: document.getElementById('login-screen'),
  chatScreen: document.getElementById('chat-screen'),

  // Login form
  loginForm: document.getElementById('login-form'),
  usernameInput: document.getElementById('username'),
  roomIdInput: document.getElementById('room-id'),
  enableEncryption: document.getElementById('enable-encryption'),
  transferModeInputs: document.querySelectorAll('input[name="transfer-mode"]'),

  // Chat elements
  currentUserDisplay: document.getElementById('current-user'),
  currentRoomDisplay: document.getElementById('current-room'),
  roomNameDisplay: document.getElementById('room-name'),
  messagesContainer: document.getElementById('messages-container'),
  messageInput: document.getElementById('message-input'),
  sendBtn: document.getElementById('send-btn'),
  clearChatBtn: document.getElementById('clear-chat-btn'),
  leaveRoomBtn: document.getElementById('leave-room-btn'),

  // Users list
  usersOnline: document.getElementById('users-online'),

  // Settings display
  encryptionStatus: document.getElementById('encryption-status'),
  encryptionIndicator: document.getElementById('encryption-indicator'),
  transferModeDisplay: document.getElementById('transfer-mode-display'),

  // Call elements
  callTarget: document.getElementById('call-target'),
  voiceCallBtn: document.getElementById('voice-call-btn'),
  videoCallBtn: document.getElementById('video-call-btn'),
  endCallBtn: document.getElementById('end-call-btn'),
  acceptCallBtn: document.getElementById('accept-call-btn'),
  rejectCallBtn: document.getElementById('reject-call-btn'),
  callStatus: document.getElementById('call-status'),
  callStatusText: document.getElementById('call-status-text'),
  videoContainer: document.getElementById('video-container'),
  localVideo: document.getElementById('local-video'),
  remoteVideo: document.getElementById('remote-video'),
  remoteAudio: document.getElementById('remote-audio'),

  // Status
  connectionStatus: document.getElementById('connection-status'),
  statusMessage: document.getElementById('status-message')
};

// ===== Initialization =====
function init() {
  setupEventListeners();
  console.log('Messenger client initialized');
}

// ===== Event Listeners =====
function setupEventListeners() {
  // Login form
  elements.loginForm.addEventListener('submit', handleLogin);

  // Chat actions
  elements.sendBtn.addEventListener('click', sendMessage);
  elements.messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
  elements.clearChatBtn.addEventListener('click', clearChat);
  elements.leaveRoomBtn.addEventListener('click', leaveRoom);

  // Call actions
  elements.callTarget.addEventListener('change', updateCallButtons);
  elements.voiceCallBtn.addEventListener('click', () => initiateCall('voice'));
  elements.videoCallBtn.addEventListener('click', () => initiateCall('video'));
  elements.endCallBtn.addEventListener('click', endCall);
  elements.acceptCallBtn.addEventListener('click', acceptCall);
  elements.rejectCallBtn.addEventListener('click', rejectCall);
}

// ===== WebSocket Connection =====
function connectWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}`;

  state.ws = new WebSocket(wsUrl);

  state.ws.onopen = () => {
    console.log('WebSocket connected');
    updateConnectionStatus(true);
  };

  state.ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      handleServerMessage(message);
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  };

  state.ws.onclose = () => {
    console.log('WebSocket disconnected');
    updateConnectionStatus(false);
    showSystemMessage('Disconnected from server');
  };

  state.ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    showSystemMessage('Connection error occurred');
  };
}

// ===== Handle Server Messages =====
function handleServerMessage(message) {
  console.log('Received message:', message.type);

  switch (message.type) {
    case 'connected':
      state.clientId = message.clientId;
      break;

    case 'registered':
      console.log('Registered as:', message.userId);
      break;

    case 'joined-room':
      handleJoinedRoom(message);
      break;

    case 'user-joined':
      handleUserJoined(message);
      break;

    case 'user-left':
      handleUserLeft(message);
      break;

    case 'chat-message':
      handleChatMessage(message);
      break;

    case 'incoming-call':
      handleIncomingCall(message);
      break;

    case 'call-response':
      handleCallResponse(message);
      break;

    case 'call-ended':
      handleCallEnded(message);
      break;

    case 'webrtc-offer':
    case 'webrtc-answer':
    case 'webrtc-ice-candidate':
      handleWebRTCSignaling(message);
      break;

    case 'error':
      showSystemMessage(`Error: ${message.error}`);
      break;

    default:
      console.log('Unknown message type:', message.type);
  }
}

// ===== Login Handler =====
async function handleLogin(e) {
  e.preventDefault();

  const username = elements.usernameInput.value.trim();
  const roomId = elements.roomIdInput.value.trim();
  const encryptionEnabled = elements.enableEncryption.checked;
  const transferMode = document.querySelector('input[name="transfer-mode"]:checked').value;

  if (!username || !roomId) {
    alert('Please enter both username and room ID');
    return;
  }

  // Save state
  state.userId = username;
  state.roomId = roomId;
  state.encryptionEnabled = encryptionEnabled;
  state.transferMode = transferMode;

  // Generate encryption key if enabled
  if (encryptionEnabled) {
    try {
      state.symmetricKey = await crypto.generateSymmetricKey();
      console.log('Encryption key generated');
    } catch (error) {
      console.error('Error generating encryption key:', error);
      alert('Failed to initialize encryption');
      return;
    }
  }

  // Connect to server
  connectWebSocket();

  // Wait for connection then register and join
  const checkConnection = setInterval(() => {
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      clearInterval(checkConnection);

      // Register user
      sendToServer({
        type: 'register',
        userId: username
      });

      // Join room
      sendToServer({
        type: 'join-room',
        roomId: roomId
      });
    }
  }, 100);
}

// ===== Room Handlers =====
function handleJoinedRoom(message) {
  console.log('Joined room:', message.roomId);

  // Update UI
  elements.currentUserDisplay.textContent = state.userId;
  elements.currentRoomDisplay.textContent = state.roomId;
  elements.roomNameDisplay.textContent = state.roomId;
  elements.encryptionStatus.checked = state.encryptionEnabled;
  elements.encryptionIndicator.textContent = state.encryptionEnabled ? '🔒' : '🔓';
  elements.transferModeDisplay.textContent = state.transferMode === 'p2p' ? 'P2P' : 'Server';

  // Update users list
  state.users = new Set(message.users.filter(u => u !== state.userId));
  updateUsersList();
  updateCallTargets();

  // Show chat screen
  elements.loginScreen.classList.remove('active');
  elements.chatScreen.classList.add('active');

  showSystemMessage(`Welcome to room ${state.roomId}!`);
}

function handleUserJoined(message) {
  if (message.userId !== state.userId) {
    state.users.add(message.userId);
    updateUsersList();
    updateCallTargets();
    showSystemMessage(`${message.userId} joined the room`);
  }
}

function handleUserLeft(message) {
  state.users.delete(message.userId);
  updateUsersList();
  updateCallTargets();
  showSystemMessage(`${message.userId} left the room`);
}

function leaveRoom() {
  if (state.ws && state.ws.readyState === WebSocket.OPEN) {
    sendToServer({ type: 'leave-room' });
  }

  // Close connection and reset
  if (state.ws) {
    state.ws.close();
  }

  // Reset state
  state.userId = null;
  state.roomId = null;
  state.users.clear();

  // Clear UI
  clearChat();

  // Show login screen
  elements.chatScreen.classList.remove('active');
  elements.loginScreen.classList.add('active');
}

// ===== Chat Messaging =====
async function sendMessage() {
  const text = elements.messageInput.value.trim();
  if (!text) return;

  let messageData = {
    type: 'chat-message',
    message: text,
    encrypted: false
  };

  // Encrypt if enabled
  if (state.encryptionEnabled && state.symmetricKey) {
    try {
      const encrypted = await crypto.encryptMessage(text, state.symmetricKey);
      messageData.message = encrypted;
      messageData.encrypted = true;
    } catch (error) {
      console.error('Encryption error:', error);
      showSystemMessage('Failed to encrypt message');
      return;
    }
  }

  sendToServer(messageData);
  elements.messageInput.value = '';
}

async function handleChatMessage(message) {
  let displayText = message.message;

  // Decrypt if encrypted
  if (message.encrypted && state.symmetricKey) {
    try {
      displayText = await crypto.decryptMessage(message.message, state.symmetricKey);
    } catch (error) {
      console.error('Decryption error:', error);
      displayText = '[Unable to decrypt message]';
    }
  }

  displayMessage(message.userId, displayText, message.encrypted);
}

function displayMessage(userId, text, encrypted = false) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message';

  if (userId === state.userId) {
    messageDiv.classList.add('own');
  } else {
    messageDiv.classList.add('other');
  }

  const headerDiv = document.createElement('div');
  headerDiv.className = 'message-header';
  headerDiv.textContent = userId === state.userId ? 'You' : userId;

  const textDiv = document.createElement('div');
  textDiv.className = 'message-text';
  textDiv.textContent = text;

  const footerDiv = document.createElement('div');
  footerDiv.className = 'message-footer';
  footerDiv.textContent = new Date().toLocaleTimeString();
  if (encrypted) {
    footerDiv.innerHTML += ' <span>🔒</span>';
  }

  messageDiv.appendChild(headerDiv);
  messageDiv.appendChild(textDiv);
  messageDiv.appendChild(footerDiv);

  elements.messagesContainer.appendChild(messageDiv);
  elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
}

function showSystemMessage(text) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message system';

  const textDiv = document.createElement('div');
  textDiv.className = 'message-text';
  textDiv.textContent = text;

  messageDiv.appendChild(textDiv);

  elements.messagesContainer.appendChild(messageDiv);
  elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
}

function clearChat() {
  elements.messagesContainer.innerHTML = '';
}

// ===== Voice/Video Calls =====
function updateUsersList() {
  elements.usersOnline.innerHTML = '';

  state.users.forEach(userId => {
    const li = document.createElement('li');
    li.textContent = userId;
    elements.usersOnline.appendChild(li);
  });

  if (state.users.size === 0) {
    elements.usersOnline.innerHTML = '<li style="opacity: 0.5;">No other users</li>';
  }
}

function updateCallTargets() {
  elements.callTarget.innerHTML = '<option value="">Select a user...</option>';

  state.users.forEach(userId => {
    const option = document.createElement('option');
    option.value = userId;
    option.textContent = userId;
    elements.callTarget.appendChild(option);
  });
}

function updateCallButtons() {
  const hasTarget = elements.callTarget.value !== '';
  elements.voiceCallBtn.disabled = !hasTarget;
  elements.videoCallBtn.disabled = !hasTarget;
}

async function initiateCall(callType) {
  const targetUserId = elements.callTarget.value;
  if (!targetUserId) return;

  state.currentCall = {
    targetUserId,
    callType,
    isInitiator: true
  };

  updateCallStatus(`Calling ${targetUserId}...`);

  // Send call request
  sendToServer({
    type: 'call-user',
    targetUserId,
    callType
  });

  // Initialize WebRTC for P2P mode
  if (state.transferMode === 'p2p') {
    await setupWebRTC(callType === 'video');
  }
}

function handleIncomingCall(message) {
  state.currentCall = {
    targetUserId: message.fromUserId,
    callType: message.callType,
    isInitiator: false
  };

  updateCallStatus(`Incoming ${message.callType} call from ${message.fromUserId}`);
  elements.acceptCallBtn.classList.remove('hidden');
  elements.rejectCallBtn.classList.remove('hidden');
}

async function acceptCall() {
  if (!state.currentCall) return;

  elements.acceptCallBtn.classList.add('hidden');
  elements.rejectCallBtn.classList.add('hidden');

  // Send acceptance
  sendToServer({
    type: 'call-response',
    targetUserId: state.currentCall.targetUserId,
    accepted: true
  });

  updateCallStatus(`In call with ${state.currentCall.targetUserId}`);
  elements.endCallBtn.classList.remove('hidden');

  // Initialize WebRTC for P2P mode
  if (state.transferMode === 'p2p') {
    await setupWebRTC(state.currentCall.callType === 'video');
  }
}

function rejectCall() {
  if (!state.currentCall) return;

  sendToServer({
    type: 'call-response',
    targetUserId: state.currentCall.targetUserId,
    accepted: false
  });

  elements.acceptCallBtn.classList.add('hidden');
  elements.rejectCallBtn.classList.add('hidden');
  updateCallStatus('Call rejected');

  state.currentCall = null;
}

function handleCallResponse(message) {
  if (!message.accepted) {
    updateCallStatus('Call was rejected');
    state.currentCall = null;
    return;
  }

  updateCallStatus(`In call with ${message.fromUserId}`);
  elements.endCallBtn.classList.remove('hidden');
}

function endCall() {
  if (!state.currentCall) return;

  sendToServer({
    type: 'end-call',
    targetUserId: state.currentCall.targetUserId
  });

  cleanupCall();
}

function handleCallEnded(message) {
  updateCallStatus('Call ended');
  cleanupCall();
}

function cleanupCall() {
  // Stop local stream
  if (state.localStream) {
    state.localStream.getTracks().forEach(track => track.stop());
    state.localStream = null;
  }

  // Close peer connection
  if (state.peerConnection) {
    state.peerConnection.close();
    state.peerConnection = null;
  }

  // Reset UI
  elements.endCallBtn.classList.add('hidden');
  elements.acceptCallBtn.classList.add('hidden');
  elements.rejectCallBtn.classList.add('hidden');
  elements.videoContainer.classList.add('hidden');
  elements.localVideo.srcObject = null;
  elements.remoteVideo.srcObject = null;

  state.currentCall = null;
  updateCallStatus('No active call');
}

// ===== WebRTC Setup =====
async function setupWebRTC(includeVideo) {
  try {
    // Get user media
    state.localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: includeVideo
    });

    // Show local video if enabled
    if (includeVideo) {
      elements.localVideo.srcObject = state.localStream;
      elements.videoContainer.classList.remove('hidden');
    }

    // Create peer connection
    state.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    });

    // Add local stream tracks
    state.localStream.getTracks().forEach(track => {
      state.peerConnection.addTrack(track, state.localStream);
    });

    // Handle remote stream
    state.peerConnection.ontrack = (event) => {
      console.log('Received remote track');
      if (includeVideo) {
        elements.remoteVideo.srcObject = event.streams[0];
      } else {
        elements.remoteAudio.srcObject = event.streams[0];
      }
    };

    // Handle ICE candidates
    state.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        sendToServer({
          type: 'webrtc-ice-candidate',
          targetUserId: state.currentCall.targetUserId,
          data: event.candidate
        });
      }
    };

    // Create and send offer if initiator
    if (state.currentCall.isInitiator) {
      const offer = await state.peerConnection.createOffer();
      await state.peerConnection.setLocalDescription(offer);

      sendToServer({
        type: 'webrtc-offer',
        targetUserId: state.currentCall.targetUserId,
        data: offer
      });
    }
  } catch (error) {
    console.error('Error setting up WebRTC:', error);
    showSystemMessage('Failed to access camera/microphone');
    cleanupCall();
  }
}

async function handleWebRTCSignaling(message) {
  if (!state.peerConnection) {
    await setupWebRTC(state.currentCall.callType === 'video');
  }

  try {
    switch (message.type) {
      case 'webrtc-offer':
        await state.peerConnection.setRemoteDescription(message.data);
        const answer = await state.peerConnection.createAnswer();
        await state.peerConnection.setLocalDescription(answer);

        sendToServer({
          type: 'webrtc-answer',
          targetUserId: message.fromUserId,
          data: answer
        });
        break;

      case 'webrtc-answer':
        await state.peerConnection.setRemoteDescription(message.data);
        break;

      case 'webrtc-ice-candidate':
        await state.peerConnection.addIceCandidate(message.data);
        break;
    }
  } catch (error) {
    console.error('Error handling WebRTC signaling:', error);
  }
}

// ===== UI Updates =====
function updateConnectionStatus(connected) {
  if (connected) {
    elements.connectionStatus.textContent = 'Connected';
    elements.connectionStatus.classList.remove('disconnected');
    elements.connectionStatus.classList.add('connected');
    elements.statusMessage.textContent = 'Connected to server';
  } else {
    elements.connectionStatus.textContent = 'Disconnected';
    elements.connectionStatus.classList.remove('connected');
    elements.connectionStatus.classList.add('disconnected');
    elements.statusMessage.textContent = 'Not connected to server';
  }
}

function updateCallStatus(message) {
  elements.callStatusText.textContent = message;
  elements.callStatus.classList.remove('hidden');
}

// ===== Helper Functions =====
function sendToServer(message) {
  if (state.ws && state.ws.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify(message));
  } else {
    console.error('WebSocket not connected');
  }
}

// ===== Start Application =====
init();
