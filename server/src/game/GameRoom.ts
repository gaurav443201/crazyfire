import { ServerPlayer } from './ServerPlayer';
import { HitValidator } from './weapons/HitValidator';
import { AntiCheat } from './anticheat/AntiCheat';

export type TeamId = 'alpha' | 'bravo';
export type GameState = 'lobby' | 'playing' | 'finished';

export interface KillEvent {
  killerId: string;
  killerName: string;
  victimId: string;
  victimName: string;
  weapon: string;
  headshot: boolean;
  timestamp: number;
}

export class GameRoom {
  id: string;
  code: string;
  hostId: string;
  isPrivate: boolean;
  map: string;
  duration: number; // minutes
  maxPlayers: number = 10;
  state: GameState = 'lobby';

  players: Map<string, ServerPlayer> = new Map();
  scores: { alpha: number; bravo: number } = { alpha: 0, bravo: 0 };
  scoreLimit: number = 30;
  killFeed: KillEvent[] = [];
  startTime: number = 0;
  gameLoopInterval: NodeJS.Timeout | null = null;

  private hitValidator: HitValidator;
  private antiCheat: AntiCheat;

  constructor(id: string, code: string, hostId: string, isPrivate: boolean, map: string, duration: number) {
    this.id = id;
    this.code = code;
    this.hostId = hostId;
    this.isPrivate = isPrivate;
    this.map = map;
    this.duration = duration;
    this.hitValidator = new HitValidator();
    this.antiCheat = new AntiCheat();
  }

  addPlayer(socketId: string, username: string): ServerPlayer {
    const team = this.getBalancedTeam();
    const spawnPos = this.getSpawnPosition(team);
    const player = new ServerPlayer(socketId, username, team, spawnPos);
    this.players.set(socketId, player);
    return player;
  }

  removePlayer(socketId: string): void {
    this.players.delete(socketId);
    if (this.hostId === socketId) {
      const remaining = [...this.players.keys()];
      if (remaining.length > 0) this.hostId = remaining[0];
    }
  }

  getPlayer(socketId: string): ServerPlayer | undefined {
    return this.players.get(socketId);
  }

  getPlayerCount(): number {
    return this.players.size;
  }

  getTeamPlayers(team: TeamId): ServerPlayer[] {
    return [...this.players.values()].filter(p => p.team === team);
  }

  updatePlayerState(socketId: string, position: { x: number; y: number; z: number }, rotation: { x: number; y: number }, velocity: { x: number; y: number; z: number }, timestamp: number): boolean {
    const player = this.players.get(socketId);
    if (!player) return false;
    if (this.antiCheat.validateMovement(player, position, velocity, timestamp)) {
      player.updatePosition(position, rotation, velocity, timestamp);
      return true;
    }
    return false;
  }

  processShot(shooterId: string, targetId: string, hitPosition: { x: number; y: number; z: number }, weapon: string, timestamp: number): { valid: boolean; headshot: boolean; damage: number } | null {
    const shooter = this.players.get(shooterId);
    const target = this.players.get(targetId);
    if (!shooter || !target) return null;
    if (shooter.team === target.team) return null;
    if (!target.isAlive) return null;

    const result = this.hitValidator.validate(shooter, target, hitPosition, weapon, timestamp);
    if (!result.valid) return null;

    target.takeDamage(result.damage);
    if (!target.isAlive) {
      this.processKill(shooterId, targetId, weapon, result.headshot);
    }
    return result;
  }

  processKill(killerId: string, victimId: string, weapon: string, headshot: boolean): void {
    const killer = this.players.get(killerId);
    const victim = this.players.get(victimId);
    if (!killer || !victim) return;

    killer.kills++;
    killer.score += headshot ? 150 : 100;
    victim.deaths++;

    if (killer.team === 'alpha') this.scores.alpha++;
    else this.scores.bravo++;

    const killEvent: KillEvent = {
      killerId,
      killerName: killer.username,
      victimId,
      victimName: victim.username,
      weapon,
      headshot,
      timestamp: Date.now()
    };
    this.killFeed.unshift(killEvent);
    if (this.killFeed.length > 20) this.killFeed.pop();
  }

  startGame(): void {
    this.state = 'playing';
    this.startTime = Date.now();
    this.scores = { alpha: 0, bravo: 0 };
    this.killFeed = [];
    this.players.forEach(p => p.reset());
  }

  endGame(): { winner: TeamId | 'draw'; mvp: ServerPlayer | null } {
    this.state = 'finished';
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval);
      this.gameLoopInterval = null;
    }

    let winner: TeamId | 'draw';
    if (this.scores.alpha > this.scores.bravo) winner = 'alpha';
    else if (this.scores.bravo > this.scores.alpha) winner = 'bravo';
    else winner = 'draw';

    const mvp = [...this.players.values()].reduce((best, p) =>
      !best || p.kills > best.kills ? p : best, null as ServerPlayer | null);

    return { winner, mvp };
  }

  isTimeUp(): boolean {
    if (this.state !== 'playing') return false;
    return Date.now() - this.startTime >= this.duration * 60 * 1000;
  }

  isScoreLimitReached(): boolean {
    return this.scores.alpha >= this.scoreLimit || this.scores.bravo >= this.scoreLimit;
  }

  getSpawnPosition(team: TeamId): { x: number; y: number; z: number } {
    const spawns = {
      factory: {
        alpha: [{ x: -15, y: 1, z: 0 }, { x: -15, y: 1, z: 5 }, { x: -15, y: 1, z: -5 }],
        bravo: [{ x: 15, y: 1, z: 0 }, { x: 15, y: 1, z: 5 }, { x: 15, y: 1, z: -5 }]
      },
      rooftop: {
        alpha: [{ x: -20, y: 1, z: 0 }, { x: -20, y: 1, z: 5 }, { x: -20, y: 1, z: -5 }],
        bravo: [{ x: 20, y: 1, z: 0 }, { x: 20, y: 1, z: 5 }, { x: 20, y: 1, z: -5 }]
      }
    };
    const mapSpawns = spawns[this.map as keyof typeof spawns] || spawns.factory;
    const teamSpawns = mapSpawns[team];
    return teamSpawns[Math.floor(Math.random() * teamSpawns.length)];
  }

  getBalancedTeam(): TeamId {
    const alpha = this.getTeamPlayers('alpha').length;
    const bravo = this.getTeamPlayers('bravo').length;
    return alpha <= bravo ? 'alpha' : 'bravo';
  }

  getRoomInfo() {
    return {
      id: this.id,
      code: this.code,
      hostId: this.hostId,
      map: this.map,
      duration: this.duration,
      maxPlayers: this.maxPlayers,
      isPrivate: this.isPrivate,
      state: this.state,
      scores: this.scores,
      playerCount: this.players.size,
      players: [...this.players.values()].map(p => p.getPublicInfo())
    };
  }
}
