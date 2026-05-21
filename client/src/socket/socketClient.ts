import { io, Socket } from 'socket.io-client';

// In production (Render) server and client share the same origin.
// In local dev the Vite dev server runs on :5173 but the game server is on :3001.
const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin);

class SocketClient {
  private socket: Socket | null = null;

  connect(): Socket {
    if (this.socket?.connected) return this.socket;
    this.socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => console.log('[Socket] Connected:', this.socket?.id));
    this.socket.on('disconnect', (reason) => console.log('[Socket] Disconnected:', reason));
    this.socket.on('connect_error', (err) => console.error('[Socket] Error:', err.message));

    return this.socket;
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  emit(event: string, data?: any) {
    this.socket?.emit(event, data);
  }

  on(event: string, callback: (...args: any[]) => void) {
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: (...args: any[]) => void) {
    this.socket?.off(event, callback);
  }

  get id() { return this.socket?.id; }
  get connected() { return this.socket?.connected ?? false; }
}

export const socketClient = new SocketClient();
export default socketClient;
