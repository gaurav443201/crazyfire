import { useEffect, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';

export default function HUD() {
  const { 
    health, ammo, reserveAmmo, scores, killFeed, timeLeft, 
    fps, ping, showDamage, currentWeapon, isADS, crosshairSpread 
  } = useGameStore();

  const [formattedTime, setFormattedTime] = useState('05:00');

  useEffect(() => {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    setFormattedTime(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
  }, [timeLeft]);

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none select-none z-30 flex flex-col justify-between p-4 md:p-6 text-white font-rajdhani">
      {/* Damage vignette when hit */}
      {showDamage && <div className="damage-vignette" />}

      {/* TOP HEADER: Scores, Timer, FPS/Ping */}
      <div className="flex justify-between items-start w-full">
        {/* Left Stats: FPS / PING */}
        <div className="flex flex-col font-mono text-[10px] tracking-widest text-slate-400 bg-black/70 backdrop-blur-md border border-[#00d4ff]/20 px-4 py-2 rounded shadow-[0_0_15px_rgba(0,0,0,0.5)] relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[--neon-blue]" />
          <span>FPS: <span className="text-[--neon-blue] font-bold">{fps || 60}</span></span>
          <span className="mt-1">PING: <span className="text-[--neon-blue] font-bold">{ping || 12} ms</span></span>
        </div>

        {/* Center: Live Match Scores & Timer */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-6 bg-black/75 backdrop-blur-md border border-[#00d4ff]/20 px-6 py-2 rounded-xl shadow-[0_0_20px_rgba(0,212,255,0.1)] relative">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[--neon-blue]/40 to-transparent" />
            <span className="hud-text text-2xl font-black text-sky-400">{scores.alpha}</span>
            <div className="flex flex-col items-center border-x border-slate-800 px-6">
              <span className="font-mono text-xl font-bold tracking-widest text-white">{formattedTime}</span>
              <span className="text-[8px] tracking-[0.2em] text-slate-400 uppercase mt-0.5">TDM</span>
            </div>
            <span className="hud-text text-2xl font-black text-rose-500">{scores.bravo}</span>
          </div>
          <span className="text-[9px] tracking-widest text-slate-400 mt-1 uppercase">FIRST TO 30 KILLS</span>
        </div>

        {/* Right side: Minimap layout */}
        <div className="w-24 h-24 bg-black/60 border border-[#00d4ff]/20 rounded-lg flex items-center justify-center relative overflow-hidden backdrop-blur-md shadow-[0_0_20px_rgba(0,0,0,0.4)]">
          {/* Radar scanning sweep line */}
          <div 
            className="absolute w-12 h-12 top-0 left-0 origin-bottom-right bg-[linear-gradient(45deg,transparent_60%,rgba(0,212,255,0.1)_90%,rgba(0,212,255,0.3)_100%)] rounded-tl-full pointer-events-none"
            style={{
              animation: 'radar-sweep 4s linear infinite',
              width: '50%',
              height: '50%',
            }}
          />
          
          {/* Static minimap rings */}
          <div className="w-20 h-20 rounded-full border border-glow/10 flex items-center justify-center relative">
            <div className="w-12 h-12 rounded-full border border-dashed border-glow/5" />
            
            {/* Centered player radar dot */}
            <div className="w-1.5 h-1.5 rounded-full bg-[--neon-blue] absolute shadow-[0_0_8px_var(--neon-blue)] animate-pulse" />
            
            {/* Static blip representing remote player detection */}
            <div 
              className="w-1 h-1 rounded-full bg-rose-500 absolute shadow-[0_0_6px_#ff2d55] animate-[flicker_3s_infinite]" 
              style={{ top: '25%', left: '70%' }}
            />
          </div>
          <span className="absolute bottom-1 text-[8px] font-mono tracking-wider text-slate-400 uppercase">SECTOR A</span>
        </div>
      </div>

      {/* MID-RIGHT LAYER: Kill Feed */}
      <div className="absolute top-28 right-4 flex flex-col gap-2 max-w-xs w-full overflow-hidden items-end">
        {killFeed.map((kill, index) => (
          <div 
            key={kill.timestamp + '-' + index} 
            className="flex items-center gap-2 text-xs font-mono tracking-wide py-1.5 px-3 bg-black/70 border-l-2 border-l-red-500 backdrop-blur-md rounded shadow-md border border-slate-800"
          >
            <span className="font-bold text-sky-400">{kill.killerName}</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">[{kill.weapon}]</span>
            <span className="font-bold text-rose-400">{kill.victimName}</span>
            {kill.headshot && (
              <span className="text-[9px] bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30 px-1 rounded-sm">☠</span>
            )}
          </div>
        ))}
      </div>

      {/* CENTER CROSSHAIR */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center z-10 pointer-events-none">
        {!isADS ? (
          <div className="relative w-12 h-12 flex items-center justify-center">
            {/* Left Line */}
            <span 
              className="crosshair-line w-2.5 h-0.5" 
              style={{ transform: `translateX(-${4 + (crosshairSpread ?? 10)}px)` }} 
            />
            {/* Right Line */}
            <span 
              className="crosshair-line w-2.5 h-0.5" 
              style={{ transform: `translateX(${4 + (crosshairSpread ?? 10)}px)` }} 
            />
            {/* Top Line */}
            <span 
              className="crosshair-line w-0.5 h-2.5" 
              style={{ transform: `translateY(-${4 + (crosshairSpread ?? 10)}px)` }} 
            />
            {/* Bottom Line */}
            <span 
              className="crosshair-line w-0.5 h-2.5" 
              style={{ transform: `translateY(${4 + (crosshairSpread ?? 10)}px)` }} 
            />
            {/* Center Dot */}
            <span className="w-1 h-1 rounded-full bg-white opacity-90 shadow-[0_0_4px_white]" />
          </div>
        ) : (
          /* Red dot zoom targeting */
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_6px_red]" />
        )}
      </div>

      {/* BOTTOM ACTION ROW: Health & Ammo */}
      <div className="flex justify-between items-end w-full">
        {/* HEALTH PORT */}
        <div className="flex flex-col w-64 bg-black/60 backdrop-blur-md border border-[#00d4ff]/20 p-4 rounded-xl shadow-[0_0_20px_rgba(0,212,255,0.05)] relative overflow-hidden">
          {/* Clip corner highlight */}
          <div className="absolute top-0 left-0 w-8 h-1 bg-[--neon-blue]" />
          
          <div className="flex justify-between items-baseline mb-1.5">
            <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">HEALTH</span>
            <span className="hud-text text-3xl font-black text-white">{health}</span>
          </div>
          <div className="health-bar h-3.5 bg-black/40 border border-slate-900 rounded relative overflow-hidden">
            <div 
              className={`health-fill h-full transition-all duration-300 ${
                health > 35 
                  ? 'bg-gradient-to-r from-cyan-500 to-sky-400 shadow-[0_0_10px_#00aaff]' 
                  : 'bg-gradient-to-r from-red-600 to-rose-500 shadow-[0_0_10px_#ff2d55] animate-pulse'
              }`} 
              style={{ width: `${health}%` }} 
            />
            {/* Subtle overlay grid lines in health bar */}
            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_90%,rgba(0,0,0,0.3)_90%)] bg-[size:10px_100%] pointer-events-none" />
          </div>
        </div>

        {/* Tactical Keybind hints (PC) */}
        <div className="hidden md:flex gap-4 font-mono text-[9px] text-slate-400 tracking-wider bg-black/40 backdrop-blur px-4 py-2 rounded-lg border border-slate-900 mb-2">
          <span>[WASD] MOVE</span>
          <span>•</span>
          <span>[SHIFT] SPRINT</span>
          <span>•</span>
          <span>[SPACE] JUMP</span>
          <span>•</span>
          <span>[C] CROUCH / SLIDE</span>
          <span>•</span>
          <span>[R] RELOAD</span>
          <span>•</span>
          <span>[RMB] ADS</span>
        </div>

        {/* AMMO PORT */}
        <div className="flex flex-col w-60 bg-black/60 backdrop-blur-md border border-[#00d4ff]/20 p-4 rounded-xl items-end shadow-[0_0_20px_rgba(0,212,255,0.05)] relative overflow-hidden">
          {/* Small indicator clip corner highlight */}
          <div className="absolute top-0 right-0 w-8 h-1 bg-[--neon-blue]" />
          
          <span className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-1">{currentWeapon.toUpperCase()}</span>
          
          <div className="flex items-center gap-4 w-full justify-end">
            {/* Rows of neon bullet shells/bars */}
            <div className="flex gap-[2px] h-6 items-end bg-black/40 px-2 py-1 rounded border border-slate-900">
              {Array.from({ length: 30 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-[3px] rounded-sm transition-all duration-150 ${
                    i < ammo
                      ? 'h-full bg-[--neon-blue] shadow-[0_0_4px_var(--neon-blue)]'
                      : 'h-[2px] bg-slate-800'
                  }`}
                />
              ))}
            </div>
            
            <div className="flex items-baseline gap-1 font-mono">
              <span className="hud-text text-4xl font-black text-[--neon-blue] drop-shadow-[0_0_8px_rgba(0,212,255,0.4)]">{ammo}</span>
              <span className="text-xl text-slate-500 font-bold">/</span>
              <span className="text-xl text-slate-400 font-bold">{reserveAmmo}</span>
            </div>
          </div>
          
          {ammo <= 8 && (
            <span className="text-[10px] text-[--neon-red] font-bold tracking-widest uppercase animate-pulse mt-1.5">
              ⚠ LOW AMMO
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
