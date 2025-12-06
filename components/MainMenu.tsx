import React, { useState, useEffect, useRef } from 'react';
import anime from 'animejs';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { GameState, LootItem } from '../types';
import { generateMarketUpdate } from '../services/geminiService';
import { useGameSession } from '../hooks/useGameSession';
import { Wallet, Check, Zap, Upload, Globe, ShieldCheck, Backpack, X, Gem, ScanLine, Crosshair, Cpu, ChevronRight, BarChart3, Database, Lock, AlertTriangle } from 'lucide-react';

interface MainMenuProps {
  setGameState: (state: GameState) => void;
  setPlayerName: (name: string) => void;
  setPlayerColor: (color: string) => void;
  setPlayerAvatar: (avatar: string | null) => void;
  setWager: (amount: number) => void;
  playerName: string;
  playerColor: string;
  playerAvatar: string | null;
  wager: number;
  inventory: LootItem[];
}

type MenuStep = 'CONNECT' | 'SETUP' | 'HUB';

const COLORS = [
  { hex: '#84cc16', name: 'Toxic Lime' },
  { hex: '#ef4444', name: 'Medical Waste Red' },
  { hex: '#3b82f6', name: 'Plastic Blue' },
  { hex: '#eab308', name: 'Banana Yellow' },
  { hex: '#ec4899', name: 'Bubblegum' },
  { hex: '#a855f7', name: 'Isotope Purple' },
  { hex: '#f97316', name: 'Rust Orange' },
  { hex: '#06b6d4', name: 'Cyber Cyan' }
];

const SCROLL_TEXTS = [
    "GORBAGANA TRASH WARS /// PVP ENABLED",
    "BUY $TRASH /// HODL GARBAGE /// MINT NFT",
    "SECTOR 7 DEPLOYMENT READY /// CAUTION: BIOHAZARD",
    "WHALE ALERT: 5000 SOL MOVED TO DUMPSTER",
    "REKT SCRUB GET GUD /// NGMI /// WAGMI",
    "GAS FEES AT ALL TIME HIGH /// METHANE LEAK",
    "AUDITED BY NO ONE /// RUGPULL IMMINENT",
    "NOT FINANCIAL ADVICE /// EAT TRASH GET RICH",
    "DIAMOND HANDS ONLY /// PAPER HANDS GET RECYCLED",
    "YIELD FARMING RAT POISON /// APY 42069%",
    "LIQUIDITY POOL DRAINED BY SEAGULLS",
    "OPERATOR STATUS: ONLINE /// SYSTEM PURGE",
    "BLOCKCHAIN IS TRASH /// TRASH IS MONEY",
    "GARBAGE DAY IS EVERY DAY /// BIN JUICE ALPHA",
    "SEARCHING FOR PEER /// CONNECTING TO MAINNET",
    "TOKENOMICS: 100% PONZI /// 0% UTILITY"
];

const GlassPanel = ({ 
    children, 
    className = "", 
    hoverEffect = false,
    onClick = undefined
}: { 
    children?: React.ReactNode, 
    className?: string, 
    hoverEffect?: boolean, 
    onClick?: () => void 
}) => {
    const ref = useRef<HTMLDivElement>(null);

    const handleMouseEnter = () => {
        if (!hoverEffect || !ref.current) return;
        anime({
            targets: ref.current,
            scale: 1.02,
            translateY: -2,
            duration: 800,
            easing: 'easeOutElastic(1, .6)'
        });
    };

    const handleMouseLeave = () => {
        if (!hoverEffect || !ref.current) return;
        anime({
            targets: ref.current,
            scale: 1,
            translateY: 0,
            duration: 600,
            easing: 'easeOutElastic(1, .6)'
        });
    };

    return (
        <div 
            ref={ref}
            onClick={onClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`
                relative overflow-hidden
                bg-white/[0.02] backdrop-blur-2xl backdrop-saturate-150
                border border-white/[0.05]
                shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),inset_0_0_0_1px_rgba(255,255,255,0.05),0_20px_50px_rgba(0,0,0,0.7)]
                rounded-xl
                ${hoverEffect ? 'cursor-pointer' : ''}
                ${className}
            `}
        >
            {children}
        </div>
    );
};

