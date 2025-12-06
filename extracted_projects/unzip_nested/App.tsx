import GameCanvas from './components/GameCanvas';
import MainMenu from './components/MainMenu';
import { GameState, LootItem } from './types';
import { Coins, Backpack, Gem } from 'lucide-react';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [score, setScore] = useState(0);
  const [playerName, setPlayerName] = useState("");
  const [playerColor, setPlayerColor] = useState('#4ade80');
  const [playerAvatar, setPlayerAvatar] = useState<string | null>(null);
  const [wager, setWager] = useState(50); // Represents roughly 0.05 SOL scale
  const [sessionLoot, setSessionLoot] = useState<LootItem[]>([]);
  const [persistentInventory, setPersistentInventory] = useState<LootItem[]>([]);

  const handleLootCollected = (item: LootItem) => {
    setSessionLoot(prev => [...prev, item]);
  };

  const handleGameOver = () => {
    // Session loot is lost on death
    setTimeout(() => {
        alert(`GAME OVER\n\nYou were consumed. ${sessionLoot.length} items in your Gorbag were incinerated.`);
        setSessionLoot([]);
        setGameState(GameState.MENU);
        setScore(0);
    }, 100);
  };

  const handleCashOut = () => {
      // Session loot is saved
      const multiplier = score / 500; 
      const winnings = (wager/1000) * multiplier;
      
      const newInventory = [...persistentInventory, ...sessionLoot];
      setPersistentInventory(newInventory);
      
      setTimeout(() => {
          alert(`PORTAL EXTRACTION SUCCESSFUL!\n\nMass: ${Math.floor(score)}\nPayout: ${winnings.toFixed(4)} SOL\nLoot Secured: ${sessionLoot.length} items\n\nTransaction sent to wallet.`);
          setSessionLoot([]);
          setGameState(GameState.MENU);
          setScore(0);
      }, 100);
  };

  const handleStateChange = (newState: GameState) => {
      if (newState === GameState.GAME_OVER) handleGameOver();
      else if (newState === GameState.CASHED_OUT) handleCashOut();
      else setGameState(newState);