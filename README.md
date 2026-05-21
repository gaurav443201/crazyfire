# CRAZYFIRE 🔥

A browser-based authoritative multiplayer FPS game built with React, Three.js, and Socket.io.

## Features
- 🎮 First-person WebGL game engine (Three.js)
- 🌐 Real-time multiplayer via Socket.io
- 🏠 Private rooms with 5-digit invite codes
- 🎯 Authoritative server-side hit validation & anti-cheat
- 📱 Adaptive PC + Mobile HUD & controls
- 🗺️ 2 Maps: Factory & Rooftop
- 💫 Futuristic neon glassmorphism UI

## Stack
- **Client:** React 19 + TypeScript + Vite + Three.js + Tailwind CSS v4 + Zustand
- **Server:** Node.js + Express + Socket.io + TypeScript

## Getting Started

### Server
```bash
cd server
npm install
npm run dev     # Starts on port 3001
```

### Client
```bash
cd client
npm install
npm run dev     # Starts on port 5173
```

Open `http://localhost:5173` in your browser.

## Controls (PC)
- `WASD` — Move
- `SHIFT` — Sprint
- `SPACE` — Jump
- `C` — Crouch / Slide
- `R` — Reload
- `LMB` — Shoot
- `RMB` — Aim Down Sights (ADS)
- `ESC` — Release cursor

## Gameplay
1. Enter a username and click **LAUNCH MATCH** for public matchmaking
2. Or click **CREATE ROOM** to host a private match with a 5-digit code
3. Share the code with friends to **JOIN MATCH**
4. In the lobby, select your team, choose map & duration, then **CONFIRM DEPLOYMENT**
5. Host clicks **DEPLOY NOW** to start the match
6. First team to 30 kills wins!