const MainMenu: React.FC<MainMenuProps> = ({
  setGameState,
  setPlayerName,
  setPlayerColor,
  setPlayerAvatar,
  setWager,
  playerName,
  playerColor,
  playerAvatar,
  wager,
  inventory
}) => {
  const [step, setStep] = useState<MenuStep>('CONNECT');
  const [marketUpdate, setMarketUpdate] = useState<string>('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Solana wallet integration
  const { publicKey, connected } = useWallet();
  const { balance, fetchBalance, sessionState, startGameSession } = useGameSession();

  // Fetch balance when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      fetchBalance();
      setStep('SETUP');
    } else {
      setStep('CONNECT');
    }
  }, [connected, publicKey, fetchBalance]);

  // Scrolling background text animation
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const scrollWidth = container.scrollWidth / 2;
    
    anime({
      targets: container,
      translateX: [-scrollWidth, 0],
      duration: 60000,
      easing: 'linear',
      loop: true
    });
  }, []);

  // Generate market update for HUB
  useEffect(() => {
    if (step === 'HUB') {
      generateMarketUpdate().then(setMarketUpdate);
    }
  }, [step]);

  const handleDeploy = async () => {
    if (!connected || !publicKey) {
      alert('Please connect your wallet first');
      return;
    }

    if (!playerName.trim()) {
      alert('Please enter a player name');
      return;
    }

    try {
      // Convert wager from display value (0-100) to SOL (0.01-0.5)
      const wagerSOL = (wager / 1000) * 5; // Scale to 0.01-0.5 SOL range
      
      // Start blockchain game session
      const { signature, sessionPDA } = await startGameSession(wagerSOL);
      
      console.log('Game session started:', signature);
      console.log('Session PDA:', sessionPDA.toString());
      
      // Proceed to game
      setGameState(GameState.PLAYING);
    } catch (error: any) {
      console.error('Failed to start game:', error);
      alert(`Failed to start game: ${error.message}`);
    }
  };

  // STEP 1: CONNECT
  if (step === 'CONNECT') {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        {/* Scrolling Background */}
        <div className="absolute inset-0 overflow-hidden opacity-10">
          <div ref={scrollContainerRef} className="flex whitespace-nowrap text-6xl font-black text-green-500">
            {[...SCROLL_TEXTS, ...SCROLL_TEXTS].map((text, i) => (
              <span key={i} className="mx-16">{text}</span>
            ))}
          </div>
        </div>

        {/* Main Panel */}
        <GlassPanel className="w-full max-w-2xl p-12 mx-4">
          <div className="text-center space-y-8">
            {/* Title */}
            <div>
              <h1 className="text-7xl font-black mb-4 bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
                GORBAGANA
              </h1>
              <div className="h-1 w-64 mx-auto bg-gradient-to-r from-green-500 via-blue-500 to-purple-600 rounded-full" />
              <h2 className="text-3xl font-bold text-white/80 mt-4">TRASH WARS</h2>
            </div>

            {/* Wallet Connection */}
            <div className="space-y-6">
              <div className="flex items-center justify-center gap-3 text-white/60">
                <Wallet size={24} />
                <span className="text-lg">Connect your Solana wallet to begin</span>
              </div>

              {/* Wallet Multi Button */}
              <div className="flex justify-center">
                <WalletMultiButton className="!bg-gradient-to-r !from-green-500 !to-blue-500 hover:!from-green-600 hover:!to-blue-600 !rounded-lg !px-8 !py-4 !text-lg !font-bold !transition-all" />
              </div>

              {connected && publicKey && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-center gap-2 text-green-400">
                    <Check size={20} />
                    <span>Connected: {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    Balance: {balance.toFixed(4)} SOL
                  </div>
                  <button
                    onClick={() => setStep('SETUP')}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-lg transition-all transform hover:scale-105"
                  >
                    Continue to Setup →
                  </button>
                </div>
              )}
            </div>

            {/* Network Info */}
            <div className="pt-8 border-t border-white/10">
              <div className="flex items-center justify-center gap-6 text-sm text-white/40">
                <div className="flex items-center gap-2">
                  <Globe size={16} />
                  <span>Solana Devnet</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} />
                  <span>Secure Connection</span>
                </div>
              </div>
            </div>
          </div>
        </GlassPanel>
      </div>
    );
  }

  // STEP 2: SETUP
  if (step === 'SETUP') {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
        <GlassPanel className="w-full max-w-3xl p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-4xl font-black text-white">PLAYER SETUP</h2>
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <Check size={16} />
                <span>Wallet Connected</span>
              </div>
            </div>
            <div className="h-1 bg-gradient-to-r from-green-500 to-blue-500 rounded-full" />
          </div>

          {/* Wallet Info */}
          <div className="mb-8 p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-white/60">Connected Wallet</div>
                <div className="text-white font-mono">{publicKey?.toString().slice(0, 8)}...{publicKey?.toString().slice(-8)}</div>
              </div>
              <div>
                <div className="text-sm text-white/60">Balance</div>
                <div className="text-2xl font-bold text-green-400">{balance.toFixed(4)} SOL</div>
              </div>
            </div>
          </div>

          {/* Player Name */}
          <div className="mb-6">
            <label className="block text-white/80 font-semibold mb-2">Player Name</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your callsign..."
              className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-green-500 transition-colors"
              maxLength={20}
            />
          </div>

          {/* Color Selection */}
          <div className="mb-6">
            <label className="block text-white/80 font-semibold mb-3">Player Color</label>
            <div className="grid grid-cols-4 gap-3">
              {COLORS.map((color) => (
                <button
                  key={color.hex}
                  onClick={() => setPlayerColor(color.hex)}
                  className={`
                    p-4 rounded-lg border-2 transition-all
                    ${playerColor === color.hex ? 'border-white scale-105' : 'border-white/20 hover:border-white/40'}
                  `}
                  style={{ backgroundColor: color.hex + '40' }}
                >
                  <div className="w-8 h-8 rounded-full mx-auto mb-2" style={{ backgroundColor: color.hex }} />
                  <div className="text-xs text-white/80">{color.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Wager Slider */}
          <div className="mb-8">
            <label className="block text-white/80 font-semibold mb-2">
              Wager Amount: <span className="text-green-400">{((wager / 1000) * 5).toFixed(3)} SOL</span>
            </label>
            <input
              type="range"
              min="2"
              max="100"
              value={wager}
              onChange={(e) => setWager(Number(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-white/40 mt-1">
              <span>0.01 SOL (Min)</span>
              <span>0.5 SOL (Max)</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => setStep('CONNECT')}
              className="flex-1 bg-white/5 hover:bg-white/10 border border-white/20 text-white font-bold py-4 rounded-lg transition-all"
            >
              ← Back
            </button>
            <button
              onClick={() => setStep('HUB')}
              disabled={!playerName.trim()}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 rounded-lg transition-all transform hover:scale-105 disabled:hover:scale-100"
            >
              Proceed to Hub →
            </button>
          </div>
        </GlassPanel>
      </div>
    );
  }

  // STEP 3: HUB
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      <GlassPanel className="w-full max-w-6xl p-8">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-5xl font-black text-white mb-2">GORBAGANA COMMAND HUB</h2>
          <div className="h-1 bg-gradient-to-r from-green-500 via-blue-500 to-purple-600 rounded-full" />
        </div>

        {/* Player Info Bar */}
        <div className="mb-8 grid grid-cols-3 gap-4">
          <GlassPanel className="p-4">
            <div className="text-sm text-white/60">Player</div>
            <div className="text-xl font-bold text-white">{playerName}</div>
          </GlassPanel>
          <GlassPanel className="p-4">
            <div className="text-sm text-white/60">Balance</div>
            <div className="text-xl font-bold text-green-400">{balance.toFixed(4)} SOL</div>
          </GlassPanel>
          <GlassPanel className="p-4">
            <div className="text-sm text-white/60">Wallet</div>
            <div className="text-xl font-bold text-white font-mono">{publicKey?.toString().slice(0, 6)}...{publicKey?.toString().slice(-4)}</div>
          </GlassPanel>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {/* DEPLOY */}
          <GlassPanel hoverEffect onClick={handleDeploy} className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <Crosshair size={32} className="text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-white mb-2">🎮 DEPLOY</h3>
                <p className="text-white/60 mb-3">Enter Trash Wars arena</p>
                <div className="text-sm text-green-400 font-semibold">
                  Wager: {((wager / 1000) * 5).toFixed(3)} SOL
                </div>
              </div>
              <ChevronRight size={24} className="text-white/40" />
            </div>
          </GlassPanel>

          {/* GORBAG */}
          <GlassPanel hoverEffect className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Backpack size={32} className="text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-white mb-2">🎒 GORBAG</h3>
                <p className="text-white/60 mb-3">View inventory</p>
                <div className="text-sm text-purple-400 font-semibold">
                  [{inventory.length} Items]
                </div>
              </div>
              <ChevronRight size={24} className="text-white/40" />
            </div>
          </GlassPanel>

          {/* LEADERBOARD */}
          <GlassPanel hoverEffect className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <BarChart3 size={32} className="text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-white mb-2">📊 LEADERBOARD</h3>
                <p className="text-white/60">Top players</p>
              </div>
              <ChevronRight size={24} className="text-white/40" />
            </div>
          </GlassPanel>

          {/* SETTINGS */}
          <GlassPanel hoverEffect className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-orange-500/20 rounded-lg">
                <Cpu size={32} className="text-orange-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-white mb-2">⚙️ SETTINGS</h3>
                <p className="text-white/60">Audio and controls</p>
              </div>
              <ChevronRight size={24} className="text-white/40" />
            </div>
          </GlassPanel>
        </div>

        {/* News Ticker */}
        <GlassPanel className="p-4">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 bg-red-500/20 rounded text-red-400 text-xs font-bold">
              BREAKING
            </div>
            <div className="text-white/80 text-sm overflow-hidden">
              <div className="animate-scroll-left whitespace-nowrap">
                {marketUpdate || 'Loading market intelligence...'}
              </div>
            </div>
          </div>
        </GlassPanel>

        {/* Processing Indicator */}
        {sessionState.isProcessing && (
          <div className="mt-4 p-4 bg-blue-500/20 border border-blue-500/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="animate-spin">
                <Zap size={20} className="text-blue-400" />
              </div>
              <span className="text-blue-400">Processing blockchain transaction...</span>
            </div>
          </div>
        )}

        {/* Error Display */}
        {sessionState.error && (
          <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} className="text-red-400" />
              <span className="text-red-400">{sessionState.error}</span>
            </div>
          </div>
        )}
      </GlassPanel>
    </div>
  );
};

export default MainMenu;
