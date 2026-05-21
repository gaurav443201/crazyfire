import { TeamId } from './GameRoom.js';

export class ServerPlayer {
  id: string;
  username: string;
  team: TeamId;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number };
  velocity: { x: number; y: number; z: number };
  health: number = 100;
  maxHealth: number = 100;
  isAlive: boolean = true;
  kills: number = 0;
  deaths: number = 0;
  assists: number = 0;
  score: number = 0;
  weapon: string = 'm4a1';
  isReady: boolean = false;
  ping: number = 0;
  lastUpdateTime: number = Date.now();
  respawnTime: number = 0;

  constructor(id: string, username: string, team: TeamId, spawnPos: { x: number; y: number; z: number }) {
    this.id = id;
    this.username = username;
    this.team = team;
    this.position = { ...spawnPos };
    this.rotation = { x: 0, y: 0 };
    this.velocity = { x: 0, y: 0, z: 0 };
  }

  updatePosition(
    position: { x: number; y: number; z: number },
    rotation: { x: number; y: number },
    velocity: { x: number; y: number; z: number },
    timestamp: number
  ): void {
    this.position = position;
    this.rotation = rotation;
    this.velocity = velocity;
    this.lastUpdateTime = timestamp;
  }

  takeDamage(damage: number): void {
    this.health = Math.max(0, this.health - damage);
    if (this.health <= 0) {
      this.isAlive = false;
      this.deaths++;
      this.respawnTime = Date.now() + 3000;
    }
  }

  respawn(position: { x: number; y: number; z: number }): void {
    this.health = this.maxHealth;
    this.isAlive = true;
    this.position = { ...position };
    this.velocity = { x: 0, y: 0, z: 0 };
  }

  reset(): void {
    this.health = this.maxHealth;
    this.isAlive = true;
    this.kills = 0;
    this.deaths = 0;
    this.assists = 0;
    this.score = 0;
    this.velocity = { x: 0, y: 0, z: 0 };
  }

  getPublicInfo() {
    return {
      id: this.id,
      username: this.username,
      team: this.team,
      health: this.health,
      isAlive: this.isAlive,
      kills: this.kills,
      deaths: this.deaths,
      assists: this.assists,
      score: this.score,
      weapon: this.weapon,
      isReady: this.isReady,
      ping: this.ping,
      position: this.position,
      rotation: this.rotation
    };
  }
}
