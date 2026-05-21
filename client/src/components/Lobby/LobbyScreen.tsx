import { useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';
import socketClient from '../../socket/socketClient';

export default function LobbyScreen() {
  const { room, localPlayer, setRoom } = useGameStore();

  useEffect(() => {
    const socket = socketClient.connect();

    socket.on('room:player_joined', ({ player }: any) => {
      const currentRoom = useGameStore.getState().room;
      if (currentRoom) {
        setRoom({
          ...currentRoom,
          players: [...currentRoom.players.filter(p => p.id !== player.id), player]
        });
      }
    });

    socket.on('lobby:player_ready', ({ id, isReady }: { id: string; isReady: boolean }) => {
      const currentRoom = useGameStore.getState().room;
      if (currentRoom) {
        setRoom({
          ...currentRoom,
          players: currentRoom.players.map(p => p.id === id ? { ...p, isReady } : p)
        });
      }
    });

    socket.on('lobby:team_switched', ({ id, team }: { id: string; team: 'alpha' | 'bravo' }) => {
      const currentRoom = useGameStore.getState().room;
      if (currentRoom) {
        setRoom({
          ...currentRoom,
          players: currentRoom.players.map(p => p.id === id ? { ...p, team } : p)
        });
      }
    });

    socket.on('lobby:map_changed', ({ map }: { map: string }) => {
      const currentRoom = useGameStore.getState().room;
      if (currentRoom) {
        setRoom({ ...currentRoom, map });
      }
    });

    socket.on('lobby:duration_changed', ({ duration }: { duration: number }) => {
      const currentRoom = useGameStore.getState().room;
      if (currentRoom) {
        setRoom({ ...currentRoom, duration });
      }
    });

    return () => {
      socket.off('room:player_joined');
      socket.off('lobby:player_ready');
      socket.off('lobby:team_switched');
      socket.off('lobby:map_changed');
      socket.off('lobby:duration_changed');
    };
  }, [setRoom]);

  if (!room || !localPlayer) return null;

  const isHost = room.hostId === localPlayer.id;
  const alphaPlayers = room.players.filter(p => p.team === 'alpha');
  const bravoPlayers = room.players.filter(p => p.team === 'bravo');

  const toggleReady = () => {
    socketClient.emit('lobby:ready');
  };

  const switchTeam = () => {
    socketClient.emit('lobby:switch_team');
  };

  const handleStartGame = () => {
    socketClient.emit('lobby:start');
  };

  const changeMap = (mapName: string) => {
    if (!isHost) return;
    socketClient.emit('lobby:set_map', { map: mapName });
  };

  const changeDuration = (mins: number) => {
    if (!isHost) return;
    socketClient.emit('lobby:set_duration', { duration: mins });
  };

  const handleKick = (playerId: string) => {
    if (!isHost) return;
    socketClient.emit('lobby:kick', { targetId: playerId });
  };

  const copyInvite = () => {
    const text = `CRAZYFIRE.gg/join/${room.code}`;
    navigator.clipboard.writeText(text);
    alert('Invite link copied: ' + text);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#050a0f] text-white scanlines overflow-hidden p-6 md:p-8">
      {/* HEADER ROW */}
      <div className="flex flex-col md:flex-row items-center justify-between border-b border-glow pb-4 mb-6 gap-4">
        <div>
          <span className="font-rajdhani text-[11px] font-bold tracking-[0.3em] text-[--neon-blue] uppercase">MATCHMAKING STAGING DECK</span>
          <h1 className="font-orbitron text-2xl md:text-3xl font-extrabold tracking-wider">
            TACTICAL DEPLOYMENT ROOM
          </h1>
        </div>

        {/* Invite link and Code displays */}
        <div className="flex gap-3">
          <div className="flex flex-col items-end bg-slate-900 border border-glow/20 px-4 py-2 rounded-lg font-mono">
            <span className="text-[9px] font-rajdhani text-slate-400 uppercase tracking-widest">INVITE CODE</span>
            <span className="text-xl font-bold tracking-widest text-[--neon-blue]">{room.code}</span>
          </div>
          <button 
            onClick={copyInvite}
            className="btn-secondary flex items-center gap-2 self-stretch px-4 py-2"
          >
            COPY LINK
          </button>
        </div>
      </div>

      {/* LOBBY INTERFACE */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-hidden">
        {/* TEAM ALPHA (BLUE) */}
        <div className="lg:col-span-1.5 flex flex-col gap-4 overflow-hidden">
          <div className="flex items-center justify-between bg-sky-950/40 border border-sky-500/30 p-3 rounded-lg">
            <span className="font-orbitron font-extrabold tracking-widest text-sky-400">TEAM ALPHA</span>
            <span className="font-rajdhani text-xs px-2 py-0.5 bg-sky-500/20 rounded font-bold">{alphaPlayers.length} OPERATORS</span>
          </div>

          <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
            {alphaPlayers.map((player) => (
              <div 
                key={player.id}
                className={`flex items-center justify-between p-3.5 bg-slate-950/50 border border-sky-500/15 rounded-lg hover:border-sky-500/40 transition relative group ${player.id === localPlayer.id ? 'shadow-[inset_0_0_8px_rgba(0,170,255,0.15)] border-sky-500/40' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded border border-sky-400/40 bg-sky-950/40 flex items-center justify-center font-bold text-sky-400">
                    {player.username[0].toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold tracking-wide flex items-center gap-1.5">
                      {player.username}
                      {player.id === room.hostId && (
                        <span className="text-[8px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1 py-0.2 rounded uppercase font-bold tracking-widest font-rajdhani">HOST</span>
                      )}
                    </span>
                    <span className="text-[10px] text-sky-400 font-rajdhani font-semibold tracking-wider">LOADOUT: M4A1 // {player.ping}ms</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-rajdhani font-extrabold tracking-widest px-2 py-0.5 rounded ${player.isReady ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                    {player.isReady ? 'READY' : 'PREPPING'}
                  </span>
                  
                  {isHost && player.id !== localPlayer.id && (
                    <button 
                      onClick={() => handleKick(player.id)}
                      className="text-slate-500 hover:text-[--neon-red] transition text-xs opacity-0 group-hover:opacity-100 font-bold"
                    >
                      KICK
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* GAME SETTINGS AND PRESET HOST PANEL */}
        <div className="lg:col-span-1 flex flex-col gap-5 glass p-5 bg-slate-950/80 border-glow/30">
          <div>
            <h3 className="font-orbitron text-xs font-black tracking-widest text-slate-400 uppercase mb-3">DEPLOYMENT ZONE</h3>
            <div className="flex flex-col gap-2">
              <div 
                onClick={() => changeMap('factory')}
                className={`map-card h-20 bg-cover bg-center flex items-end p-2 ${room.map === 'factory' ? 'selected' : ''}`}
                style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.8)), url("https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=300")' }}
              >
                <div className="flex flex-col">
                  <span className="text-xs font-bold font-orbitron tracking-wide text-white">FACTORY</span>
                  <span className="text-[9px] font-rajdhani text-slate-400">Industrial Warehouse</span>
                </div>
              </div>

              <div 
                onClick={() => changeMap('rooftop')}
                className={`map-card h-20 bg-cover bg-center flex items-end p-2 ${room.map === 'rooftop' ? 'selected' : ''}`}
                style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.8)), url("https://images.unsplash.com/photo-1542838132-92c53300491e?w=300")' }}
              >
                <div className="flex flex-col">
                  <span className="text-xs font-bold font-orbitron tracking-wide text-white">ROOFTOP</span>
                  <span className="text-[9px] font-rajdhani text-slate-400">Neon City Skyscraper</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-orbitron text-xs font-black tracking-widest text-slate-400 uppercase mb-3">TIME CONTRACT</h3>
            <div className="grid grid-cols-3 gap-2">
              {[5, 10, 15].map((mins) => (
                <button
                  key={mins}
                  onClick={() => changeDuration(mins)}
                  className={`py-1.5 px-1 font-rajdhani text-sm font-bold border rounded transition uppercase ${room.duration === mins ? 'border-[--neon-blue] text-[--neon-blue] bg-cyan-950/20' : 'border-slate-800 text-slate-400 hover:text-white'}`}
                >
                  {mins} MIN
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto flex flex-col gap-3">
            <button 
              onClick={switchTeam}
              className="btn-secondary w-full py-2.5 font-bold tracking-wider"
            >
              SWITCH SIDES
            </button>
            <button 
              onClick={toggleReady}
              className={`w-full py-3.5 text-base tracking-widest font-black uppercase rounded-lg border transition ${localPlayer.isReady ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-amber-500/30'}`}
            >
              {localPlayer.isReady ? 'CANCEL DEPLOYMENT' : 'CONFIRM DEPLOYMENT'}
            </button>

            {isHost && (
              <button 
                onClick={handleStartGame}
                disabled={!room.players.every(p => p.isReady || p.id === room.hostId)}
                className="btn-primary w-full py-3.5 mt-2 tracking-widest font-extrabold select-none disabled:opacity-40 disabled:pointer-events-none"
              >
                DEPLOY NOW
              </button>
            )}
          </div>
        </div>

        {/* TEAM BRAVO (RED) */}
        <div className="lg:col-span-1.5 flex flex-col gap-4 overflow-hidden">
          <div className="flex items-center justify-between bg-rose-950/40 border border-rose-500/30 p-3 rounded-lg">
            <span className="font-orbitron font-extrabold tracking-widest text-rose-400">TEAM BRAVO</span>
            <span className="font-rajdhani text-xs px-2 py-0.5 bg-rose-500/20 rounded font-bold">{bravoPlayers.length} OPERATORS</span>
          </div>

          <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1">
            {bravoPlayers.map((player) => (
              <div 
                key={player.id}
                className={`flex items-center justify-between p-3.5 bg-slate-950/50 border border-rose-500/15 rounded-lg hover:border-rose-500/40 transition relative group ${player.id === localPlayer.id ? 'shadow-[inset_0_0_8px_rgba(255,51,68,0.15)] border-rose-500/40' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded border border-rose-400/40 bg-rose-950/40 flex items-center justify-center font-bold text-rose-400">
                    {player.username[0].toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold tracking-wide flex items-center gap-1.5">
                      {player.username}
                      {player.id === room.hostId && (
                        <span className="text-[8px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1 py-0.2 rounded uppercase font-bold tracking-widest font-rajdhani">HOST</span>
                      )}
                    </span>
                    <span className="text-[10px] text-rose-400 font-rajdhani font-semibold tracking-wider">LOADOUT: Vector // {player.ping}ms</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-rajdhani font-extrabold tracking-widest px-2 py-0.5 rounded ${player.isReady ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                    {player.isReady ? 'READY' : 'PREPPING'}
                  </span>
                  
                  {isHost && player.id !== localPlayer.id && (
                    <button 
                      onClick={() => handleKick(player.id)}
                      className="text-slate-500 hover:text-[--neon-red] transition text-xs opacity-0 group-hover:opacity-100 font-bold"
                    >
                      KICK
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
