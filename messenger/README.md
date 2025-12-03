# 🐝 Hives Messenger

A modern, fullstack messenger application with end-to-end encryption, voice/video calls, and peer-to-peer support.

[![License](https://img.shields.io/badge/license-Unlicense-blue.svg)](../LICENSE)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org)

## ✨ Features

### 🔒 Security
- **End-to-End Encryption** - Messages encrypted with AES-GCM 256-bit
- **Secure Key Exchange** - RSA-OAEP 2048-bit for key distribution
- **Client-Side Encryption** - All encryption happens in the browser
- **Optional Encryption** - Choose to enable/disable per session

### 💬 Messaging
- **Real-Time Chat** - WebSocket-based instant messaging
- **Room-Based** - Multiple chat rooms support
- **User Presence** - See who's online in your room
- **Message History** - Full conversation history in session

### 📞 Voice & Video Calls
- **Voice Calls** - High-quality audio communication
- **Video Calls** - HD video conferencing
- **WebRTC Technology** - Peer-to-peer when possible
- **STUN/TURN Support** - Works behind NAT and firewalls

### 🔄 Transfer Modes
- **Server-Based** - All messages routed through server (always works)
- **Peer-to-Peer** - Direct browser-to-browser connection (lower latency)
- **Automatic Fallback** - Seamlessly switches based on network conditions

### 🎨 Modern UI
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Dark Theme** - Easy on the eyes
- **Clean Interface** - Intuitive and user-friendly
- **Visual Indicators** - Clear status for encryption, calls, and connections

## 🏗️ Architecture

```
messenger/
├── server/
│   └── index.js          # WebSocket server + HTTP server
├── client/
│   ├── index.html        # Main HTML page
│   ├── styles.css        # CSS styling
│   └── app.js            # Client application logic
├── shared/
│   └── crypto.js         # Encryption module (shared)
├── tests/
│   └── test-encryption.js # Encryption test suite
├── package.json          # Dependencies and scripts
└── README.md             # This file
```

### Technology Stack

**Backend:**
- Node.js 18+
- Express - HTTP server
- WebSocket (ws) - Real-time communication

**Frontend:**
- Vanilla JavaScript (ES6 modules)
- Web Crypto API - Encryption
- WebRTC - Voice/video calls
- Modern CSS - Responsive design

**No frameworks, no build step, no complexity!**

## 🚀 Quick Start

### Prerequisites

- Node.js version 18 or higher
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

```bash
# Navigate to messenger directory
cd messenger

# Install dependencies
npm install

# Start the server
npm start
```

The server will start on `http://localhost:3000`

### Usage

1. **Open your browser** and navigate to `http://localhost:3000`

2. **Enter your details:**
   - Choose a username
   - Enter a room ID (same ID = same room)
   - Enable/disable encryption
   - Choose transfer mode (server or P2P)

3. **Start chatting!**
   - Type messages and press Enter or click Send
   - See other users in the sidebar
   - Make voice/video calls from the call panel

### Opening Multiple Clients

To test with multiple users:

1. Open multiple browser windows/tabs
2. Use different usernames
3. Use the **same room ID** to join the same room
4. Start chatting and calling!

**Tip:** Use incognito/private windows for separate sessions.

## 📖 User Guide

### Chat Features

**Sending Messages:**
- Type in the message input box
- Press Enter or click Send button
- Messages are encrypted automatically if enabled

**Encryption Indicator:**
- 🔒 = Message is encrypted
- Messages without the lock icon are not encrypted

**System Messages:**
- Yellow background = system notification
- Shows when users join/leave

### Making Calls

**Voice Calls:**
1. Select a user from the dropdown
2. Click "Voice Call" button
3. Wait for the other user to accept
4. Speak into your microphone
5. Click "End Call" when finished

**Video Calls:**
1. Select a user from the dropdown
2. Click "Video Call" button
3. Allow camera/microphone access
4. Wait for the other user to accept
5. Your video appears on the left, theirs on the right
6. Click "End Call" when finished

**Call Status:**
- "Calling..." = waiting for response
- "Incoming call" = someone is calling you
- "In call" = active call in progress

### Settings

**Encryption:**
- Set during login
- Cannot be changed mid-session
- All users in room should use same setting

**Transfer Mode:**
- **Server:** All traffic through server (reliable)
- **P2P:** Direct browser connection (faster, requires WebRTC support)

## 🔧 Configuration

### Environment Variables

```bash
# Server port (default: 3000)
PORT=3000
```

### Server Configuration

Edit `server/index.js` to customize:

```javascript
const PORT = process.env.PORT || 3000;
```

### WebRTC Configuration

Edit `client/app.js` to add TURN servers:

```javascript
state.peerConnection = new RTCPeerConnection({
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    // Add your TURN server here if needed
    {
      urls: 'turn:your-turn-server.com',
      username: 'user',
      credential: 'pass'
    }
  ]
});
```

## 🧪 Testing

### Run Encryption Tests

```bash
node tests/test-encryption.js
```

This tests:
- Key generation (symmetric and asymmetric)
- Message encryption/decryption
- Key export/import
- Unicode and special characters
- Long message handling

### Manual Testing

1. **Single User:**
   - Open messenger, join a room
   - Send messages to yourself
   - Verify encryption indicators

2. **Two Users:**
   - Open two browser windows
   - Join same room with different usernames
   - Exchange messages
   - Test voice/video calls

3. **Multiple Users:**
   - Open 3+ browser windows
   - Test room presence
   - Test call handling with multiple users

## 🔐 Security Considerations

### Encryption

- **AES-GCM 256-bit** provides strong encryption
- **RSA-OAEP 2048-bit** for secure key exchange
- **Random IVs** generated for each message
- **Client-side only** - server never sees plaintext

### Limitations

- Keys are generated per session (not persistent)
- No key verification mechanism
- No perfect forward secrecy
- Encryption optional (can be disabled)

**For production use, consider:**
- Persistent key storage
- Key fingerprint verification
- Signal Protocol or similar
- Mandatory encryption

## 📊 Features Matrix

| Feature | Status | Mode | Notes |
|---------|--------|------|-------|
| Text Messaging | ✅ | Both | Real-time |
| E2E Encryption | ✅ | Both | Optional |
| Voice Calls | ✅ | P2P | WebRTC |
| Video Calls | ✅ | P2P | WebRTC |
| File Sharing | ❌ | - | Future |
| Message History | ✅ | Session | Not persistent |
| User Authentication | ❌ | - | Future |
| Multiple Rooms | ✅ | Both | Switch by re-login |

## 🐛 Troubleshooting

### Connection Issues

**Problem:** "Disconnected from server"
- Check if server is running (`npm start`)
- Verify correct URL (`http://localhost:3000`)
- Check firewall settings

**Problem:** WebSocket connection fails
- Try using `ws://localhost:3000` explicitly
- Check browser console for errors
- Ensure no proxy blocking WebSocket

### Call Issues

**Problem:** "Failed to access camera/microphone"
- Grant browser permissions for camera/mic
- Check device settings
- Try a different browser

**Problem:** Calls don't connect (P2P mode)
- Try server-based mode instead
- Check NAT/firewall settings
- Add TURN server configuration

**Problem:** No video/audio in call
- Check device is not muted
- Verify correct input device selected
- Test devices in browser settings

### Encryption Issues

**Problem:** "Unable to decrypt message"
- Ensure both users have encryption enabled
- Verify same encryption key (same session)
- Try disabling/re-enabling encryption

## 🤝 Contributing

This project is part of the Hives ecosystem. Contributions welcome!

### Development

```bash
# Clone repository
git clone https://github.com/judas-priest/hives.git
cd hives/messenger

# Install dependencies
npm install

# Start development server
npm run dev
```

### Project Structure

- `server/` - Backend WebSocket server
- `client/` - Frontend web application
- `shared/` - Shared code (encryption)
- `tests/` - Test suites

## 📄 License

This project is released into the public domain under the [Unlicense](../LICENSE).

## 🙏 Acknowledgments

- Built with modern web standards
- Uses Web Crypto API for encryption
- Uses WebRTC for P2P communication
- Part of the Hives ecosystem

## 📞 Support

- **Issues:** [GitHub Issues](https://github.com/judas-priest/hives/issues)
- **Documentation:** This README
- **Examples:** See Quick Start section

---

**Made with ❤️ by the Hives community**

🐝 Happy messaging!
