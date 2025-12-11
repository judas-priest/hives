# Pazaak - Setup Instructions

## Prerequisites

- Node.js 18 or higher
- npm (comes with Node.js)

## Quick Start

### 1. Backend Setup

```bash
# Navigate to backend directory
cd pazaak/backend

# Install dependencies (this will compile native modules like better-sqlite3)
npm install

# Create .env file (optional, uses defaults if not present)
cp .env.example .env

# Start the server
npm start
```

The backend server will start on `http://localhost:3000`

**Important:** The `npm install` step is required as it compiles native modules like `better-sqlite3`. Without this step, you'll see binding errors when starting the server.

### 2. Frontend Setup

In a new terminal:

```bash
# Navigate to frontend directory
cd pazaak/frontend

# Install dependencies
npm install

# Create .env file (optional)
cp .env.example .env

# Start the development server
npm run dev
```

The frontend will start on `http://localhost:5173`

### 3. Play the Game!

1. Open your browser to `http://localhost:5173`
2. Register a new account
3. Click "Find Match" to start searching for an opponent
4. Open another browser window/tab (or incognito mode)
5. Register another account and click "Find Match"
6. Both players will be matched and the game begins!

## Game Rules

### Objective
Be the first player to win 3 rounds.

### How to Play
1. **Drawing Cards**: Each turn, draw a card from the main deck (values 1-10)
2. **Side Cards**: You can play cards from your side deck to modify your score
3. **Standing**: When you're satisfied with your score, click "Stand"
4. **Winning a Round**: Get closer to 20 than your opponent without going over
5. **Busting**: If your score goes over 20, you lose the round

### Side Card Types
- **+X**: Adds X to your score
- **-X**: Subtracts X from your score
- **+/-X**: Choose to add or subtract X
- **2×**: Choose to double or halve your current score

## Development

### Running Tests

Backend tests:
```bash
cd pazaak/backend
npm test
```

### Building for Production

Frontend:
```bash
cd pazaak/frontend
npm run build
```

Backend (no build needed, it's already using ES modules):
```bash
cd pazaak/backend
NODE_ENV=production npm start
```

## Configuration

### Backend (.env)
```
PORT=3000
JWT_SECRET=your-secret-key-here
FRONTEND_URL=http://localhost:5173
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

## Troubleshooting

### better-sqlite3 Native Binding Error

If you encounter an error like "Could not locate the bindings file" for `better-sqlite3`, this means the native module needs to be compiled. This is a common issue and can be fixed:

**Solution:**
```bash
cd pazaak/backend
npm install
```

The `npm install` command will automatically compile the native bindings for your system.

**Note:** `better-sqlite3` requires compilation tools on your system:
- **Linux**: Usually pre-installed. If not, install `build-essential` and `python3`
- **macOS**: Requires Xcode Command Line Tools (`xcode-select --install`)
- **Windows**: Requires Windows Build Tools (`npm install --global windows-build-tools`)

### Database Issues
If you encounter database errors, delete the database file:
```bash
rm pazaak/backend/database/pazaak.db
```
The database will be recreated on next server start.

### Port Conflicts
If ports 3000 or 5173 are already in use:
- Backend: Change `PORT` in `.env`
- Frontend: Change port in `vite.config.js`

### Connection Issues
Make sure both backend and frontend are running and the URLs in `.env` files are correct.

## Features

- User registration and authentication with JWT
- Real-time multiplayer via WebSocket (Socket.IO)
- SQLite database for user data and statistics
- Player statistics tracking
- Leaderboard system
- Match history
- Custom SVG card graphics
- Responsive React UI

## Technology Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool
- **Socket.IO Client** - WebSocket communication
- **Custom SVG** - Card graphics

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **Socket.IO** - Real-time communication
- **better-sqlite3** - Database
- **bcrypt** - Password hashing
- **jsonwebtoken** - Authentication
- **CORS** - Cross-origin support

## License

This project is released under the Unlicense (public domain).
