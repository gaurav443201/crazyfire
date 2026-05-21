import { create } from 'zustand';

export type AppScreen = 'landing' | 'matchmaking' | 'lobby' | 'game' | 'postgame';
export type TeamId = 'alpha' | 'bravo';

export interface PlayerInfo {
  id: string;
  username: string;
  team: TeamId;
  health: number;
  isAlive: boolean;
  kills: number;
  deaths: number;
  assists: number;
  score: number;
  weapon: string;
  isReady: boolean;
  ping: number;
  position?: { x: number; y: number; z: number };
  rotation?: { x: number; y: number };
}

export interface KillEvent {
  killerId: string;
  killerName: string;
  victimId: string;
  victimName: string;
  weapon: string;
  headshot: boolean;
  timestamp: number;
}

export interface RoomInfo {
  id: string;
  code: string;
  hostId: string;
  map: string;
  duration: number;
  maxPlayers: number;
  isPrivate: boolean;
  state: string;
  scores: { alpha: number; bravo: number };
  playerCount: number;
  players: PlayerInfo[];
}

export interface PostGameResult {
  winner: TeamId | 'draw';
  mvp: PlayerInfo | null;
  scores: { alpha: number; bravo: number };
  players: PlayerInfo[];
}

interface GameStore {
  // App state
  screen: AppScreen;
  username: string;
  onlineCount: number;

  // Room & player
  room: RoomInfo | null;
  localPlayer: PlayerInfo | null;
  remotePlayers: Map<string, PlayerInfo>;

  // Game state
  scores: { alpha: number; bravo: number };
  killFeed: KillEvent[];
  timeLeft: number;
  postGameResult: PostGameResult | null;

  // HUD
  health: number;
  ammo: number;
  maxAmmo: number;
  reserveAmmo: number;
  currentWeapon: string;
  isADS: boolean;
  showDamage: boolean;
  fps: number;
  ping: number;

  // Settings
  sensitivity: number;
  fov: number;
  crosshairColor: string;
  crosshairSize: number;
  isMobile: boolean;

  // Actions
  setScreen: (screen: AppScreen) => void;
  setUsername: (name: string) => void;
  setOnlineCount: (count: number) => void;
  setRoom: (room: RoomInfo | null) => void;
  setLocalPlayer: (player: PlayerInfo | null) => void;
  updateRemotePlayer: (player: PlayerInfo) => void;
  removeRemotePlayer: (id: string) => void;
  setScores: (scores: { alpha: number; bravo: number }) => void;
  addKillEvent: (kill: KillEvent) => void;
  setTimeLeft: (time: number) => void;
  setPostGameResult: (result: PostGameResult | null) => void;
  setHealth: (health: number) => void;
  setAmmo: (ammo: number, reserve?: number) => void;
  setCurrentWeapon: (weapon: string) => void;
  setADS: (ads: boolean) => void;
  setShowDamage: (show: boolean) => void;
  setFPS: (fps: number) => void;
  setPing: (ping: number) => void;
  setSensitivity: (s: number) => void;
  setFOV: (fov: number) => void;
  setCrosshairColor: (color: string) => void;
  setCrosshairSize: (size: number) => void;
  setIsMobile: (mobile: boolean) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  screen: 'landing',
  username: '',
  onlineCount: 0,
  room: null,
  localPlayer: null,
  remotePlayers: new Map(),
  scores: { alpha: 0, bravo: 0 },
  killFeed: [],
  timeLeft: 300,
  postGameResult: null,
  health: 100,
  ammo: 30,
  maxAmmo: 30,
  reserveAmmo: 90,
  currentWeapon: 'm4a1',
  isADS: false,
  showDamage: false,
  fps: 0,
  ping: 0,
  sensitivity: 0.002,
  fov: 75,
  crosshairColor: '#ffffff',
  crosshairSize: 8,
  isMobile: /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent),

  setScreen: (screen) => set({ screen }),
  setUsername: (username) => set({ username }),
  setOnlineCount: (onlineCount) => set({ onlineCount }),
  setRoom: (room) => set({ room }),
  setLocalPlayer: (localPlayer) => set({ localPlayer }),
  updateRemotePlayer: (player) => set(state => {
    const m = new Map(state.remotePlayers);
    m.set(player.id, player);
    return { remotePlayers: m };
  }),
  removeRemotePlayer: (id) => set(state => {
    const m = new Map(state.remotePlayers);
    m.delete(id);
    return { remotePlayers: m };
  }),
  setScores: (scores) => set({ scores }),
  addKillEvent: (kill) => set(state => ({
    killFeed: [kill, ...state.killFeed].slice(0, 8)
  })),
  setTimeLeft: (timeLeft) => set({ timeLeft }),
  setPostGameResult: (postGameResult) => set({ postGameResult }),
  setHealth: (health) => set({ health }),
  setAmmo: (ammo, reserve) => set(state => ({ ammo, reserveAmmo: reserve ?? state.reserveAmmo })),
  setCurrentWeapon: (currentWeapon) => set({ currentWeapon }),
  setADS: (isADS) => set({ isADS }),
  setShowDamage: (showDamage) => set({ showDamage }),
  setFPS: (fps) => set({ fps }),
  setPing: (ping) => set({ ping }),
  setSensitivity: (sensitivity) => set({ sensitivity }),
  setFOV: (fov) => set({ fov }),
  setCrosshairColor: (crosshairColor) => set({ crosshairColor }),
  setCrosshairSize: (crosshairSize) => set({ crosshairSize }),
  setIsMobile: (isMobile) => set({ isMobile }),
  resetGame: () => set({
    health: 100, ammo: 30, reserveAmmo: 90, scores: { alpha: 0, bravo: 0 },
    killFeed: [], timeLeft: 300, remotePlayers: new Map(), postGameResult: null
  }),
}));
