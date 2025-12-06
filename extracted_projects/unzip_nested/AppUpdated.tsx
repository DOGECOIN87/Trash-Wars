import React, { useState } from 'react';
import { WalletProvider } from './providers/WalletProvider';
import GameCanvas from './components/GameCanvas';
import MainMenuUpdated from './components/MainMenuUpdated';
import { GameState, LootItem } from './types';
import { Coins, Backpack, Gem } from 'lucide-react';

const AppContent: React.FC = () => {
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
  };

  return (
    <div className="relative w-full h-screen bg-slate-950 overflow-hidden">
      {gameState === GameState.MENU && (
        <MainMenuUpdated
          setGameState={setGameState}
          setPlayerName={setPlayerName}
          setPlayerColor={setPlayerColor}
          setPlayerAvatar={setPlayerAvatar}
          setWager={setWager}
          playerName={playerName}
          playerColor={playerColor}
          playerAvatar={playerAvatar}
          wager={wager}
          inventory={persistentInventory}
        />
      )}

      {gameState === GameState.PLAYING && (
        <>
          <GameCanvas 
            setScore={setScore}
            setGameState={handleStateChange}
            playerName={playerName}
            playerColor={playerColor}
            playerAvatar={playerAvatar}
            wager={wager}
            onLootCollected={handleLootCollected}
          />
          
          {/* Session Loot HUD */}
          {sessionLoot.length > 0 && (
            <div className="absolute top-24 left-4 bg-black/80 backdrop-blur-sm border border-purple-500/50 rounded-lg p-3 max-w-xs">
              <div className="flex items-center gap-2 mb-2">
                <Backpack size={16} className="text-purple-400" />
                <span className="text-purple-400 font-bold text-sm">SESSION LOOT</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {sessionLoot.slice(-6).map((item, i) => (
                  <div 
                    key={i} 
                    className="text-lg" 
                    title={`${item.name} (+${item.value} mass)`}
                  >
                    {item.emoji}
                  </div>
                ))}
                {sessionLoot.length > 6 && (
                  <div className="text-xs text-white/60 self-center">
                    +{sessionLoot.length - 6} more
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <WalletProvider>
      <AppContent />
    </WalletProvider>
  );
};

export default App;
