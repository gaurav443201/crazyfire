import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { GameEngine } from '../../game/engine/GameEngine';
import HUD from './HUD';
import MobileControls from './MobileControls';

export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showLockPrompt, setShowLockPrompt] = useState(true);
  
  const { room, isMobile, setHealth, setAmmo, setADS } = useGameStore();

  useEffect(() => {
    if (!containerRef.current || !room) return;

    // Start 3D Game Engine
    const game = new GameEngine(
      containerRef.current,
      room.map,
      (health, ammo, isADS) => {
        setHealth(health);
        setAmmo(ammo);
        setADS(isADS);
      }
    );

    // Pointer lock listener to show lock prompts
    const handleLockChange = () => {
      if (document.pointerLockElement === containerRef.current) {
        setShowLockPrompt(false);
      } else {
        if (!isMobile) setShowLockPrompt(true);
      }
    };

    document.addEventListener('pointerlockchange', handleLockChange);

    return () => {
      game.destroy();
      document.removeEventListener('pointerlockchange', handleLockChange);
    };
  }, [room, isMobile, setHealth, setAmmo, setADS]);

  return (
    <div className="relative w-full h-full bg-[#050a0f] overflow-hidden select-none">
      {/* 3D Canvas wrapper */}
      <div ref={containerRef} className="w-full h-full cursor-crosshair" />

      {/* Modern HUD system overlay */}
      <HUD />

      {/* Adaptive Mobile Controller presets overlay */}
      {isMobile && <MobileControls />}

      {/* Pointer Lock Cover Prompt (PC only) */}
      {showLockPrompt && !isMobile && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-white pointer-events-none select-none animate-[fade-up_0.3s_ease]">
          <div className="glass p-8 border-2 border-glow max-w-sm w-full mx-4 text-center bg-slate-950/90 shadow-[0_0_50px_rgba(0,212,255,0.2)]">
            <h3 className="font-orbitron text-xl font-bold tracking-widest mb-2">ENGAGE CONTROL LINKS</h3>
            <p className="font-rajdhani text-xs tracking-[0.2em] text-slate-400 uppercase mb-6">CLICK ANYWHERE TO FOCUS CAMERA</p>
            
            <div className="border border-glow/20 p-4 rounded-lg bg-[#0d1e2e]/40 font-mono text-[10px] text-left text-slate-300 flex flex-col gap-2">
              <p>• [WASD] to Move Capsule</p>
              <p>• [SHIFT] to Sprint boost</p>
              <p>• [MOUSE] to Aim & look</p>
              <p>• [LEFT CLICK] to shoot weapon</p>
              <p>• [RIGHT CLICK] to Aim-down-sights (ADS)</p>
            </div>
            
            <p className="text-[9px] text-[--neon-blue] mt-4 font-rajdhani tracking-widest uppercase animate-pulse">
              ▲ CONNECTION SECURE AND STABLE
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
