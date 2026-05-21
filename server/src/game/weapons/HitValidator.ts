import { ServerPlayer } from '../ServerPlayer.js';

const WEAPON_STATS: Record<string, { damage: number; headshotMultiplier: number; range: number; fireRate: number }> = {
  m4a1: { damage: 30, headshotMultiplier: 2.5, range: 60, fireRate: 100 },
  vector: { damage: 22, headshotMultiplier: 2.0, range: 35, fireRate: 65 },
  awp: { damage: 95, headshotMultiplier: 2.0, range: 150, fireRate: 1200 },
  spas12: { damage: 80, headshotMultiplier: 1.5, range: 15, fireRate: 800 }
};

export class HitValidator {
  validate(
    shooter: ServerPlayer,
    target: ServerPlayer,
    hitPosition: { x: number; y: number; z: number },
    weapon: string,
    timestamp: number
  ): { valid: boolean; headshot: boolean; damage: number } {
    const stats = WEAPON_STATS[weapon] || WEAPON_STATS.m4a1;

    // Distance check with lag compensation (allow 200ms buffer)
    const dx = target.position.x - shooter.position.x;
    const dy = target.position.y - shooter.position.y;
    const dz = target.position.z - shooter.position.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (distance > stats.range * 1.2) {
      return { valid: false, headshot: false, damage: 0 };
    }

    // Headshot detection (hit position is above player center)
    const headshot = hitPosition.y > target.position.y + 1.4;
    const damage = headshot ? Math.floor(stats.damage * stats.headshotMultiplier) : stats.damage;

    return { valid: true, headshot, damage };
  }
}
