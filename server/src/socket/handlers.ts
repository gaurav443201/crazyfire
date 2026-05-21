import { Server, Socket } from 'socket.io';
import { RoomManager } from '../rooms/RoomManager';
import { GameRoom } from '../game/GameRoom';

export function setupSocketHandlers(io: Server, roomManager: RoomManager) {
  const TICK_RATE = 20;
  const gameLoops = new Map<string, NodeJS.Timeout>();

  function startGameLoop(room: GameRoom) {
    if (gameLoops.has(room.id)) return;
    const interval = setInterval(() => {
      if (room.state !== 'playing') return;

      // Respawn dead players
      room.players.forEach(p => {
        if (!p.isAlive && Date.now() >= p.respawnTime) {
          const spawn = room.getSpawnPosition(p.team);
          p.respawn(spawn);
          io.to(room.id).emit('player:respawn', { id: p.id, position: spawn, health: p.health });
        }
      });

      // Broadcast all player states
      const states = [...room.players.values()].map(p => ({
        id: p.id, position: p.position, rotation: p.rotation, velocity: p.velocity,
        health: p.health, isAlive: p.isAlive, weapon: p.weapon
      }));
      io.to(room.id).emit('game:state', { players: states, scores: room.scores, timestamp: Date.now() });

      // Check game end
      if (room.isTimeUp() || room.isScoreLimitReached()) {
        const result = room.endGame();
        io.to(room.id).emit('game:end', {
          winner: result.winner,
          mvp: result.mvp?.getPublicInfo() ?? null,
          scores: room.scores,
          players: [...room.players.values()].map(p => p.getPublicInfo())
        });
        clearInterval(interval);
        gameLoops.delete(room.id);
        setTimeout(() => roomManager.deleteRoom(room.id), 30000);
      }
    }, 1000 / TICK_RATE);

    gameLoops.set(room.id, interval);
    room.gameLoopInterval = interval;
  }

  io.on('connection', (socket: Socket) => {
    console.log(`[+] Connected: ${socket.id}`);
    roomManager.addPlayer(socket.id);
    io.emit('server:online_count', { count: roomManager.getOnlineCount() });

    // Quick play matchmaking
    socket.on('matchmaking:join', ({ username }: { username: string }) => {
      let room = roomManager.findPublicRoom();
      if (!room) room = roomManager.createRoom(socket.id, false);
      const player = room.addPlayer(socket.id, username);
      socket.join(room.id);
      socket.data.roomId = room.id;
      socket.data.username = username;
      socket.emit('room:joined', { room: room.getRoomInfo(), player: player.getPublicInfo() });
      socket.to(room.id).emit('room:player_joined', { player: player.getPublicInfo() });
    });

    // Create private room
    socket.on('room:create', ({ username, map, duration }: { username: string; map: string; duration: number }) => {
      const room = roomManager.createRoom(socket.id, true, map, duration);
      const player = room.addPlayer(socket.id, username);
      socket.join(room.id);
      socket.data.roomId = room.id;
      socket.data.username = username;
      socket.emit('room:created', { room: room.getRoomInfo(), player: player.getPublicInfo() });
    });

    // Join room by code
    socket.on('room:join_code', ({ username, code }: { username: string; code: string }) => {
      const room = roomManager.getRoomByCode(code);
      if (!room) { socket.emit('room:error', { message: 'Room not found. Check your code!' }); return; }
      if (room.state !== 'lobby') { socket.emit('room:error', { message: 'Match already started!' }); return; }
      if (room.getPlayerCount() >= room.maxPlayers) { socket.emit('room:error', { message: 'Room is full!' }); return; }
      const player = room.addPlayer(socket.id, username);
      socket.join(room.id);
      socket.data.roomId = room.id;
      socket.data.username = username;
      socket.emit('room:joined', { room: room.getRoomInfo(), player: player.getPublicInfo() });
      socket.to(room.id).emit('room:player_joined', { player: player.getPublicInfo() });
    });

    // Player ready toggle
    socket.on('lobby:ready', () => {
      const room = roomManager.getRoom(socket.data.roomId);
      const player = room?.getPlayer(socket.id);
      if (!player) return;
      player.isReady = !player.isReady;
      io.to(room!.id).emit('lobby:player_ready', { id: socket.id, isReady: player.isReady });
    });

    // Host starts game
    socket.on('lobby:start', () => {
      const room = roomManager.getRoom(socket.data.roomId);
      if (!room || room.hostId !== socket.id) return;
      if (room.getPlayerCount() < 1) return;
      room.startGame();
      io.to(room.id).emit('game:start', { map: room.map, duration: room.duration, scores: room.scores });
      startGameLoop(room);
    });

    // Map change (host only)
    socket.on('lobby:set_map', ({ map }: { map: string }) => {
      const room = roomManager.getRoom(socket.data.roomId);
      if (!room || room.hostId !== socket.id) return;
      room.map = map;
      io.to(room.id).emit('lobby:map_changed', { map });
    });

    // Duration change (host only)
    socket.on('lobby:set_duration', ({ duration }: { duration: number }) => {
      const room = roomManager.getRoom(socket.data.roomId);
      if (!room || room.hostId !== socket.id) return;
      room.duration = duration;
      io.to(room.id).emit('lobby:duration_changed', { duration });
    });

    // Switch team
    socket.on('lobby:switch_team', () => {
      const room = roomManager.getRoom(socket.data.roomId);
      const player = room?.getPlayer(socket.id);
      if (!player) return;
      player.team = player.team === 'alpha' ? 'bravo' : 'alpha';
      io.to(room!.id).emit('lobby:team_switched', { id: socket.id, team: player.team });
    });

    // Kick player (host only)
    socket.on('lobby:kick', ({ targetId }: { targetId: string }) => {
      const room = roomManager.getRoom(socket.data.roomId);
      if (!room || room.hostId !== socket.id) return;
      const target = io.sockets.sockets.get(targetId);
      if (target) {
        target.emit('room:kicked', { reason: 'Kicked by host' });
        target.leave(room.id);
        room.removePlayer(targetId);
        io.to(room.id).emit('room:player_left', { id: targetId });
      }
    });

    // Player movement (client -> server)
    socket.on('player:move', ({ position, rotation, velocity, timestamp }: any) => {
      const room = roomManager.getRoom(socket.data.roomId);
      if (!room || room.state !== 'playing') return;
      room.updatePlayerState(socket.id, position, rotation, velocity, timestamp);
    });

    // Shoot event
    socket.on('player:shoot', ({ targetId, hitPosition, weapon, timestamp }: any) => {
      const room = roomManager.getRoom(socket.data.roomId);
      if (!room || room.state !== 'playing') return;
      const result = room.processShot(socket.id, targetId, hitPosition, weapon, timestamp);
      if (!result) return;

      // Notify shooter
      socket.emit('shoot:result', { targetId, ...result });

      // Notify target
      const targetSocket = io.sockets.sockets.get(targetId);
      if (targetSocket) {
        targetSocket.emit('player:hit', { damage: result.damage, headshot: result.headshot, from: socket.id });
      }

      if (!room.getPlayer(targetId)?.isAlive) {
        io.to(room.id).emit('player:killed', {
          killerId: socket.id, killerName: socket.data.username,
          victimId: targetId, victimName: room.getPlayer(targetId)?.username,
          weapon, headshot: result.headshot,
          scores: room.scores, killFeed: room.killFeed.slice(0, 5)
        });
      }
    });

    // Weapon switch
    socket.on('player:weapon', ({ weapon }: { weapon: string }) => {
      const room = roomManager.getRoom(socket.data.roomId);
      const player = room?.getPlayer(socket.id);
      if (!player) return;
      player.weapon = weapon;
      socket.to(room!.id).emit('player:weapon_switched', { id: socket.id, weapon });
    });

    // Chat message
    socket.on('chat:message', ({ message }: { message: string }) => {
      const room = roomManager.getRoom(socket.data.roomId);
      if (!room || !message.trim()) return;
      io.to(room.id).emit('chat:message', {
        id: socket.id, username: socket.data.username,
        message: message.slice(0, 200), timestamp: Date.now()
      });
    });

    // Leave room
    socket.on('room:leave', () => handleDisconnect(socket));

    // Disconnect
    socket.on('disconnect', () => handleDisconnect(socket));

    function handleDisconnect(socket: Socket) {
      console.log(`[-] Disconnected: ${socket.id}`);
      roomManager.removePlayer(socket.id);
      io.emit('server:online_count', { count: roomManager.getOnlineCount() });

      const room = roomManager.getRoom(socket.data.roomId);
      if (!room) return;

      room.removePlayer(socket.id);
      socket.to(room.id).emit('room:player_left', { id: socket.id, newHostId: room.hostId });

      if (room.getPlayerCount() === 0) {
        const loop = gameLoops.get(room.id);
        if (loop) { clearInterval(loop); gameLoops.delete(room.id); }
        roomManager.deleteRoom(room.id);
      }
    }
  });
}
