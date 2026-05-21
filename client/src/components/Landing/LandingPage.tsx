import { useState } from 'react';
import { motion as motionBase, AnimatePresence } from 'motion/react';
import { useGameStore } from '../../stores/gameStore';

const motion = motionBase as any;
import socketClient from '../../socket/socketClient';
import AnimatedBackground from './AnimatedBackground';

export default function LandingPage() {
  const { username, setUsername, onlineCount, setScreen } = useGameStore();
  const [tempName, setTempName] = useState(username || localStorage.getItem('cf_username') || '');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handlePlay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempName.trim()) {
      setErrorMsg('Please enter a username');
      return;
    }
    setErrorMsg('');
    const finalName = tempName.trim();
    setUsername(finalName);
    localStorage.setItem('cf_username', finalName);

    // Transition to matchmaking
    setScreen('matchmaking');
    socketClient.emit('matchmaking:join', { username: finalName });
  };

  const handleCreatePrivate = () => {
    if (!tempName.trim()) {
      setErrorMsg('Please enter a username');
      return;
    }
    setErrorMsg('');
    const finalName = tempName.trim();
    setUsername(finalName);
    localStorage.setItem('cf_username', finalName);
    
    // Create private room with default settings (factory map, 5 min duration)
    socketClient.emit('room:create', { username: finalName, map: 'factory', duration: 5 });
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempName.trim()) {
      setErrorMsg('Please enter a username');
      return;
    }
    if (!joinCode.trim() || joinCode.length !== 5) {
      setErrorMsg('Enter a valid 5-digit code');
      return;
    }
    setErrorMsg('');
    const finalName = tempName.trim();
    setUsername(finalName);
    localStorage.setItem('cf_username', finalName);

    socketClient.emit('room:join_code', { username: finalName, code: joinCode.trim() });
  };

  return (
    <div className="relative w-full h-full flex items-center justify-between px-8 md:px-16 text-white overflow-hidden scanlines">
      {/* 3D Animated Background */}
      <AnimatedBackground />

      {/* LEFT SIDE PANEL: Challenges & News */}
      <motion.div 
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="hidden lg:flex flex-col gap-6 w-80 h-[80%] glass p-6 self-center animate-slide-left z-10"
      >
        <div className="flex items-center justify-between border-b border-glow pb-3">
          <span className="font-rajdhani text-lg font-bold tracking-widest text-white uppercase">MISSION HUB</span>
          <span className="text-xs font-rajdhani text-[--neon-blue] px-2 py-0.5 border border-glow rounded bg-cyan-950/40">DAILY</span>
        </div>

        {/* Daily Challenges */}
        <div className="flex flex-col gap-4 overflow-y-auto pr-1">
          <div className="p-3 bg-[#0d1e2e]/60 border border-glow/20 rounded-md hover:border-glow/50 transition">
            <p className="text-xs font-rajdhani text-slate-400">TDM MASTER</p>
            <p className="text-sm font-semibold mt-1">Get 15 kills in a single match</p>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-[--neon-blue] h-full" style={{ width: '40%' }}></div>
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>6/15 Kills</span>
              <span className="text-[--neon-blue]">+150 XP</span>
            </div>
          </div>

          <div className="p-3 bg-[#0d1e2e]/60 border border-glow/20 rounded-md hover:border-glow/50 transition">
            <p className="text-xs font-rajdhani text-slate-400">DEADSHOT</p>
            <p className="text-sm font-semibold mt-1">Land 5 headshots with M4A1</p>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-[--neon-blue] h-full" style={{ width: '80%' }}></div>
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>4/5 Headshots</span>
              <span className="text-[--neon-blue]">+100 XP</span>
            </div>
          </div>
        </div>

        {/* News Feed */}
        <div className="mt-auto border-t border-glow pt-4">
          <span className="font-rajdhani text-sm font-bold tracking-wider text-slate-400 block mb-2">SYSTEM PATCH 1.0.4</span>
          <p className="text-xs text-slate-300 leading-relaxed">
            • Added Rooftop cyberpunk layout<br />
            • SMG recoil dynamic adjustment<br />
            • New adaptive mobile HUD presets
          </p>
        </div>
      </motion.div>

      {/* CENTER PANEL: Main Play Interface */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center justify-center flex-1 max-w-lg mx-auto z-10 p-6 glass rounded-2xl border-2 border-glow shadow-[0_0_30px_rgba(0,212,255,0.15)] bg-slate-950/80 backdrop-blur-xl"
      >
        {/* Game Title Logo */}
        <div className="text-center mb-8 select-none">
          <h1 className="font-orbitron text-5xl md:text-6xl font-extrabold tracking-tighter text-white drop-shadow-[0_0_12px_rgba(0,212,255,0.5)]">
            CRAZY<span className="text-[--neon-red] drop-shadow-[0_0_12px_rgba(255,45,85,0.5)]">FIRE</span>
          </h1>
          <p className="font-rajdhani text-sm tracking-[0.3em] text-[--neon-blue] mt-2 uppercase animate-pulse">
            AUTHORITATIVE MULTIPLAYER FPS
          </p>
        </div>

        {/* Play Action Form */}
        <form onSubmit={handlePlay} className="w-full flex flex-col gap-4">
          <div>
            <label className="block text-xs font-rajdhani font-bold tracking-widest text-slate-400 mb-1.5 uppercase">
              OPERATOR USERNAME
            </label>
            <input
              type="text"
              placeholder="ENTER CODENAME..."
              maxLength={14}
              value={tempName}
              onChange={(e) => {
                setTempName(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              className="input-neon text-center font-rajdhani text-xl tracking-wider py-3"
            />
            {errorMsg && (
              <p className="text-xs text-[--neon-red] font-rajdhani mt-1.5 text-center tracking-wide uppercase">
                ⚠ {errorMsg}
              </p>
            )}
          </div>

          <button type="submit" className="btn-primary w-full py-4 text-xl tracking-widest font-black select-none mt-2">
            LAUNCH MATCH
          </button>
        </form>

        {/* Private / Join Lobby options */}
        <div className="grid grid-cols-2 gap-4 w-full mt-4">
          <button 
            onClick={handleCreatePrivate}
            className="btn-secondary w-full flex flex-col items-center py-3 px-2 font-bold group border-glow/30 hover:border-glow"
          >
            <span className="text-[10px] text-slate-400 tracking-wider">HOST PRIVATE</span>
            <span className="text-sm text-white tracking-widest mt-0.5 group-hover:text-[--neon-blue] transition">CREATE ROOM</span>
          </button>
          <button 
            onClick={() => {
              if (!tempName.trim()) {
                setErrorMsg('Please enter a username');
                return;
              }
              setShowJoinModal(true);
            }}
            className="btn-secondary w-full flex flex-col items-center py-3 px-2 font-bold group border-glow/30 hover:border-glow"
          >
            <span className="text-[10px] text-slate-400 tracking-wider">INVITE CODE</span>
            <span className="text-sm text-white tracking-widest mt-0.5 group-hover:text-[--neon-blue] transition">JOIN MATCH</span>
          </button>
        </div>

        {/* Sub-Actions */}
        <div className="flex gap-6 mt-8 text-xs font-rajdhani text-slate-400 tracking-widest font-semibold uppercase">
          <button className="hover:text-[--neon-blue] transition">CROSSHAIR SETUP</button>
          <span>|</span>
          <button className="hover:text-[--neon-blue] transition">LEADERBOARDS</button>
          <span>|</span>
          <button className="hover:text-[--neon-blue] transition">SETTINGS</button>
        </div>

        {/* Global Online Info */}
        <div className="mt-6 text-center">
          <span className="inline-flex items-center gap-2 text-xs font-rajdhani tracking-widest text-slate-400">
            <span className="w-2 h-2 rounded-full bg-[--neon-green] animate-pulse"></span>
            ACTIVE NET OPERATORS: <span className="text-[--neon-blue] font-bold">{onlineCount || 1}</span>
          </span>
        </div>
      </motion.div>

      {/* RIGHT SIDE PANEL: Friends & Invitations */}
      <motion.div 
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="hidden lg:flex flex-col gap-6 w-80 h-[80%] glass p-6 self-center animate-slide-right z-10"
      >
        <div className="flex items-center justify-between border-b border-glow pb-3">
          <span className="font-rajdhani text-lg font-bold tracking-widest text-white uppercase">OPERATOR SOCIAL</span>
          <span className="text-xs font-rajdhani text-slate-400">ONLINE</span>
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto">
          {/* Mock Friends */}
          <div className="flex items-center justify-between p-2.5 rounded bg-[#0d1e2e]/40 border border-glow/10 hover:bg-[#0d1e2e]/70 transition">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-[--neon-green]" />
              <span className="text-sm font-semibold tracking-wide">Viper_Specter</span>
            </div>
            <span className="text-[10px] font-rajdhani text-slate-400">IN LOBBY</span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded bg-[#0d1e2e]/40 border border-glow/10 hover:bg-[#0d1e2e]/70 transition">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-[--neon-green]" />
              <span className="text-sm font-semibold tracking-wide">CypherFPS</span>
            </div>
            <span className="text-[10px] font-rajdhani text-emerald-400 font-bold">PLAYING</span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded bg-[#0d1e2e]/20 border border-glow/5 opacity-55">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-slate-500" />
              <span className="text-sm font-semibold tracking-wide">NeonRush</span>
            </div>
            <span className="text-[10px] font-rajdhani text-slate-500">OFFLINE</span>
          </div>
        </div>

        <div className="mt-auto bg-[#ff2d55]/10 border border-[#ff2d55]/30 p-3.5 rounded-lg flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold font-rajdhani text-[--neon-red] tracking-wider uppercase">LOBBY INVITE</span>
            <span className="text-[9px] bg-[#ff2d55]/20 text-[--neon-red] px-1.5 py-0.5 rounded font-mono">1m ago</span>
          </div>
          <p className="text-xs text-slate-300">
            <span className="font-bold text-white">Viper_Specter</span> invited you to join Alpha Team.
          </p>
          <button className="btn-secondary w-full py-1 text-[10px] border-[#ff2d55]/40 text-[--neon-red] hover:bg-[#ff2d55]/10 hover:border-[--neon-red] mt-1 tracking-widest font-bold">
            ACCEPT INVITE
          </button>
        </div>
      </motion.div>

      {/* JOIN BY CODE MODAL */}
      <AnimatePresence>
        {showJoinModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center bg-black/85 backdrop-blur-md z-50 p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-sm glass bg-[#0a1520] border-2 border-glow p-6 rounded-xl flex flex-col gap-5 shadow-[0_0_50px_rgba(0,212,255,0.3)] relative"
            >
              {/* Close Button */}
              <button 
                onClick={() => {
                  setShowJoinModal(false);
                  setErrorMsg('');
                }}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition text-lg"
              >
                ✕
              </button>

              <div className="text-center">
                <h3 className="font-orbitron text-xl font-bold tracking-wider text-white">JOIN PRIVATE ROOM</h3>
                <p className="font-rajdhani text-xs text-slate-400 tracking-widest uppercase mt-1">ENTER the 5-digit match code</p>
              </div>

              <form onSubmit={handleJoinByCode} className="flex flex-col gap-4">
                <input
                  type="text"
                  placeholder="EX: 48372"
                  maxLength={5}
                  value={joinCode}
                  onChange={(e) => {
                    setJoinCode(e.target.value.replace(/\D/g, ''));
                    if (errorMsg) setErrorMsg('');
                  }}
                  className="input-neon text-center font-rajdhani text-2xl tracking-widest py-3 font-bold uppercase"
                />
                
                {errorMsg && (
                  <p className="text-xs text-[--neon-red] font-rajdhani text-center tracking-wide uppercase">
                    ⚠ {errorMsg}
                  </p>
                )}

                <div className="flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowJoinModal(false);
                      setErrorMsg('');
                    }}
                    className="btn-secondary flex-1 py-2 text-sm"
                  >
                    CANCEL
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary flex-1 py-2 text-sm tracking-widest"
                  >
                    CONNECT
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
