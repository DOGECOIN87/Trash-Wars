export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  CASHED_OUT = 'CASHED_OUT'
}

export interface Vector {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  pos: Vector;
  radius: number;
  color: string;
  rotation: number;
  mass: number;
  z?: number; // Visual depth for sorting
}

export interface LootItem {
  id: string;
  type: 'gem' | 'eth' | 'banana' | 'bone' | 'can';
  name: string;
  icon: string;
  value: number;
  timestamp: number;
}

export interface Player extends Entity {
  name: string;
  velocity: Vector;
  ownerId: string;       
  isBot: boolean;
  skin: string;
  avatarEmoji?: string;
  
  // Mechanics
  creationTime: number; // For merge logic
  mergeTimestamp: number; // Time when this cell can re-merge
  invincibleUntil?: number; 
  dashVector?: Vector; // For split boosting
  trashTalk?: string;
  trashTalkTimer?: number;
  impactScale?: number; // Visual bounce
  
  // Inventory
  loot: LootItem[];
}

export interface TrashItem extends Entity {
  type: 'banana' | 'bone' | 'can' | 'gem' | 'eth';
  value: number;
  pulseOffset: number; // For visual animation
}

export interface Virus extends Entity {
  spikes: number;
  fedMass: number; // Track mass fed via W key
}

export interface EjectedMass extends Entity {
  velocity: Vector;
  ownerId: string; // Who shot it
  creationTime: number;
}

export interface Portal extends Entity {
  state: 'SPAWNING' | 'OPEN' | 'CLOSING';
  timer: number; // Countdown
}

export interface Particle extends Entity {
  life: number;
  maxLife: number;
  velocity: Vector;
  color: string;
}

export interface MarketData {
  price: number;
  trend: 'up' | 'down';
  volume: string;
}