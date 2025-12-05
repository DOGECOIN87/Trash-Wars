import React, { useState } from 'react';
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
  };

  return (
    <div className="w-full h-screen overflow-hidden bg-zinc-950">
      
      {gameState === GameState.MENU && (
        <MainMenu 
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

      {(gameState === GameState.PLAYING || gameState === GameState.CASHED_OUT || gameState === GameState.GAME_OVER) && (
        <div className="relative w-full h-full">
            <GameCanvas 
              gameState={gameState === GameState.CASHED_OUT ? GameState.PLAYING : gameState} 
              setGameState={handleStateChange} 
              setScore={setScore}
              playerName={playerName}
              playerColor={playerColor}
              playerAvatar={playerAvatar}
              wager={wager}
              onLootCollected={handleLootCollected}
            />
            
            {/* HUD: Score / Gorbag */}
            <div className="fixed top-4 left-4 z-20 pointer-events-none flex flex-col gap-4">
                
                {/* Stats Card */}
                <div className="bg-zinc-900/80 backdrop-blur-md p-4 rounded-xl border border-zinc-700 text-white shadow-xl flex flex-col gap-1 min-w-[200px]">
                    <div className="flex justify-between items-center text-xs text-zinc-400 uppercase tracking-widest font-mono">
                        <span>Current Mass</span>
                    </div>
                    <div className="text-3xl font-black font-sans text-white">
                        {Math.floor(score).toLocaleString()}
                    </div>
                    
                    <div className="h-px bg-zinc-700 my-2"></div>
                    
                    <div className="flex justify-between items-center text-xs text-purple-400 uppercase tracking-widest font-mono">
                         <span>Value</span>
                         <Coins size={14}/>
                    </div>
                    <div className="text-xl font-bold font-mono text-purple-300">
                        ≈ {(score * 0.0001).toFixed(4)} SOL
                    </div>
                    
                    {/* Visual Indicator of Wager threshold */}
                    <div className="mt-2 h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                       <div className="h-full bg-gradient-to-r from-green-500 to-purple-500 transition-all duration-300" 
                            style={{ width: `${Math.min((score / 1000) * 100, 100)}%` }}></div>
                    </div>
                </div>

                {/* Active Gorbag HUD */}
                <div className={`bg-black/60 backdrop-blur-md p-3 rounded-xl border ${sessionLoot.length > 0 ? 'border-yellow-500/50' : 'border-zinc-800'} text-white shadow-xl flex items-center gap-4 transition-all`}>
                    <div className="relative">
                        <Backpack size={24} className={sessionLoot.length > 0 ? "text-yellow-400" : "text-zinc-600"} />
                        {sessionLoot.length > 0 && (
                            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                                {sessionLoot.length}
                            </div>
                        )}
                    </div>
                    <div>
                         <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-mono">GORBAG</div>
                         <div className="text-sm font-bold flex items-center gap-1">
                             {sessionLoot.length === 0 ? <span className="text-zinc-600 italic">Empty</span> : (
                                 <span className="text-yellow-400">{sessionLoot.length} Rare Items</span>
                             )}
                         </div>
                    </div>
                </div>

            </div>
        </div>
      )}

    </div>
  );
};

export default App;