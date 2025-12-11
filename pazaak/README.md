# Pazaak - Star Wars Card Game

A full-stack web implementation of the Pazaak card game from Star Wars: Knights of the Old Republic.

## Game Rules

Pazaak is a card game similar to Blackjack:
- Goal: Get as close to 20 as possible without going over
- Each player has a main deck (cards 1-10) and a side deck (special cards with +/- values)
- Players take turns drawing from the main deck
- After each draw, players can choose to play a card from their side deck or stand
- First player to win 3 rounds wins the match

## Tech Stack

### Frontend
- **React** - Modern reactive framework
- **Vite** - Fast build tool
- **SVG** - Custom-drawn card graphics

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **Socket.IO** - Real-time multiplayer
- **SQLite** - User data and statistics storage
- **bcrypt** - Password hashing

## Project Structure

```
pazaak/
├── backend/
│   ├── src/
│   │   ├── index.js           # Entry point
│   │   ├── auth.js            # Authentication
│   │   ├── database.js        # SQLite operations
│   │   ├── game-logic.js      # Pazaak game rules
│   │   └── socket-handler.js  # WebSocket handling
│   ├── database/
│   │   └── schema.sql         # Database schema
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Main app component
│   │   ├── components/        # React components
│   │   ├── assets/            # SVG card graphics
│   │   └── services/          # API clients
│   ├── public/
│   └── package.json
└── README.md
```

## Setup

### Backend

```bash
cd backend
npm install
npm start
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Features

- User registration and authentication
- Real-time multiplayer gameplay via WebSocket
- Statistics tracking (wins, losses, matches played)
- Custom SVG card graphics
- Modern, responsive UI
