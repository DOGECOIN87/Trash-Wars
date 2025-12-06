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