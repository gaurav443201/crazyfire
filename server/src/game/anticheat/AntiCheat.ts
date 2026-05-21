import { ServerPlayer } from '../ServerPlayer';

const MAX_SPEED = 12; // units/second
const MAX_SPEED_TOLERANCE = 1.5;

export class AntiCheat {
  validateMovement(
    player: ServerPlayer,
    newPosition: { x: number; y: number; z: number },
    velocity: { x: number; y: number; z: number },
    timestamp: number
  ): boolean {
    const dt = (timestamp - player.lastUpdateTime) / 1000;
    if (dt <= 0 || dt > 2) return true; // too large gap, accept

    const dx = newPosition.x - player.position.x;
    const dz = newPosition.z - player.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const speed = distance / dt;

    if (speed > MAX_SPEED * MAX_SPEED_TOLERANCE) {
      console.warn(`[ANTICHEAT] Speed hack detected: ${player.username} speed=${speed.toFixed(2)}`);
      return false;
    }

    return true;
  }

  validateShootRate(player: ServerPlayer, weapon: string, timestamp: number): boolean {
    // Could expand with per-weapon cooldown tracking
    return true;
  }
}
