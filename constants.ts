export const WORLD_SIZE = 5000;
export const BASE_PLAYER_MASS = 18; // As per spec
export const MAX_CELL_MASS = 12000;
export const MAX_CELLS_PER_PLAYER = 16;
export const RECOMBINE_TIME_MS = 15000;
export const VIRUS_MASS = 100;
export const EJECT_MASS = 12;
export const EJECT_COST = 14; 
export const MIN_MASS_SPLIT = 36;
export const MIN_MASS_EJECT = 36;

// Physics
export const BASE_SPEED = 8; // Faster, snappier movement
export const INERTIA = 0.85; // High friction = responsive controls (was 0.15)
export const DECAY_RATE = 0.9999; // Very slow decay

export const TRASH_COUNT = 350; // Drastically reduced for cleaner gameplay (was 800)
export const BOT_COUNT = 12; // Reduced for less chaos (was 30)

// Food Types (Mass Values)
export const TRASH_TYPES = [
  { type: 'banana', color: '#FCD34D', value: 1, probability: 0.60 }, 
  { type: 'bone', color: '#E5E7EB', value: 2, probability: 0.30 },   
  { type: 'can', color: '#9CA3AF', value: 4, probability: 0.08 },    
  { type: 'gem', color: '#FBBF24', value: 50, probability: 0.015 },  
  { type: 'eth', color: '#EF4444', value: 100, probability: 0.005 }, 
] as const;

export const BOT_NAMES = [
  "RugPuller69", "DiamondHands", "WAGMI_Warrior", "PaperHands",
  "SatoshiSan", "GasFeeGhoul", "MoonBoy", "DumpIt",
  "TrashPanda", "BinJuice", "RecycleRex", "CompostKing",
  "ScrapMetal", "LandfillLord", "GarbageGoat", "RefuseRat",
  "WhaleAlert", "ShortSqueeze", "LiquidityProvider", "YieldFarmer"
];

export const BOT_SKINS = ["🐀", "🦝", "🗑️", "🧟", "🦠", "🦴", "🐟", "🍌", "💩", "🤡", "🤖", "👽", "👺", "👹", "💀", "👻"];

export const COLORS = {
  background: '#0a0a0f', 
  grid: '#1f2937',      
  gridHighlight: '#374151',
  uiPrimary: '#84cc16', 
  uiSecondary: '#3f6212', 
  virus: '#22c55e',     
  portal: '#a855f7',    
  portalInner: '#d8b4fe'
};

// Helper to convert Mass to Radius (Area = Mass * 100 for visual scaling)
export const massToRadius = (mass: number) => Math.sqrt(mass * 120 / Math.PI);
export const radiusToMass = (radius: number) => (Math.PI * radius * radius) / 120;