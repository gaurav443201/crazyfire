import { useEffect, useState } from 'react';
import { motion as motionBase, AnimatePresence } from 'motion/react';
import { useGameStore } from '../../stores/gameStore';

const motion = motionBase as any;

export default function MatchmakingScreen() {
  const { username } = useGameStore();
  const [dots, setDots] = useState('');
  const [matchFound] = useState(false);

  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);

    return () => clearInterval(dotInterval);
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-[#050a0f] text-white scanlines overflow-hidden">
      {/* Dynamic ambient grid background */}
      <div className="absolute inset-0 bg-radial-[circle_at_center,rgba(0,10,20,0)_60%,#050a0f_100%] z-[1] pointer-events-none" />
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'radial-gradient(var(--neon-blue) 1px, transparent 0)',
          backgroundSize: '24px 24px'
        }}
      />

      <AnimatePresence mode="wait">
        {!matchFound ? (
          <motion.div 
            key="searching"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="flex flex-col items-center z-10 p-8 glass max-w-md w-full mx-4 border-2 border-glow shadow-[0_0_50px_rgba(0,212,255,0.1)] bg-slate-950/80 rounded-2xl"
          >
            {/* Hologram Radar Pulse */}
            <div className="relative w-36 h-36 flex items-center justify-center mb-8">
              <span className="absolute inset-0 rounded-full border border-glow/30 animate-ping"></span>
              <span className="absolute inset-4 rounded-full border border-glow/40 animate-ping" style={{ animationDelay: '0.4s' }}></span>
              <span className="absolute inset-8 rounded-full border border-glow/50 animate-ping" style={{ animationDelay: '0.8s' }}></span>
              
              <div className="w-16 h-16 rounded-full border-2 border-glow flex items-center justify-center bg-cyan-950/20 shadow-[0_0_20px_rgba(0,212,255,0.2)]">
                <span className="font-orbitron font-extrabold text-[--neon-blue] text-xl animate-pulse">CF</span>
              </div>
            </div>

            <h2 className="font-orbitron text-2xl font-bold tracking-widest text-center text-white">
              SEARCHING LOBBIES{dots}
            </h2>
            <p className="font-rajdhani text-xs tracking-[0.2em] text-slate-400 text-center mt-1 uppercase">
              ESTABLISHING ENCRYPTED DATALINK
            </p>

            <div className="w-full bg-slate-900 border border-glow/15 h-2 rounded-full mt-6 overflow-hidden relative">
              <div className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-[--neon-blue] to-[#0066cc] rounded-full animate-[loading-bar_2s_infinite]" style={{ width: '40%' }}></div>
            </div>

            {/* Operator Details */}
            <div className="w-full mt-6 p-4 rounded-lg bg-[#0d1e2e]/50 border border-glow/10 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-rajdhani text-slate-400 tracking-wider">ACTIVE OPERATOR</span>
                <span className="text-sm font-bold tracking-wide mt-0.5">{username || 'GUEST_OPERATOR'}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-rajdhani text-slate-400 tracking-wider">NET REGION</span>
                <span className="text-xs font-bold text-[--neon-blue] mt-0.5 font-mono">US-WEST // 24ms</span>
              </div>
            </div>
            
            <button 
              onClick={() => window.location.reload()}
              className="btn-secondary w-full mt-6 py-2.5 text-xs font-bold border-glow/20 text-slate-400 hover:text-white"
            >
              CANCEL QUEUE
            </button>
          </motion.div>
        ) : (
          <motion.div 
            key="found"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center z-10"
          >
            <motion.h1 
              initial={{ scale: 0.8, letterSpacing: '0.1em' }}
              animate={{ scale: [1, 1.1, 1], letterSpacing: '0.3em' }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="font-orbitron text-5xl md:text-6xl font-black text-[--neon-blue] tracking-[0.3em] drop-shadow-[0_0_20px_rgba(0,212,255,0.7)] uppercase text-center"
            >
              MATCH FOUND
            </motion.h1>
            <p className="font-rajdhani text-sm tracking-[0.4em] text-slate-400 text-center mt-3 uppercase animate-pulse">
              SYNCING WORLD GENERATION LAYER
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
