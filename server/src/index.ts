import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { RoomManager } from './rooms/RoomManager.js';
import { setupSocketHandlers } from './socket/handlers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const isProduction = process.env.NODE_ENV === 'production';

// In production the client and server share the same origin — no CORS needed for the client.
// In dev we allow localhost:5173.
const io = new Server(httpServer, {
  cors: {
    origin: isProduction
      ? false                            // same-origin in production
      : ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

app.use(express.json());
if (!isProduction) app.use(cors());

const roomManager = new RoomManager();

app.get('/health', (_, res) => res.json({ status: 'ok', rooms: roomManager.getRoomCount() }));
app.get('/online-count', (_, res) => res.json({ count: roomManager.getOnlineCount() }));

setupSocketHandlers(io, roomManager);

// ── Serve the built React client in production ──────────────────────────────
if (isProduction) {
  // The client is built to ../../client/dist relative to this compiled file (server/dist/index.js)
  const clientDist = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  // SPA fallback — return index.html for any unknown route so React Router works
  app.get('*', (_, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
  console.log(`   Serving React client from: ${clientDist}`);
}

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`\n🔥 CRAZYFIRE SERVER running on port ${PORT}`);
  console.log(`   Socket.io ready for connections`);
  if (isProduction) console.log(`   Visit: http://localhost:${PORT}\n`);
});

