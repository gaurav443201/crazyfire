import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { RoomManager } from './rooms/RoomManager';
import { setupSocketHandlers } from './socket/handlers';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000', '*'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

app.use(cors());
app.use(express.json());

const roomManager = new RoomManager();

app.get('/health', (_, res) => res.json({ status: 'ok', rooms: roomManager.getRoomCount() }));
app.get('/online-count', (_, res) => res.json({ count: roomManager.getOnlineCount() }));

setupSocketHandlers(io, roomManager);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`\n🔥 CRAZYFIRE SERVER running on port ${PORT}`);
  console.log(`   Socket.io ready for connections\n`);
});
