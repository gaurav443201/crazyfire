import { motion as motionBase } from 'motion/react';
import { useGameStore } from '../../stores/gameStore';
import socketClient from '../../socket/socketClient';

const motion = motionBase as any;

export default function PostGameScreen() {
  const { postGameResult, localPlayer, setScreen, setRoom, setLocalPlayer } = useGameStore();

  if (!postGameResult) return null;

  const handleReturnToLobby = () => {
    socketClient.disconnect();
    setRoom(null);
    setLocalPlayer(null);
    setScreen('landing');
  };

  const isLocalWinner = localPlayer && postGameResult.winner !== 'draw' && localPlayer.team === postGameResult.winner;
  const winnerText = postGameResult.winner === 'draw' 
    ? 'TIE GAME // CO-DEEPEST DRAW' 
    : isLocalWinner 
      ? 'VICTORY SECURED' 
      : 'DEFEAT SUFFERED';

  const sortedPlayers = [...postGameResult.players].sort((a, b) => b.score - a.score);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#050a0f] text-white scanlines overflow-hidden p-4 md:p-8">
      {/* Background neon glows */}
      <div className="absolute inset-0 bg-radial-[circle_at_center,rgba(0,10,20,0)_60%,#050a0f_100%] z-[1] pointer-events-none" />
      <div className={`absolute top-0 left-0 right-0 h-1 transition-colors duration-500 z-10 ${postGameResult.winner === 'draw' ? 'bg-amber-500' : isLocalWinner ? 'bg-[--neon-blue]' : 'bg-[--neon-red]'}`} />

      {/* HEADER DECK */}
      <motion.div 
        initial={{ opacity: 0, y: -25 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center z-10 mb-8"
      >
        <span className="font-rajdhani text-[11px] font-bold tracking-[0.4em] text-slate-400 uppercase">COMMUNICATIONS RE-ESTABLISHED</span>
        <h1 className={`font-orbitron text-4xl md:text-5xl font-black tracking-widest mt-1 uppercase ${postGameResult.winner === 'draw' ? 'text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.4)]' : isLocalWinner ? 'text-[--neon-blue] drop-shadow-[0_0_12px_rgba(0,212,255,0.4)]' : 'text-[--neon-red] drop-shadow-[0_0_12px_rgba(255,45,85,0.4)]'}`}>
          {winnerText}
        </h1>
        <div className="flex justify-center items-center gap-6 mt-4 font-orbitron text-2xl font-bold">
          <span className="text-sky-400">ALPHA: {postGameResult.scores.alpha}</span>
          <span className="text-slate-500 font-normal text-lg">VS</span>
          <span className="text-rose-500">BRAVO: {postGameResult.scores.bravo}</span>
        </div>
      </motion.div>

      {/* MAIN CONTAINER */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 overflow-hidden z-10 max-h-[60%]">
        {/* MVP CARD DECK */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="md:col-span-1 glass bg-slate-950/80 border-glow p-6 rounded-xl flex flex-col justify-between items-center text-center relative overflow-hidden"
        >
          {/* Neon corner lights */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[--neon-blue]" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[--neon-blue]" />

          <span className="font-rajdhani text-xs font-bold tracking-[0.3em] text-[--neon-blue] uppercase">MOST VALUABLE PLAYER</span>
          
          <div className="my-6">
            <div className="w-20 h-20 rounded-full bg-slate-900 border-2 border-glow flex items-center justify-center mx-auto mb-4 relative shadow-[0_0_20px_rgba(0,212,255,0.3)]">
              <span className="font-orbitron font-extrabold text-white text-3xl">
                {postGameResult.mvp ? postGameResult.mvp.username[0].toUpperCase() : 'CF'}
              </span>
              <span className="absolute bottom-[-4px] bg-amber-500 text-black text-[9px] font-black px-2 py-0.5 rounded font-rajdhani border border-slate-950">MVP</span>
            </div>
            <h3 className="font-orbitron text-xl font-bold">{postGameResult.mvp ? postGameResult.mvp.username : 'NO_OPERATOR'}</h3>
            <p className={`font-rajdhani text-[11px] font-bold tracking-widest mt-1 uppercase ${postGameResult.mvp?.team === 'alpha' ? 'text-sky-400' : 'text-rose-500'}`}>
              TEAM {postGameResult.mvp?.team === 'alpha' ? 'ALPHA' : 'BRAVO'}
            </p>
          </div>

          <div className="w-full grid grid-cols-2 gap-4 border-t border-glow/20 pt-4">
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-rajdhani text-slate-400 tracking-wider">ELIMINATIONS</span>
              <span className="text-xl font-bold font-orbitron">{postGameResult.mvp?.kills ?? 0}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-rajdhani text-slate-400 tracking-wider">DEATHS</span>
              <span className="text-xl font-bold font-orbitron">{postGameResult.mvp?.deaths ?? 0}</span>
            </div>
          </div>
        </motion.div>

        {/* COMBAT SCOREBOARD */}
        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="md:col-span-2 glass bg-slate-950/80 border-glow/30 p-5 rounded-xl flex flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-glow/20 pb-3 mb-3 text-xs font-rajdhani font-bold tracking-widest text-slate-400 uppercase">
            <span>OPERATOR CODENAME</span>
            <div className="flex gap-10">
              <span className="w-10 text-center">TEAM</span>
              <span className="w-10 text-center">K</span>
              <span className="w-10 text-center">D</span>
              <span className="w-16 text-right">SCORE</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-2 overflow-y-auto pr-1">
            {sortedPlayers.map((player, idx) => (
              <div 
                key={player.id}
                className={`flex items-center justify-between p-3 rounded-lg border text-sm transition ${player.id === localPlayer?.id ? 'bg-cyan-950/20 border-sky-500/40 shadow-[inset_0_0_8px_rgba(0,170,255,0.1)]' : 'bg-slate-900/30 border-slate-800'}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 font-mono font-bold w-4">#{idx + 1}</span>
                  <span className="font-semibold">{player.username}</span>
                </div>

                <div className="flex gap-10 font-mono text-xs">
                  <span className={`w-10 text-center font-bold font-rajdhani ${player.team === 'alpha' ? 'text-sky-400' : 'text-rose-500'}`}>
                    {player.team.toUpperCase()}
                  </span>
                  <span className="w-10 text-center text-white font-bold">{player.kills}</span>
                  <span className="w-10 text-center text-slate-400">{player.deaths}</span>
                  <span className="w-16 text-right text-[--neon-blue] font-bold">{player.score}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* FOOTER ACTIONS */}
      <motion.div 
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="z-10 mt-8"
      >
        <button 
          onClick={handleReturnToLobby}
          className="btn-primary px-10 py-4 tracking-widest font-black"
        >
          RETURN TO LANDING DECK
        </button>
      </motion.div>
    </div>
  );
}
