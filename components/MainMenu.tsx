import React, { useState, useEffect, useRef } from 'react';
import anime from 'animejs';
import { GameState, LootItem } from '../types';
import { generateMarketUpdate } from '../services/geminiService';
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
                /* Real Glass Material */
                bg-white/[0.02] backdrop-blur-2xl backdrop-saturate-150
                border border-white/[0.05]
                /* High Contrast Rim Lighting & Shadow */
                shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),inset_0_0_0_1px_rgba(255,255,255,0.05),0_20px_50px_rgba(0,0,0,0.7)]
                rounded-xl
                group
                ${hoverEffect ? 'cursor-pointer hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.3),inset_0_0_0_1px_rgba(255,255,255,0.1),0_30px_60px_rgba(0,0,0,0.8)]' : ''}
                transition-shadow duration-300
                ${className}
            `}
        >
            {/* Subtle Noise Texture */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
                 style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}>
            </div>

            {/* Reflection Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] via-transparent to-black/20 pointer-events-none"></div>
            
            {/* Content */}
            <div className="relative z-10 h-full">
                {children}
            </div>
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
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [connectedWallet, setConnectedWallet] = useState<string>('');
  const [showGorbag, setShowGorbag] = useState(false);

  // Refs for Animation Targets
  const scannerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if(e.target.files?.[0]) {
          const reader = new FileReader();
          reader.onload = () => setPlayerAvatar(reader.result as string);
          reader.readAsDataURL(e.target.files[0]);
      }
  }

  // --- ANIMATIONS ---

  // Scanner Effect (Background)
  useEffect(() => {
    if (scannerRef.current) {
        anime({
            targets: scannerRef.current,
            top: ['-10%', '110%'],
            opacity: [0, 0.5, 0],
            easing: 'easeInOutSine',
            duration: 6000, // Slower, smoother scan
            loop: true
        });
    }
  }, []);

  // Entrance Animations on Step Change
  useEffect(() => {
    // 1. Reset
    anime.set('.stagger-enter', { 
        opacity: 0, 
        translateY: 60, 
        scale: 0.9,
        rotateX: 10 
    });

    // 2. Spring Physics Entrance
    anime({
        targets: '.stagger-enter',
        opacity: [0, 1],
        translateY: [60, 0],
        scale: [0.9, 1],
        rotateX: [10, 0],
        delay: anime.stagger(120, {start: 100}), 
        easing: 'spring(1, 80, 12, 0)', // Heavy damping spring
        duration: 1200
    });
    
  }, [step, showGorbag]);

  const handleConnect = (wallet: string) => {
    // Exit Animation (Reverse Spring)
    anime({
        targets: '.stagger-enter',
        opacity: 0,
        translateY: -30,
        scale: 0.95,
        duration: 400,
        easing: 'easeInBack',
        complete: () => {
            const detected = ['Phantom', 'Backpack', 'Solflare'][Math.floor(Math.random() * 3)];
            setConnectedWallet(detected);
            setWalletAddress("8x...3f9a");
            setStep('SETUP');
        }
    });
  };

  const handleSetupComplete = () => {
    if (!playerName.trim()) setPlayerName("Degen_Rat");
    
    anime({
        targets: '.stagger-enter',
        opacity: 0,
        scale: 1.05,
        filter: 'blur(10px)',
        duration: 500,
        easing: 'easeInOutExpo',
        complete: () => {
            setStep('HUB');
        }
    });
  };

  const handleStartGame = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent double triggering if animation is already running (simple check)
    if (anime.running.length > 5) return; 

    const btn = e.currentTarget;
    const spinner = btn.querySelector('.spin-target');
    const icon = btn.querySelector('.icon-target');

    const tl = anime.timeline({
        complete: () => setGameState(GameState.PLAYING)
    });

    // Phase 1: CHARGE (0ms - 500ms)
    // Squeeze the button, spin the ring violently, brighten the icon
    tl.add({
        targets: btn,
        scale: [1, 0.85], // Compress energy
        duration: 500,
        easing: 'easeOutQuart'
    })
    .add({
        targets: spinner,
        rotate: '3turn', // 3 full fast rotations
        opacity: [0.5, 1],
        duration: 800, // Extends slightly into launch
        easing: 'easeInExpo'
    }, 0)
    .add({
        targets: icon,
        scale: 1.5,
        color: '#ffffff',
        duration: 500,
        easing: 'easeInBack'
    }, 0)
    .add({
        targets: '#main-menu-container',
        scale: [1, 0.95], // Subtle zoom out of the whole world (anticipation)
        duration: 500,
        easing: 'easeOutQuad'
    }, 0);

    // Phase 2: LAUNCH (500ms - 1000ms)
    // Massive zoom in, flash white
    tl.add({
        targets: '#main-menu-container',
        scale: 10, // WARP SPEED
        opacity: 0,
        filter: 'blur(20px)', // Motion blur
        duration: 600,
        easing: 'easeInExpo'
    }, 500);

    tl.add({
        targets: '#transition-flash',
        opacity: [0, 1],
        duration: 400,
        easing: 'easeInQuad'
    }, 600);
  };

  const interactiveRef = useRef<HTMLButtonElement>(null);
  const addHoverPhysics = (e: React.MouseEvent) => {
     anime({
        targets: e.currentTarget,
        scale: 1.05,
        duration: 800,
        easing: 'easeOutElastic(1, .5)'
     });
  };
  const removeHoverPhysics = (e: React.MouseEvent) => {
     anime({
        targets: e.currentTarget,
        scale: 1,
        duration: 600,
        easing: 'easeOutElastic(1, .5)'
     });
  };

  return (
    <div id="main-menu-container" className="relative w-full h-full animate-color-cycle overflow-hidden text-white font-sans flex flex-col items-center justify-center bg-black perspective-2000">
      
      {/* TRANSITION FLASH OVERLAY - Initially invisible */}
      <div id="transition-flash" className="absolute inset-0 bg-white pointer-events-none opacity-0 z-[100] mix-blend-hard-light"></div>

      {/* 1. ANIMATED BACKGROUND LAYER */}
      
      {/* Scrolling Text Wall */}
      <div className="absolute inset-0 z-0 flex flex-col justify-between pointer-events-none select-none overflow-hidden py-2 space-y-2 bg-transparent opacity-80">
        {SCROLL_TEXTS.map((text, i) => (
            <div key={i} className="flex whitespace-nowrap overflow-hidden blur-[1px]">
                <div 
                    className={`text-6xl md:text-8xl font-black italic tracking-tighter shrink-0 flex ${i % 2 === 0 ? 'animate-scroll-left outline-text-green' : 'animate-scroll-right outline-text-white'}`}
                    style={{ animationDuration: `${40 + (i % 5) * 8}s` }}
                >
                    {Array.from({ length: 8 }).map((_, j) => (
                        <span key={j} className={`mx-8 ${i % 2 === 0 ? 'opacity-40' : 'opacity-90'}`}>{text}</span>
                    ))}
                </div>
            </div>
        ))}
      </div>

      {/* Center Blur Overlay */}
      <div className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center">
          <div className="w-full h-[60%] bg-transparent backdrop-blur-[3px] opacity-100" 
               style={{
                   maskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)',
                   WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)'
               }}>
          </div>
      </div>

      {/* Vignette & Scanner */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,transparent_30%,#000000_100%)] opacity-90 pointer-events-none"></div>
      <div ref={scannerRef} className="absolute left-0 w-full h-[10vh] bg-gradient-to-b from-green-500/0 via-green-500/10 to-green-500/0 z-0 pointer-events-none"></div>

      {/* 2. CONTENT LAYER */}
      <div ref={containerRef} className="w-full h-full p-8 flex flex-col items-center justify-center relative z-10 perspective-1000">
        
        {/* STEP 1: CONNECT WALLET - Compact Data Card */}
        {step === 'CONNECT' && (
          <div className="flex flex-col items-center justify-center w-full max-w-2xl relative z-20 px-4 gap-8">
            
            {/* Title with Tinted Window */}
            <div className="stagger-enter w-full flex justify-center relative z-20 mb-6">
                <div className="relative group">
                    {/* Background Tinted Window */}
                    <div className="absolute -inset-x-6 -inset-y-2 bg-gradient-to-b from-zinc-900/80 to-black/80 backdrop-blur-xl rounded-lg -skew-x-12 border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.6)] z-0 overflow-hidden group-hover:border-green-500/30 transition-colors duration-500">
                        {/* Tech Patterns */}
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>
                        <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
                        
                        {/* Decorative Status Indicators */}
                        <div className="absolute top-2 right-4 flex gap-1">
                            <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></div>
                            <div className="w-1 h-1 bg-green-500/30 rounded-full"></div>
                        </div>
                        <div className="absolute bottom-2 left-4 text-[8px] font-mono text-zinc-600 tracking-widest">SYS.ONLINE</div>
                    </div>

                    {/* The Text */}
                    <h1 className="relative z-10 text-6xl md:text-8xl font-black italic text-transparent bg-clip-text bg-gradient-to-b from-white via-green-200 to-green-900 font-sans tracking-tighter"
                        style={{ 
                            filter: 'drop-shadow(0 20px 50px rgba(34,197,94,0.2))',
                            WebkitTextStroke: '1px rgba(255,255,255,0.8)',
                        }}>
                        GORBAGANA
                    </h1>
                </div>
            </div>
            
            {/* The Main Connect Component - Redesigned as a high-density 'Keycard' */}
            <div className="stagger-enter w-full relative group/card perspective-1000">
                
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[102%] h-[110%] bg-green-500/10 rounded-xl blur-xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-500"></div>

                <GlassPanel className="group-hover/card:scale-[1.01] transition-transform duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] w-full !bg-zinc-900/80 border-t border-white/20">
                    <div className="flex flex-col md:flex-row h-auto md:h-48">
                        
                        {/* Left: System Status - Darker technical area */}
                        <div className="w-full md:w-1/3 bg-black/40 border-b md:border-b-0 md:border-r border-white/10 p-6 flex flex-col justify-between relative overflow-hidden">
                             {/* Animated Scan Line Background */}
                             <div className="absolute inset-0 bg-[linear-gradient(transparent_0%,rgba(34,197,94,0.05)_50%,transparent_100%)] opacity-20 bg-[length:100%_4px]"></div>
                             
                             <div>
                                 <div className="flex items-center gap-2 text-green-500 font-mono text-[10px] font-bold uppercase tracking-widest mb-2">
                                     <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div> Signal Detected
                                 </div>
                                 <div className="font-mono text-[9px] text-zinc-500 leading-tight opacity-70">
                                     <div>> PING 8.8.8.8... OK</div>
                                     <div>> HANDSHAKE... PENDING</div>
                                     <div>> ENCRYPTION... 256-BIT</div>
                                 </div>
                             </div>

                             <div className="mt-4 flex items-center justify-center">
                                 <div className="relative w-16 h-16 border border-green-500/30 rounded-full flex items-center justify-center animate-[spin_10s_linear_infinite]">
                                     <Wallet size={24} className="text-zinc-400 absolute animate-[spin_10s_linear_infinite_reverse]" />
                                     <div className="absolute top-0 w-2 h-2 bg-green-500 rounded-full shadow-[0_0_10px_#4ade80]"></div>
                                 </div>
                             </div>
                        </div>

                        {/* Right: Action Area */}
                        <div className="flex-1 p-6 flex flex-col justify-center gap-4 relative">
                             <div className="flex justify-between items-start">
                                 <div>
                                     <h2 className="text-white font-bold text-xl tracking-tight">ACCESS TERMINAL</h2>
                                     <p className="text-zinc-500 text-xs font-mono">Verify credentials to proceed.</p>
                                 </div>
                                 <div className="flex gap-2 opacity-50">
                                     <Globe size={14} className="text-blue-400"/>
                                     <ShieldCheck size={14} className="text-green-400"/>
                                 </div>
                             </div>

                             <button 
                                onClick={() => handleConnect('Unified')}
                                onMouseEnter={addHoverPhysics}
                                onMouseLeave={removeHoverPhysics}
                                className="mt-2 w-full bg-white text-black font-black text-sm py-4 px-6 rounded hover:bg-green-400 transition-colors shadow-lg relative overflow-hidden group/btn"
                            >
                                <span className="relative z-10 flex items-center justify-between uppercase tracking-wider">
                                    Initialize Uplink <ChevronRight size={16} strokeWidth={3} className="group-hover/btn:translate-x-1 transition-transform"/>
                                </span>
                            </button>
                        </div>
                    </div>
                </GlassPanel>
            </div>
          </div>
        )}

        {/* STEP 2: SETUP - More efficient layout */}
        {step === 'SETUP' && (
          <GlassPanel className="stagger-enter w-full max-w-4xl p-1 !bg-zinc-900/80 overflow-visible">
               <div className="relative rounded-lg p-6 md:p-8 flex flex-col md:flex-row gap-8 overflow-hidden">
                    {/* Background Grid */}
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/graphy-dark.png')] opacity-10 pointer-events-none"></div>

                    {/* Inputs Area */}
                    <div className="flex-1 space-y-6 z-10">
                         <div className="flex justify-between items-center border-b border-white/10 pb-4">
                             <h2 className="text-2xl font-black italic tracking-tighter text-white">IDENTITY</h2>
                             <div className="text-[10px] font-mono text-zinc-500">{walletAddress}</div>
                         </div>
                         
                         <div className="space-y-4">
                             <div>
                                 <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Operator ID</label>
                                 <input 
                                     className="w-full bg-black/40 border border-white/10 p-3 text-lg font-mono text-white rounded focus:border-green-400 outline-none transition-all"
                                     value={playerName}
                                     onChange={(e) => setPlayerName(e.target.value)}
                                     placeholder="ENTER_ID"
                                     maxLength={14}
                                 />
                             </div>
                             
                             <div>
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Strain Color</label>
                                <div className="flex gap-2 overflow-x-auto pb-2">
                                    {COLORS.map(c => (
                                        <button 
                                            key={c.hex}
                                            onClick={() => setPlayerColor(c.hex)}
                                            className={`w-8 h-8 rounded-full border-2 transition-all flex-shrink-0 ${playerColor === c.hex ? 'border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'border-transparent opacity-50 hover:opacity-100'}`}
                                            style={{backgroundColor: c.hex}}
                                        />
                                    ))}
                                </div>
                             </div>

                             <div>
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 block">Custom Asset</label>
                                <label className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded cursor-pointer hover:bg-white/10 transition-colors">
                                     <Upload size={16} className="text-zinc-400"/>
                                     <span className="text-xs font-bold text-zinc-300">Upload Skin Image</span>
                                     <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                </label>
                             </div>
                         </div>
                    </div>

                    {/* Preview Area - Tighter integration */}
                    <div className="w-full md:w-64 bg-black/40 border border-white/10 rounded flex flex-col items-center justify-center p-6 relative z-10">
                         <div className="absolute top-2 left-2 text-[8px] font-mono text-green-500">LIVE_PREVIEW</div>
                         
                         <div className="relative w-32 h-32 my-4">
                              <div className="w-full h-full rounded-full border-2 border-white/20 overflow-hidden bg-zinc-800 shadow-[0_0_30px_rgba(0,0,0,0.5)] relative">
                                  {playerAvatar ? (
                                      <img src={playerAvatar} className="w-full h-full object-cover"/>
                                  ) : (
                                      <div className="w-full h-full flex items-center justify-center text-4xl">😎</div>
                                  )}
                                  <div className="absolute inset-0 rounded-full mix-blend-overlay opacity-50" style={{backgroundColor: playerColor}}></div>
                              </div>
                         </div>

                         <div className="text-center w-full">
                             <div className="text-xl font-black italic tracking-tighter text-white truncate">{playerName || "UNKNOWN"}</div>
                             <button 
                                onClick={handleSetupComplete}
                                className="mt-4 w-full bg-green-500 hover:bg-green-400 text-black font-bold py-2 rounded text-xs uppercase tracking-widest shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-all"
                            >
                                Ready
                            </button>
                         </div>
                    </div>
               </div>
          </GlassPanel>
        )}

        {/* STEP 3: HUB - COMPACT OPERATOR KEYCARD */}
        {step === 'HUB' && (
            <div className="stagger-enter w-full max-w-lg relative z-20 perspective-1000">
                {/* The "Operator Card" */}
                <div className="relative group bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl transform transition-transform duration-500 hover:scale-[1.02] hover:shadow-[0_0_50px_rgba(34,197,94,0.15)]">
                    
                    {/* 1. Header: Identity & Balance */}
                    <div className="bg-black/40 p-4 flex justify-between items-center border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-gradient-to-tr from-zinc-700 to-zinc-600 border border-white/10 flex items-center justify-center font-bold text-xs shadow-inner">
                                {playerName.slice(0,2).toUpperCase()}
                            </div>
                            <div>
                                <div className="text-[10px] text-zinc-500 font-mono uppercase font-bold tracking-widest">Operator</div>
                                <div className="text-sm font-black text-white leading-none">{playerName}</div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] text-zinc-500 font-mono uppercase font-bold tracking-widest">Balance</div>
                            <div className="text-sm font-mono text-green-400 font-bold leading-none">42.5 SOL</div>
                        </div>
                    </div>

                    {/* 2. Main Visual Area */}
                    <div className="p-6 relative overflow-hidden flex flex-col items-center gap-6">
                         {/* Background Grid specific to card */}
                         <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)]"></div>

                         {/* Avatar & Wager Ring */}
                         <div className="relative w-40 h-40 flex items-center justify-center z-10">
                              {/* Spinning Ring based on Wager */}
                              <svg className="absolute inset-0 w-full h-full animate-[spin_10s_linear_infinite]" viewBox="0 0 100 100">
                                  <circle cx="50" cy="50" r="48" fill="none" stroke="#333" strokeWidth="1" strokeDasharray="4 4" opacity="0.5"/>
                                  <circle cx="50" cy="50" r="48" fill="none" stroke={wager > 2500 ? "#ef4444" : "#4ade80"} strokeWidth="2" strokeDasharray={`${(wager/5000)*300} 1000`} strokeLinecap="round" className="transition-all duration-500 ease-out"/>
                              </svg>
                              
                              {/* Avatar Container */}
                              <div className="w-32 h-32 rounded-full bg-zinc-800 border-4 border-black shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden relative group/avatar cursor-pointer transition-transform active:scale-95" onClick={() => setStep('SETUP')}>
                                   {playerAvatar ? <img src={playerAvatar} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-4xl">😎</div>}
                                   <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity text-xs font-bold uppercase tracking-widest text-white">Edit</div>
                              </div>
                              
                              {/* Wager Value Badge */}
                              <div className="absolute -bottom-3 bg-black border border-white/20 px-3 py-1 rounded-full text-xs font-mono font-bold text-white shadow-xl">
                                  {(wager/1000).toFixed(2)} SOL
                              </div>
                         </div>

                         {/* Controls */}
                         <div className="w-full space-y-4 z-10">
                             <div className="space-y-2">
                                 <div className="flex justify-between text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">
                                     <span>Risk Level</span>
                                     <span className={wager > 3000 ? "text-red-400 animate-pulse" : "text-green-400"}>
                                         {wager > 4000 ? "SUICIDE" : wager > 2500 ? "HIGH" : "NORMAL"}
                                     </span>
                                 </div>
                                 <div className="relative h-8 bg-black/50 rounded-lg border border-white/10 overflow-hidden group/slider">
                                     <input 
                                        type="range" 
                                        min="10" 
                                        max="5000" 
                                        step="10" 
                                        value={wager}
                                        onChange={(e) => setWager(parseInt(e.target.value))}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                     />
                                     <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 via-yellow-500/20 to-red-500/20 w-full origin-left transition-transform duration-100" style={{transform: `scaleX(${wager/5000})`}}></div>
                                     <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                         {/* Tick marks */}
                                         <div className="flex justify-between w-full px-4 opacity-30">
                                             {Array.from({length:20}).map((_,i) => <div key={i} className="w-px h-2 bg-white"></div>)}
                                         </div>
                                     </div>
                                     {/* Slider Thumb Visual */}
                                     <div className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_white] transition-all duration-75 pointer-events-none" style={{left: `${(wager/5000)*100}%`}}></div>
                                 </div>
                             </div>
                         </div>
                         
                         {/* Quick Stats Row */}
                         <div className="grid grid-cols-2 gap-2 w-full">
                             <div className="bg-white/5 border border-white/5 rounded p-2 flex items-center gap-3 cursor-pointer hover:bg-white/10 transition-colors" onClick={() => setShowGorbag(true)}>
                                 <div className="p-1.5 bg-yellow-500/20 rounded text-yellow-500"><Backpack size={14}/></div>
                                 <div>
                                     <div className="text-[9px] text-zinc-500 uppercase font-bold">Gorbag</div>
                                     <div className="text-xs font-bold text-white">{inventory.length} Items</div>
                                 </div>
                             </div>
                             <div className="bg-white/5 border border-white/5 rounded p-2 flex items-center gap-3">
                                 <div className="p-1.5 bg-purple-500/20 rounded text-purple-500"><Globe size={14}/></div>
                                 <div>
                                     <div className="text-[9px] text-zinc-500 uppercase font-bold">Region</div>
                                     <div className="text-xs font-bold text-white">US-East</div>
                                 </div>
                             </div>
                         </div>
                    </div>

                    {/* 3. Footer: DEPLOY BUTTON */}
                    <button 
                        onClick={handleStartGame}
                        onMouseEnter={addHoverPhysics}
                        onMouseLeave={removeHoverPhysics}
                        className="w-full bg-white text-black font-black text-xl py-6 hover:bg-green-400 transition-all duration-300 relative overflow-hidden group/btn z-20 border-t border-white/10"
                    >
                        <div className="absolute inset-0 flex items-center justify-center gap-2 z-10">
                            <span className="tracking-tighter italic">INITIATE DROP</span>
                            <Zap size={20} className="fill-black group-hover/btn:scale-125 transition-transform icon-target"/>
                        </div>
                        
                        {/* Background Swipe Effect */}
                        <div className="absolute inset-0 bg-green-500 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300 ease-in-out z-0"></div>
                        
                        {/* Loading/Spinning elements hidden but accessible for anime.js */}
                        <div className="spin-target opacity-0 absolute top-2 right-2 w-4 h-4 border-2 border-black border-dashed rounded-full"></div>
                    </button>

                </div>
                
                {/* Decorative elements outside the card */}
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-green-500/20 blur-3xl -z-10 rounded-full animate-pulse"></div>
                <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-purple-500/20 blur-3xl -z-10 rounded-full animate-pulse delay-700"></div>
            </div>
        )}

        {/* GORBAG OVERLAY - Unchanged, just better blur */}
        {showGorbag && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-8 animate-in fade-in duration-300">
                <GlassPanel className="stagger-enter w-full max-w-4xl h-[80vh] flex flex-col !bg-black/90">
                    <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                        <div className="flex items-center gap-3">
                             <Backpack className="text-yellow-400 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]"/>
                             <h2 className="text-2xl font-black italic tracking-tighter text-white">MY GORBAG</h2>
                        </div>
                        <button onClick={() => setShowGorbag(false)} className="hover:bg-white/10 p-2 rounded-full transition-colors text-white"><X/></button>
                    </div>
                    
                    <div className="flex-1 p-8 overflow-y-auto bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
                        {inventory.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-zinc-600 opacity-50">
                                <Backpack size={80} className="mb-6 stroke-1"/>
                                <p className="font-mono uppercase tracking-widest text-lg font-bold">Gorbag is empty</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {inventory.map((item, idx) => (
                                    <div key={idx} className="bg-black/80 border border-white/10 p-4 rounded-xl flex flex-col items-center gap-3 hover:border-yellow-500/50 hover:bg-yellow-500/10 transition-all group cursor-pointer hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(234,179,8,0.2)]">
                                        <div className="text-5xl group-hover:scale-110 transition-transform filter drop-shadow-xl">{item.icon}</div>
                                        <div className="text-center w-full">
                                            <div className="font-bold text-sm text-zinc-200 truncate">{item.name}</div>
                                            <div className="text-[10px] font-mono text-zinc-500 uppercase mt-1 bg-black/50 py-1 rounded font-bold">{item.type} • {item.value} mass</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <div className="p-4 bg-black/40 border-t border-white/10 text-center text-xs font-mono text-zinc-500 flex justify-between px-8 font-bold">
                        <span>CAPACITY: {inventory.length} / 50</span>
                        <span>SECURED ON CHAIN</span>
                    </div>
                </GlassPanel>
            </div>
        )}

      </div>
    </div>
  );
};

export default MainMenu;