import { v4 as uuidv4 } from 'uuid';
import { GameRoom } from '../game/GameRoom';

export interface RoomInfo {
  id: string;
  code: string;
  hostId: string;
  map: string;
  duration: number;
  maxPlayers: number;
  isPrivate: boolean;
  state: 'lobby' | 'playing' | 'finished';
  playerCount: number;
}

export class RoomManager {
  private rooms: Map<string, GameRoom> = new Map();
  private codeToRoom: Map<string, string> = new Map();
  private connectedPlayers: Set<string> = new Set();

  createRoom(hostId: string, isPrivate: boolean, map: string = 'factory', duration: number = 5): GameRoom {
    const id = uuidv4();
    const code = this.generateCode();
    const room = new GameRoom(id, code, hostId, isPrivate, map, duration);
    this.rooms.set(id, room);
    this.codeToRoom.set(code, id);
    return room;
  }

  getRoom(id: string): GameRoom | undefined {
    return this.rooms.get(id);
  }

  getRoomByCode(code: string): GameRoom | undefined {
    const id = this.codeToRoom.get(code.toUpperCase());
    return id ? this.rooms.get(id) : undefined;
  }

  findPublicRoom(): GameRoom | undefined {
    for (const room of this.rooms.values()) {
      if (!room.isPrivate && room.state === 'lobby' && room.getPlayerCount() < room.maxPlayers) {
        return room;
      }
    }
    return undefined;
  }

  deleteRoom(id: string): void {
    const room = this.rooms.get(id);
    if (room) {
      this.codeToRoom.delete(room.code);
      this.rooms.delete(id);
    }
  }

  addPlayer(socketId: string): void {
    this.connectedPlayers.add(socketId);
  }

  removePlayer(socketId: string): void {
    this.connectedPlayers.delete(socketId);
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  getOnlineCount(): number {
    return this.connectedPlayers.size;
  }

  cleanupEmptyRooms(): void {
    for (const [id, room] of this.rooms.entries()) {
      if (room.getPlayerCount() === 0) {
        this.deleteRoom(id);
      }
    }
  }

  private generateCode(): string {
    let code: string;
    do {
      code = Math.floor(10000 + Math.random() * 90000).toString();
    } while (this.codeToRoom.has(code));
    return code;
  }
}
