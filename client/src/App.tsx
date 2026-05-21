import { useEffect } from 'react';
import { useGameStore } from './stores/gameStore';
import LandingPage from './components/Landing/LandingPage';
import LobbyScreen from './components/Lobby/LobbyScreen';
import GameCanvas from './components/Game/GameCanvas';
import PostGameScreen from './components/PostGame/PostGameScreen';
import MatchmakingScreen from './components/Matchmaking/MatchmakingScreen';
import socketClient from './socket/socketClient';
import { AnimatePresence } from 'motion/react';

function App() {
  const { screen, setOnlineCount, setRoom, setLocalPlayer, setScreen,
    addKillEvent, setScores, setPostGameResult, removeRemotePlayer } = useGameStore();

  useEffect(() => {
    const socket = socketClient.connect();

    socket.on('server:online_count', ({ count }: { count: number }) => setOnlineCount(count));

    socket.on('room:created', ({ room, player }: any) => {
      setRoom(room);
      setLocalPlayer(player);
      setScreen('lobby');
    });

    socket.on('room:joined', ({ room, player }: any) => {
      setRoom(room);
      setLocalPlayer(player);
      setScreen('lobby');
    });

    socket.on('room:error', ({ message }: { message: string }) => {
      alert(message);
    });

    socket.on('room:kicked', () => {
      setRoom(null);
      setLocalPlayer(null);
      setScreen('landing');
      alert('You were kicked from the room.');
    });

    socket.on('game:start', ({ scores }: any) => {
      setScores(scores);
      setScreen('game');
    });

    socket.on('player:killed', ({ killFeed, scores, ...kill }: any) => {
      addKillEvent(kill);
      setScores(scores);
    });

    socket.on('room:player_left', ({ id }: { id: string }) => {
      removeRemotePlayer(id);
      const currentRoom = useGameStore.getState().room;
      if (currentRoom) {
        setRoom({
          ...currentRoom,
          players: currentRoom.players.filter(p => p.id !== id)
        });
      }
    });

    socket.on('game:end', (result: any) => {
      setPostGameResult(result);
      setScreen('postgame');
    });

    return () => {
      socket.off('server:online_count');
      socket.off('room:created');
      socket.off('room:joined');
      socket.off('room:error');
      socket.off('room:kicked');
      socket.off('game:start');
      socket.off('player:killed');
      socket.off('room:player_left');
      socket.off('game:end');
    };
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#050a0f' }}>
      <AnimatePresence mode="wait">
        {screen === 'landing' && <LandingPage key="landing" />}
        {screen === 'matchmaking' && <MatchmakingScreen key="matchmaking" />}
        {screen === 'lobby' && <LobbyScreen key="lobby" />}
        {screen === 'game' && <GameCanvas key="game" />}
        {screen === 'postgame' && <PostGameScreen key="postgame" />}
      </AnimatePresence>
    </div>
  );
}

export default App;
