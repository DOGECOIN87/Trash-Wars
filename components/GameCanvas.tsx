import React, { useEffect, useRef, useState } from 'react';
import { Player, TrashItem, Particle, Vector, GameState, Virus, EjectedMass, Portal, LootItem } from '../types';
import { 
  WORLD_SIZE, BASE_PLAYER_MASS, TRASH_COUNT, BOT_COUNT, TRASH_TYPES, COLORS, 
  BOT_NAMES, BOT_SKINS, MAX_CELLS_PER_PLAYER, RECOMBINE_TIME_MS, 
  VIRUS_MASS, EJECT_MASS, EJECT_COST, MIN_MASS_SPLIT, MIN_MASS_EJECT,
  BASE_SPEED, INERTIA, DECAY_RATE, massToRadius
} from '../constants';
import { generateTrashTalk } from '../services/geminiService';
import { MessageCircle, Timer, Zap, Shield } from 'lucide-react';
import { useAudio } from '../hooks/useAudio';

interface GameCanvasProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  setScore: (score: number) => void;
  playerName: string;
  playerColor: string;
  playerAvatar: string | null;
  wager: number;
  onLootCollected: (item: LootItem) => void;
}

interface Star {
    x: number;
    y: number;
    size: number;
    alpha: number;
    layer: number; // 0 = far, 1 = near
}

const GameCanvas: React.FC<GameCanvasProps> = ({ gameState, setGameState, setScore, playerName, playerColor, playerAvatar, wager, onLootCollected }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [camera, setCamera] = useState<Vector>({ x: WORLD_SIZE / 2, y: WORLD_SIZE / 2 });
  const [leaderboard, setLeaderboard] = useState<{name: string, score: number, id: string}[]>([]);
  const [heroImage, setHeroImage] = useState<HTMLImageElement | null>(null);
  const [isInvincible, setIsInvincible] = useState(false);
  
  // Audio
  const { playEat, playSplit, playEject, playVirus, playCashOut } = useAudio();
  
  // Game Objects
  const playersRef = useRef<Player[]>([]);
  const trashRef = useRef<TrashItem[]>([]);
  const virusesRef = useRef<Virus[]>([]);
  const ejectedMassRef = useRef<EjectedMass[]>([]);
  const portalsRef = useRef<Portal[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const starsRef = useRef<Star[]>([]);
  
  // Visuals
  const shakeRef = useRef<number>(0);
  
  // Input
  const mouseRef = useRef<Vector>({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const rawMouseRef = useRef<Vector>({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  
  // Chat
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Loop
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const portalTimerRef = useRef<number>(0);
  const isFirstFrameRef = useRef<boolean>(true);

  // --- HELPERS ---
  const adjustColor = (color: string, amount: number) => {
    return '#' + color.replace(/^#/, '').replace(/../g, color => ('0'+Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
  }

  useEffect(() => {
    if (playerAvatar) {
        const img = new Image();
        img.src = playerAvatar;
        img.onload = () => setHeroImage(img);
    } else {
        setHeroImage(null);
    }
  }, [playerAvatar]);

  // Input Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== GameState.PLAYING) return;
      
      if (isChatOpen) {
        if (e.key === 'Enter') handleSendChat();
        if (e.key === 'Escape') setIsChatOpen(false);
        return;
      }

      switch(e.code) {
        case 'Enter':
          setIsChatOpen(true);
          setTimeout(() => chatInputRef.current?.focus(), 10);
          break;
        case 'Space':
          handleSplit('hero');
          break;
        case 'KeyW':
          handleEject('hero');
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, isChatOpen, chatMessage]);

  const createParticles = (x: number, y: number, color: string, count: number, speed: number) => {
      // Limit total particles for performance
      if (particlesRef.current.length > 200) return;
      
      for(let i=0; i<count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const v = Math.random() * speed;
          particlesRef.current.push({
              id: `p-${Date.now()}-${i}`,
              pos: {x, y},
              velocity: { x: Math.cos(angle) * v, y: Math.sin(angle) * v },
              life: 1.0,
              maxLife: 1.0,
              color,
              radius: Math.random() * 3 + 1,
              mass: 0,
              rotation: 0
          });
      }
  };

  const handleSplit = (ownerId: string) => {
      const currentCells = playersRef.current.filter(p => p.ownerId === ownerId);
      const cellCount = currentCells.length;
      
      const newCells: Player[] = [];

      // Sort largest first
      currentCells.sort((a,b) => b.mass - a.mass);
      let didSplit = false;

      currentCells.forEach(cell => {
          if (cellCount + newCells.length >= MAX_CELLS_PER_PLAYER || cell.mass < MIN_MASS_SPLIT) return;

          didSplit = true;
          const splitMass = cell.mass / 2;
          cell.mass = splitMass;
          cell.radius = massToRadius(splitMass);

          // Calculate split direction
          let angle = cell.rotation;
          if (ownerId === 'hero') {
             const cx = window.innerWidth / 2;
             const cy = window.innerHeight / 2;
             angle = Math.atan2(rawMouseRef.current.y - cy, rawMouseRef.current.x - cx);
          }

          const dx = Math.cos(angle);
          const dy = Math.sin(angle);
          const dist = cell.radius * 2;

          const splitCell: Player = {
             ...cell,
             id: `${ownerId}-split-${Date.now()}-${Math.random()}`,
             mass: splitMass,
             radius: massToRadius(splitMass),
             pos: { 
               x: cell.pos.x + dx * dist, 
               y: cell.pos.y + dy * dist 
             },
             dashVector: { x: dx * 25, y: dy * 25 }, // Faster split dash
             mergeTimestamp: Date.now() + RECOMBINE_TIME_MS,
             creationTime: Date.now(),
             velocity: { x: dx * 8, y: dy * 8 },
             impactScale: 1.0,
             loot: []
          };
          
          if (ownerId === 'hero') shakeRef.current += 1; // Subtle shake

          newCells.push(splitCell);
      });

      if (didSplit && ownerId === 'hero') playSplit();
      playersRef.current = [...playersRef.current, ...newCells];
  };

  const handleEject = (ownerId: string) => {
      const currentCells = playersRef.current.filter(p => p.ownerId === ownerId);
      let didEject = false;

      currentCells.forEach(cell => {
          if (cell.mass < MIN_MASS_EJECT) return; 

          didEject = true;
          cell.mass -= EJECT_COST;
          cell.radius = massToRadius(cell.mass);

          let angle = cell.rotation;
          if (ownerId === 'hero') {
             const cx = window.innerWidth / 2;
             const cy = window.innerHeight / 2;
             angle = Math.atan2(rawMouseRef.current.y - cy, rawMouseRef.current.x - cx);
          }

          const dx = Math.cos(angle);
          const dy = Math.sin(angle);
          const startR = cell.radius + 10;

          ejectedMassRef.current.push({
             id: `eject-${Date.now()}-${Math.random()}`,
             pos: { 
                x: cell.pos.x + dx * startR, 
                y: cell.pos.y + dy * startR 
             },
             velocity: { x: dx * 30, y: dy * 30 }, // Snappy eject
             radius: massToRadius(EJECT_MASS),
             mass: EJECT_MASS,
             color: cell.color,
             rotation: Math.random() * Math.PI * 2,
             ownerId: ownerId,
             creationTime: Date.now()
          });
          
          if (ownerId === 'hero') {
              cell.impactScale = 0.95; 
          }
      });

      if (didEject && ownerId === 'hero') playEject();
  };

  const handleSendChat = () => {
    if (!chatMessage.trim()) {
      setIsChatOpen(false);
      return;
    }
    const myCells = playersRef.current.filter(p => p.ownerId === 'hero');
    const mainCell = myCells.sort((a,b) => b.mass - a.mass)[0];
    if (mainCell) {
      mainCell.trashTalk = chatMessage.slice(0, 40);
      mainCell.trashTalkTimer = 300;
    }
    setChatMessage("");
    setIsChatOpen(false);
  };

  // --- SPAWNERS ---

  const spawnTrash = (id: string): TrashItem => {
    const rand = Math.random();
    let typeConfig: typeof TRASH_TYPES[number] = TRASH_TYPES[0];
    let cumulative = 0;
    
    for (const t of TRASH_TYPES) {
      cumulative += t.probability;
      if (rand <= cumulative) {
        typeConfig = t;
        break;
      }
    }

    return {
      id,
      pos: { x: Math.random() * WORLD_SIZE, y: Math.random() * WORLD_SIZE },
      radius: massToRadius(typeConfig.value) + 4, 
      mass: typeConfig.value,
      color: typeConfig.color,
      rotation: Math.random() * Math.PI * 2,
      type: typeConfig.type as any,
      value: typeConfig.value,
      pulseOffset: Math.random() * 100
    };
  };

  const spawnVirus = (): Virus => ({
      id: `virus-${Date.now()}-${Math.random()}`,
      pos: { x: Math.random() * WORLD_SIZE, y: Math.random() * WORLD_SIZE },
      mass: VIRUS_MASS,
      radius: massToRadius(VIRUS_MASS),
      color: COLORS.virus,
      rotation: 0,
      spikes: 16 + Math.floor(Math.random() * 8),
      fedMass: 0
  });

  const initGame = () => {
    isFirstFrameRef.current = true;
    shakeRef.current = 0;
    
    // Background Stars
    starsRef.current = Array.from({ length: 80 }).map(() => ({
        x: Math.random() * window.innerWidth, 
        y: Math.random() * window.innerHeight,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.5 + 0.1,
        layer: Math.random() > 0.8 ? 1 : 0 
    }));

    // 1. Create Bots First
    const bots: Player[] = Array.from({ length: BOT_COUNT }).map((_, i) => {
      let mass;
      const r = Math.random();
      if (r < 0.5) mass = BASE_PLAYER_MASS * 0.8;
      else if (r < 0.8) mass = BASE_PLAYER_MASS * 2;
      else mass = BASE_PLAYER_MASS * 5;

      return {
        id: `bot-${i}`,
        ownerId: `bot-${i}`,
        name: BOT_NAMES[i % BOT_NAMES.length],
        pos: { x: Math.random() * WORLD_SIZE, y: Math.random() * WORLD_SIZE },
        mass: mass, 
        radius: massToRadius(mass),
        color: ['#ef4444', '#3b82f6', '#eab308', '#a855f7', '#ec4899', '#f97316'][Math.floor(Math.random() * 6)],
        velocity: { x: 0, y: 0 },
        isBot: true,
        skin: 'can',
        avatarEmoji: BOT_SKINS[Math.floor(Math.random() * BOT_SKINS.length)],
        rotation: Math.random() * Math.PI * 2,
        mergeTimestamp: 0,
        creationTime: Date.now(),
        impactScale: 1,
        loot: []
      };
    });
    bots.forEach(b => b.radius = massToRadius(b.mass));

    // 2. Find Safe Spawn for Hero
    let spawnX = Math.random() * WORLD_SIZE;
    let spawnY = Math.random() * WORLD_SIZE;
    let maxSafety = 0;

    // Try 10 random spots and pick the one furthest from any large bot
    for(let i=0; i<10; i++) {
        const tx = Math.random() * WORLD_SIZE;
        const ty = Math.random() * WORLD_SIZE;
        let minDist = 99999;
        
        for (const bot of bots) {
            const dist = Math.hypot(bot.pos.x - tx, bot.pos.y - ty);
            // Weight distance by bot mass (avoid big bots more)
            const danger = bot.mass > BASE_PLAYER_MASS * 2 ? dist : dist * 2; 
            if (danger < minDist) minDist = danger;
        }

        if (minDist > maxSafety) {
            maxSafety = minDist;
            spawnX = tx;
            spawnY = ty;
        }
    }

    setCamera({ x: spawnX, y: spawnY });

    // 3. Create Hero
    const hero: Player = {
      id: 'hero',
      ownerId: 'hero',
      name: playerName || 'Anon',
      pos: { x: spawnX, y: spawnY },
      mass: BASE_PLAYER_MASS,
      radius: massToRadius(BASE_PLAYER_MASS),
      color: playerColor,
      velocity: { x: 0, y: 0 },
      isBot: false,
      skin: 'grouch',
      rotation: 0,
      mergeTimestamp: 0,
      creationTime: Date.now(),
      impactScale: 1,
      loot: [],
      invincibleUntil: Date.now() + 3000 // 3 Seconds Invincibility
    };

    playersRef.current = [hero, ...bots];
    trashRef.current = Array.from({ length: TRASH_COUNT }).map((_, i) => spawnTrash(i.toString()));
    virusesRef.current = Array.from({ length: 15 }).map(spawnVirus);
    ejectedMassRef.current = [];
    portalsRef.current = [];
    particlesRef.current = [];
  };

  // --- UPDATE LOOP ---

  const update = (dt: number) => {
    if (gameState !== GameState.PLAYING) return;
    const now = Date.now();
    const timeScale = Math.min(dt / 16.666, 2); 
    
    // Decay Shake
    if (shakeRef.current > 0) {
        shakeRef.current *= 0.8; // Faster decay (was 0.9)
        if (shakeRef.current < 0.5) shakeRef.current = 0;
    }

    // Portal Logic
    if (now - portalTimerRef.current > 30000) { 
        portalTimerRef.current = now;
        portalsRef.current.push({
            id: `portal-${now}`,
            pos: { x: Math.random() * WORLD_SIZE, y: Math.random() * WORLD_SIZE },
            radius: 1, 
            mass: 0,
            color: COLORS.portal,
            rotation: 0,
            state: 'SPAWNING',
            timer: now + 5000 
        });
    }

    // Portal State Machine
    for (let i = portalsRef.current.length - 1; i >= 0; i--) {
        const p = portalsRef.current[i];
        if (p.state === 'SPAWNING') {
            p.radius += 0.5 * timeScale;
            if (now > p.timer) {
                p.state = 'OPEN';
                p.timer = now + 20000; 
                p.radius = 120;
                createParticles(p.pos.x, p.pos.y, COLORS.portal, 50, 5);
                shakeRef.current += 2;
            }
        } else if (p.state === 'OPEN') {
             p.rotation += 0.05 * timeScale;
             if (now > p.timer) {
                 p.state = 'CLOSING';
             }
        } else if (p.state === 'CLOSING') {
            p.radius *= 0.95;
            if (p.radius < 5) portalsRef.current.splice(i, 1);
        }
    }

    // Update Particles
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.pos.x += p.velocity.x * timeScale;
        p.pos.y += p.velocity.y * timeScale;
        p.life -= 0.04 * timeScale; // Faster fade
        if (p.life <= 0) particlesRef.current.splice(i, 1);
    }

    // Player Physics
    let heroInvincible = false;
    playersRef.current.forEach(p => {
        // Visual Bounce Decay
        if (p.impactScale && p.impactScale > 1.0) {
            p.impactScale = 1.0 + (p.impactScale - 1.0) * 0.9;
        } else if (p.impactScale && p.impactScale < 1.0) {
            p.impactScale = 1.0 - (1.0 - p.impactScale) * 0.9;
        }

        if (p.ownerId === 'hero' && p.invincibleUntil && p.invincibleUntil > now) {
            heroInvincible = true;
        }

        // Decay Mass
        if (p.mass > BASE_PLAYER_MASS) {
            p.mass *= Math.pow(DECAY_RATE, timeScale);
            p.radius = massToRadius(p.mass);
        }

        // Input / AI
        let targetX = 0, targetY = 0;
        
        if (p.ownerId === 'hero') {
            const cx = window.innerWidth / 2;
            const cy = window.innerHeight / 2;
            const mx = rawMouseRef.current.x - cx;
            const my = rawMouseRef.current.y - cy;
            const dist = Math.hypot(mx, my);
            if (dist > 0) {
               targetX = (mx / dist) * BASE_SPEED;
               targetY = (my / dist) * BASE_SPEED;
            }
        } else {
            // Bot AI 
            const margin = 200;
            let angle = p.rotation;
            if (p.pos.x < margin) angle = 0;
            else if (p.pos.x > WORLD_SIZE - margin) angle = Math.PI;
            else if (p.pos.y < margin) angle = Math.PI/2;
            else if (p.pos.y > WORLD_SIZE - margin) angle = -Math.PI/2;
            else if (Math.random() < 0.02) angle += (Math.random()-0.5) * 2;
            p.rotation = angle;
            targetX = Math.cos(angle) * BASE_SPEED;
            targetY = Math.sin(angle) * BASE_SPEED;
        }

        const speedMult = Math.pow(p.mass, -0.43) * 6; 
        targetX *= speedMult;
        targetY *= speedMult;

        // More responsive movement
        p.velocity.x += (targetX - p.velocity.x) * INERTIA * timeScale;
        p.velocity.y += (targetY - p.velocity.y) * INERTIA * timeScale;

        // Dash
        if (p.dashVector) {
            p.pos.x += p.dashVector.x * timeScale;
            p.pos.y += p.dashVector.y * timeScale;
            p.dashVector.x *= Math.pow(0.85, timeScale);
            p.dashVector.y *= Math.pow(0.85, timeScale);
            if (Math.abs(p.dashVector.x) < 0.1) p.dashVector = undefined;
        }

        p.pos.x += p.velocity.x * timeScale;
        p.pos.y += p.velocity.y * timeScale;

        p.pos.x = Math.max(p.radius, Math.min(WORLD_SIZE - p.radius, p.pos.x));
        p.pos.y = Math.max(p.radius, Math.min(WORLD_SIZE - p.radius, p.pos.y));

        if (p.trashTalkTimer && p.trashTalkTimer > 0) p.trashTalkTimer -= timeScale;
        else p.trashTalk = undefined;
    });
    
    setIsInvincible(heroInvincible);

    // Collision Resolution

    // Ejected Mass
    for (let i = ejectedMassRef.current.length - 1; i >= 0; i--) {
        const e = ejectedMassRef.current[i];
        e.pos.x += e.velocity.x * timeScale;
        e.pos.y += e.velocity.y * timeScale;
        e.velocity.x *= Math.pow(0.9, timeScale);
        e.velocity.y *= Math.pow(0.9, timeScale);
        if (e.pos.x < 0 || e.pos.x > WORLD_SIZE || e.pos.y < 0 || e.pos.y > WORLD_SIZE) {
            ejectedMassRef.current.splice(i, 1);
        }
    }

    playersRef.current.sort((a,b) => b.mass - a.mass);
    const deadIds: string[] = [];

    for (let i = 0; i < playersRef.current.length; i++) {
        const p1 = playersRef.current[i];
        if (deadIds.includes(p1.id)) continue;

        // Portals (Hero Only)
        if (p1.ownerId === 'hero') {
            const activePortal = portalsRef.current.find(p => p.state === 'OPEN');
            if (activePortal) {
                const dist = Math.hypot(p1.pos.x - activePortal.pos.x, p1.pos.y - activePortal.pos.y);
                if (dist < activePortal.radius * 0.5) {
                    playCashOut();
                    setGameState(GameState.CASHED_OUT);
                    return;
                }
            }
        }

        // Trash
        for (let t = trashRef.current.length - 1; t >= 0; t--) {
            const trash = trashRef.current[t];
            if (Math.abs(p1.pos.x - trash.pos.x) > p1.radius + 10) continue;
            if (Math.abs(p1.pos.y - trash.pos.y) > p1.radius + 10) continue;

            const dist = Math.hypot(p1.pos.x - trash.pos.x, p1.pos.y - trash.pos.y);
            if (dist < p1.radius) {
                p1.mass += trash.value;
                p1.radius = massToRadius(p1.mass);
                trashRef.current[t] = spawnTrash(trash.id);
                // "Bounce" on eat
                if (p1.ownerId === 'hero') {
                    p1.impactScale = 1.02;
                    playEat();
                    setScore(Math.floor(playersRef.current.filter(p => p.ownerId === 'hero').reduce((a,b)=>a+b.mass,0)));
                    
                    // LOOT LOGIC
                    if (trash.type === 'gem' || trash.type === 'eth') {
                        onLootCollected({
                            id: trash.id,
                            type: trash.type,
                            name: trash.type === 'gem' ? 'Rare Gem' : 'Lost ETH',
                            icon: trash.type === 'gem' ? '💎' : 'Ξ',
                            value: trash.value,
                            timestamp: Date.now()
                        });
                        shakeRef.current += 2; // Minimal shake
                    }
                }
            }
        }

        // Ejected Mass
        for (let e = ejectedMassRef.current.length - 1; e >= 0; e--) {
            const ej = ejectedMassRef.current[e];
            if (ej.ownerId === p1.ownerId && now - ej.creationTime < 300) continue;
            
            const dist = Math.hypot(p1.pos.x - ej.pos.x, p1.pos.y - ej.pos.y);
            if (dist < p1.radius) {
                p1.mass += ej.mass;
                p1.radius = massToRadius(p1.mass);
                ejectedMassRef.current.splice(e, 1);
                p1.impactScale = 1.05;
                if (p1.ownerId === 'hero') playEat();
            }
        }

        // Virus Collision
        if (p1.mass > VIRUS_MASS * 1.15) { 
             for (let v = virusesRef.current.length - 1; v >= 0; v--) {
                 const virus = virusesRef.current[v];
                 const dist = Math.hypot(p1.pos.x - virus.pos.x, p1.pos.y - virus.pos.y);
                 
                 if (dist < p1.radius - 10) { 
                     // EXPLODE
                     virusesRef.current.splice(v, 1);
                     createParticles(p1.pos.x, p1.pos.y, COLORS.virus, 20, 10);
                     if (p1.ownerId === 'hero') {
                         shakeRef.current += 5;
                         playVirus();
                     }

                     const myCells = playersRef.current.filter(c => c.ownerId === p1.ownerId);
                     const fragments = Math.min(16 - myCells.length, 8); 
                     
                     if (fragments > 0) {
                         const massPerFrag = p1.mass / (fragments + 1);
                         p1.mass = massPerFrag;
                         p1.radius = massToRadius(massPerFrag);

                         for (let k=0; k<fragments; k++) {
                             const angle = (Math.PI * 2 / fragments) * k;
                             playersRef.current.push({
                                 ...p1,
                                 id: `${p1.ownerId}-virus-${now}-${k}`,
                                 mass: massPerFrag,
                                 radius: massToRadius(massPerFrag),
                                 dashVector: { x: Math.cos(angle) * 20, y: Math.sin(angle) * 20 },
                                 mergeTimestamp: now + 30000,
                                 creationTime: now,
                                 pos: { ...p1.pos },
                                 impactScale: 1,
                                 loot: []
                             });
                         }
                     }
                     virusesRef.current.push(spawnVirus());
                     break; 
                 }
             }
        }

        // Player vs Player
        for (let j = 0; j < playersRef.current.length; j++) {
            if (i === j) continue;
            const p2 = playersRef.current[j];
            if (deadIds.includes(p2.id)) continue;
            
            const dist = Math.hypot(p1.pos.x - p2.pos.x, p1.pos.y - p2.pos.y);

            // Merge
            if (p1.ownerId === p2.ownerId) {
                if (dist < p1.radius + p2.radius) {
                     if (now > p1.mergeTimestamp && now > p2.mergeTimestamp && dist < (p1.radius + p2.radius) / 2) {
                         p1.mass += p2.mass;
                         p1.radius = massToRadius(p1.mass);
                         deadIds.push(p2.id);
                         createParticles(p1.pos.x, p1.pos.y, p1.color, 10, 2);
                         p1.impactScale = 1.1; // Merge gloop
                     } else {
                         // Push apart (Softer)
                         const overlap = (p1.radius + p2.radius - dist);
                         const force = overlap * 0.05 * timeScale; // Softer push
                         const dx = (p1.pos.x - p2.pos.x) / dist || 1;
                         const dy = (p1.pos.y - p2.pos.y) / dist || 0;
                         
                         p1.pos.x += dx * force * 0.5;
                         p1.pos.y += dy * force * 0.5;
                         p2.pos.x -= dx * force * 0.5;
                         p2.pos.y -= dy * force * 0.5;
                     }
                }
                continue;
            }

            // Eat
            if (p1.mass > p2.mass * 1.10) {
                 // INVINCIBILITY CHECK
                 if (p2.invincibleUntil && now < p2.invincibleUntil) continue;

                 // Easier eat threshold
                 if (dist < p1.radius - p2.radius * 0.4) {
                     p1.mass += p2.mass;
                     p1.radius = massToRadius(p1.mass);
                     deadIds.push(p2.id);
                     createParticles(p2.pos.x, p2.pos.y, p2.color, 20, 5);
                     
                     if (p1.ownerId === 'hero' || p2.ownerId === 'hero') {
                         shakeRef.current += Math.min(p2.radius, 4); // Capped shake
                         p1.impactScale = 1.1;
                         if (p1.ownerId === 'hero') playEat();
                         
                         if(Math.random() > 0.6) {
                            generateTrashTalk(p1.name, p2.name).then(t => {
                                p1.trashTalk = t;
                                p1.trashTalkTimer = 200;
                            });
                         }
                     }
                 }
            }
        }
    }

    // Cleanup Dead
    if (deadIds.length > 0) {
        playersRef.current = playersRef.current.filter(p => !deadIds.includes(p.id));
        
        const activeBotOwners = new Set(playersRef.current.filter(p => p.isBot).map(p => p.ownerId)).size;
        for (let k = 0; k < BOT_COUNT - activeBotOwners; k++) {
             const r = Math.random();
             const mass = r < 0.5 ? BASE_PLAYER_MASS : BASE_PLAYER_MASS * 1.5;
             const id = `bot-${now}-${k}-${Math.random()}`;
             playersRef.current.push({
                 id: id,
                 ownerId: id,
                 name: BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)],
                 pos: { x: Math.random() * WORLD_SIZE, y: Math.random() * WORLD_SIZE },
                 mass: mass,
                 radius: massToRadius(mass),
                 color: COLORS.uiPrimary,
                 velocity: {x:0,y:0},
                 isBot: true,
                 skin: 'can',
                 rotation: Math.random() * Math.PI * 2,
                 mergeTimestamp: 0,
                 creationTime: now,
                 avatarEmoji: BOT_SKINS[Math.floor(Math.random()*BOT_SKINS.length)],
                 impactScale: 1,
                 loot: []
             });
        }
        
        if (playersRef.current.filter(p => p.ownerId === 'hero').length === 0) {
            setGameState(GameState.GAME_OVER);
        }
    }

    // Leaderboard Logic (Same as before)
    const scores = new Map<string, number>();
    const names = new Map<string, string>();
    playersRef.current.forEach(p => {
        scores.set(p.ownerId, (scores.get(p.ownerId) || 0) + p.mass);
        names.set(p.ownerId, p.name);
    });
    const lb = Array.from(scores.entries())
        .map(([id, score]) => ({ id, name: names.get(id)!, score }))
        .sort((a,b) => b.score - a.score)
        .slice(0, 5);
    setLeaderboard(lb);
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;

    // Smooth Camera
    const heroCells = playersRef.current.filter(p => p.ownerId === 'hero');
    let camTarget = { x: WORLD_SIZE/2, y: WORLD_SIZE/2 };
    let totalHeroMass = 0;
    
    if (heroCells.length > 0) {
        let sx = 0, sy = 0;
        heroCells.forEach(p => { sx += p.pos.x * p.mass; sy += p.pos.y * p.mass; totalHeroMass += p.mass; });
        camTarget = { x: sx/totalHeroMass, y: sy/totalHeroMass };
    }

    const scaleBase = Math.pow(Math.min(64 / totalHeroMass, 1), 0.4);
    const targetScale = Math.max(0.1, scaleBase); 
    
    const lerpFactor = 0.1;
    let newCamX = camera.x + (camTarget.x - camera.x) * lerpFactor;
    let newCamY = camera.y + (camTarget.y - camera.y) * lerpFactor;

    if (isFirstFrameRef.current) {
        newCamX = camTarget.x;
        newCamY = camTarget.y;
        isFirstFrameRef.current = false;
    }

    setCamera({ x: newCamX, y: newCamY });

    // DYNAMIC BACKGROUND COLOR CYCLE
    // Complementary Logic: Hue rotates, Grid is complementary (+180), Accents are Split/Triadic
    const t = Date.now() * 0.005; 
    const baseHue = t % 360;
    
    // Background: Dark, desaturated version of current hue
    const bgFill = `hsl(${baseHue}, 30%, 8%)`;
    ctx.fillStyle = bgFill;
    ctx.fillRect(0, 0, width, height);
    
    // Update CSS variables for UI sync
    if (containerRef.current) {
        containerRef.current.style.setProperty('--dynamic-hue', baseHue.toFixed(1));
        containerRef.current.style.setProperty('--dynamic-comp', ((baseHue + 180) % 360).toFixed(1));
        containerRef.current.style.setProperty('--dynamic-accent', ((baseHue + 90) % 360).toFixed(1));
    }

    // Parallax Stars (Background)
    ctx.fillStyle = '#ffffff';
    starsRef.current.forEach(star => {
        const speed = star.layer === 0 ? 0.05 : 0.15;
        const offsetX = (star.x - newCamX * speed + WORLD_SIZE * 10) % width;
        const offsetY = (star.y - newCamY * speed + WORLD_SIZE * 10) % height;
        
        ctx.globalAlpha = star.alpha;
        ctx.beginPath();
        ctx.arc(offsetX, offsetY, star.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // Camera Transform Start
    ctx.save();
    ctx.translate(width/2, height/2);
    
    // Screen Shake
    if (shakeRef.current > 0.5) {
        ctx.translate((Math.random() - 0.5) * shakeRef.current, (Math.random() - 0.5) * shakeRef.current);
    }

    ctx.scale(targetScale, targetScale);
    ctx.translate(-newCamX, -newCamY);

    // Grid (Dynamic Complementary Color)
    ctx.lineWidth = 4;
    const gridHue = (baseHue + 180) % 360;
    ctx.strokeStyle = `hsl(${gridHue}, 20%, 15%)`;
    
    const gridSize = 100;
    const viewW = width / targetScale;
    const viewH = height / targetScale;
    const startX = Math.max(0, Math.floor((newCamX - viewW/2)/gridSize)*gridSize);
    const endX = Math.min(WORLD_SIZE, Math.ceil((newCamX + viewW/2)/gridSize)*gridSize);
    const startY = Math.max(0, Math.floor((newCamY - viewH/2)/gridSize)*gridSize);
    const endY = Math.min(WORLD_SIZE, Math.ceil((newCamY + viewH/2)/gridSize)*gridSize);

    ctx.beginPath();
    for(let x=startX; x<=endX; x+=gridSize) { 
        ctx.moveTo(x,startY); ctx.lineTo(x, endY); 
    }
    for(let y=startY; y<=endY; y+=gridSize) { 
        ctx.moveTo(startX,y); ctx.lineTo(endX, y); 
    }
    ctx.stroke();

    // Map Border (Dynamic Accent Color)
    const accentHue = (baseHue + 90) % 360;
    ctx.strokeStyle = `hsl(${accentHue}, 70%, 50%)`;
    ctx.lineWidth = 50;
    ctx.strokeRect(0,0, WORLD_SIZE, WORLD_SIZE);

    // 1. Particles (Bottom Layer)
    particlesRef.current.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI*2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    });

    // 2. Portals
    portalsRef.current.forEach(p => {
         const r = p.radius;
         ctx.save();
         ctx.translate(p.pos.x, p.pos.y);
         ctx.rotate(p.rotation);
         
         const glow = ctx.createRadialGradient(0,0,r*0.2, 0,0,r);
         glow.addColorStop(0, COLORS.portalInner);
         glow.addColorStop(1, 'transparent');
         ctx.fillStyle = glow;
         ctx.beginPath();
         ctx.arc(0,0,r*1.5, 0, Math.PI*2);
         ctx.fill();

         ctx.lineWidth = 8;
         ctx.strokeStyle = COLORS.portal;
         ctx.beginPath();
         ctx.arc(0,0,r,0,Math.PI*2);
         ctx.stroke();

         ctx.beginPath();
         ctx.arc(0,0,r*0.8,0,Math.PI*2);
         ctx.setLineDash([20, 20]);
         ctx.stroke();

         if (p.state === 'SPAWNING') {
             ctx.fillStyle = '#fff';
             ctx.font = 'bold 60px Rubik';
             ctx.textAlign = 'center';
             ctx.textBaseline = 'middle';
             const timeLeft = Math.ceil((p.timer - Date.now())/1000);
             ctx.fillText(timeLeft.toString(), 0, 0);
         }
         
         ctx.restore();
    });

    // 3. Ejected Mass
    ejectedMassRef.current.forEach(e => {
        ctx.save();
        ctx.translate(e.pos.x, e.pos.y);
        ctx.rotate(e.rotation);
        
        ctx.fillStyle = e.color;
        ctx.shadowColor = e.color;
        ctx.shadowBlur = 10;
        
        ctx.beginPath();
        ctx.arc(0, 0, e.radius, 0, Math.PI*2);
        ctx.fill();
        
        ctx.restore();
    });

    // 4. Trash
    trashRef.current.forEach(t => {
        if (Math.abs(t.pos.x - newCamX) > viewW/2 + 50 || Math.abs(t.pos.y - newCamY) > viewH/2 + 50) return;
        
        ctx.fillStyle = t.color;
        ctx.shadowColor = t.color;
        ctx.shadowBlur = 5;
        
        ctx.beginPath();
        if (t.type === 'gem' || t.type === 'eth') {
            const sides = 5;
            for(let i=0; i<sides; i++) {
                const ang = i * 2 * Math.PI / sides;
                const tx = t.pos.x + Math.cos(ang) * t.radius;
                const ty = t.pos.y + Math.sin(ang) * t.radius;
                if(i===0) ctx.moveTo(tx, ty); else ctx.lineTo(tx, ty);
            }
            ctx.fill();
        } else {
            ctx.arc(t.pos.x, t.pos.y, t.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.shadowBlur = 0;
    });

    // 5. Viruses
    virusesRef.current.forEach(v => {
        ctx.fillStyle = v.color;
        ctx.strokeStyle = '#14532d';
        ctx.lineWidth = 5;
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 10;
        
        ctx.beginPath();
        const r = v.radius;
        for(let i=0; i<v.spikes * 2; i++) {
            const angle = (Math.PI * 2 * i) / (v.spikes * 2);
            const rad = i % 2 === 0 ? r : r * 1.15; // Pointy
            const x = v.pos.x + Math.cos(angle) * rad;
            const y = v.pos.y + Math.sin(angle) * rad;
            if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
    });

    // 6. Players (3D Sphere Rendering)
    const renderOrder = [...playersRef.current].sort((a,b) => a.mass - b.mass);
    
    renderOrder.forEach(p => {
        const r = p.radius;
        const scale = p.impactScale || 1.0;
        
        // CHECK INVINCIBILITY
        const isProtected = p.invincibleUntil && p.invincibleUntil > Date.now();
        
        ctx.save();
        ctx.translate(p.pos.x, p.pos.y);
        ctx.scale(scale, scale); // Apply jelly bounce
        
        if (isProtected) {
            ctx.globalAlpha = 0.7 + Math.sin(Date.now() / 100) * 0.3; // Pulse effect
        }

        // 1. Drop Shadow (Fake Z-Depth)
        ctx.beginPath();
        ctx.arc(10, 10, r, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fill();

        // 2. Main Body with Radial Gradient (Sphere effect)
        // Light source top-left
        const grad = ctx.createRadialGradient(-r*0.3, -r*0.3, r*0.1, 0, 0, r);
        grad.addColorStop(0, adjustColor(p.color, 40)); 
        grad.addColorStop(0.5, p.color);                
        grad.addColorStop(1, adjustColor(p.color, -60)); 
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI*2);
        ctx.fill();

        // 3. Rim Light (Edge definition)
        ctx.strokeStyle = isProtected ? '#4ade80' : 'rgba(255,255,255,0.1)';
        ctx.lineWidth = isProtected ? 4 : 2;
        ctx.stroke();

        // 4. Content (Skin/Avatar)
        ctx.rotate(p.rotation);
        
        if (p.ownerId === 'hero' && heroImage) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(0, 0, r*0.9, 0, Math.PI*2);
            ctx.clip();
            ctx.drawImage(heroImage, -r, -r, r*2, r*2);
            ctx.restore();
        } else if (p.avatarEmoji) {
            ctx.font = `${r}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#fff';
            ctx.fillText(p.avatarEmoji, 0, 0);
        } else {
             const eyeOff = r * 0.3;
             const eyeSize = r * 0.25;
             ctx.fillStyle = 'white';
             ctx.beginPath();
             ctx.arc(eyeOff, -eyeOff, eyeSize, 0, Math.PI*2);
             ctx.arc(eyeOff, eyeOff, eyeSize, 0, Math.PI*2);
             ctx.fill();
             ctx.fillStyle = 'black';
             ctx.beginPath();
             ctx.arc(eyeOff + eyeSize*0.2, -eyeOff, eyeSize*0.4, 0, Math.PI*2);
             ctx.arc(eyeOff + eyeSize*0.2, eyeOff, eyeSize*0.4, 0, Math.PI*2);
             ctx.fill();
        }

        // SHIELD EFFECT OVERLAY
        if (isProtected) {
             ctx.beginPath();
             ctx.arc(0,0, r + 8, 0, Math.PI*2);
             ctx.strokeStyle = '#4ade80';
             ctx.lineWidth = 2;
             ctx.setLineDash([5, 5]);
             ctx.stroke();
             ctx.setLineDash([]);
        }

        ctx.restore(); // Undo translate/rotate

        // Labels
        if (r > 15) {
            ctx.save();
            ctx.translate(p.pos.x, p.pos.y);
            
            ctx.shadowColor = 'black';
            ctx.shadowBlur = 4;
            ctx.fillStyle = '#fff';
            ctx.font = `bold ${Math.max(12, r * 0.35)}px Rubik`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            ctx.fillText(p.name, 0, 0);
            
            if (r > 30) {
                ctx.font = `${Math.max(10, r * 0.25)}px Rubik`;
                ctx.fillText(Math.floor(p.mass).toString(), 0, r * 0.4);
            }
            ctx.restore();
        }
        
        // Chat Bubble
        if (p.trashTalk) {
            const bx = p.pos.x;
            const by = p.pos.y - p.radius - 20;
            ctx.font = '16px Rubik';
            const tm = ctx.measureText(p.trashTalk);
            const w = tm.width + 20;
            
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            
            ctx.beginPath();
            ctx.roundRect(bx - w/2, by - 30, w, 30, 5);
            ctx.fill();
            ctx.stroke();
            
            ctx.fillStyle = 'black';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(p.trashTalk, bx, by - 15);
        }
    });

    ctx.restore(); // End Camera Transform
  };

  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      initGame();
    }
  }, [gameState]);

  useEffect(() => {
    const loop = (time: number) => {
      const dt = time - lastTimeRef.current;
      lastTimeRef.current = time;
      update(dt);
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          canvasRef.current.width = window.innerWidth;
          canvasRef.current.height = window.innerHeight;
          draw(ctx);
        }
      }
      animationFrameRef.current = requestAnimationFrame(loop);
    };
    animationFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [gameState, camera, playerColor]);

  // Mouse Listener
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      rawMouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full cursor-crosshair" />
      
      {gameState === GameState.PLAYING && (
        <>
            {/* Leaderboard - Dynamic Color Accents */}
            <div 
                className="fixed top-4 right-4 bg-zinc-900/80 backdrop-blur-md p-4 rounded-lg border font-mono text-sm z-10 w-64 shadow-2xl transition-colors duration-100"
                style={{ 
                    borderColor: 'hsl(var(--dynamic-comp), 50%, 20%)', 
                    color: 'hsl(var(--dynamic-accent), 80%, 70%)' 
                }}
            >
                <h3 className="text-center border-b pb-2 mb-2 flex justify-between items-center text-xs tracking-widest uppercase" style={{ borderColor: 'hsl(var(--dynamic-comp), 50%, 20%)' }}>
                    <span>Sector 7 Leaderboard</span>
                </h3>
                <ol className="space-y-1">
                    {leaderboard.map((p, i) => (
                    <li key={p.id} className={`flex justify-between ${p.name === playerName ? 'font-bold scale-105 origin-left text-white' : 'text-zinc-300'}`}>
                        <span>{i+1}. {p.name.slice(0, 12)}</span>
                        <span>{Math.floor(p.score)}</span>
                    </li>
                    ))}
                </ol>
            </div>
            
            {/* Minimap - Dynamic Color Accents */}
            <div 
                className="fixed bottom-4 right-4 w-48 h-48 bg-black/80 border rounded-lg overflow-hidden z-10 opacity-90 shadow-2xl transition-colors duration-100"
                style={{ borderColor: 'hsl(var(--dynamic-comp), 50%, 30%)' }}
            >
                {/* Dots */}
                {playersRef.current.filter(p => p.ownerId === 'hero').map(p => (
                    <div key={p.id} className="absolute w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_5px_#22c55e]" 
                         style={{ left: `${p.pos.x / WORLD_SIZE * 100}%`, top: `${p.pos.y / WORLD_SIZE * 100}%` }} />
                ))}
                {/* Portals */}
                {portalsRef.current.map(p => (
                    <div key={p.id} className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white ${p.state === 'SPAWNING' ? 'w-2 h-2 bg-purple-500 animate-ping' : 'w-4 h-4 bg-purple-600 shadow-[0_0_10px_#a855f7]'}`}
                         style={{ left: `${p.pos.x / WORLD_SIZE * 100}%`, top: `${p.pos.y / WORLD_SIZE * 100}%` }} />
                ))}
            </div>

            {/* Invincibility Indicator */}
            {isInvincible && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-green-500/20 text-green-400 border border-green-500 px-6 py-2 rounded-full font-mono font-bold flex items-center gap-2 animate-pulse z-50">
                    <Shield size={18} /> SPAWN PROTECTION ACTIVE
                </div>
            )}

            {/* Chat Input */}
            {isChatOpen && (
                <div className="fixed bottom-32 left-1/2 -translate-x-1/2 w-full max-w-md z-50 px-4">
                    <div className="bg-black/90 border border-green-500 rounded-full p-2 flex items-center shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                         <MessageCircle size={16} className="text-green-500 ml-2 mr-2"/>
                         <input 
                            ref={chatInputRef}
                            type="text" 
                            maxLength={40}
                            value={chatMessage}
                            onChange={(e) => setChatMessage(e.target.value)}
                            className="flex-1 bg-transparent border-none outline-none text-white font-mono"
                            placeholder="Trash talk..."
                         />
                    </div>
                </div>
            )}
            
            {/* Controls Hint */}
            <div className="fixed bottom-4 left-4 flex gap-4 text-xs text-zinc-500 font-mono pointer-events-none select-none">
                <div className="flex items-center gap-1"><div className="w-6 h-6 border border-zinc-600 bg-zinc-900 rounded flex items-center justify-center font-bold text-zinc-300">W</div> EJECT</div>
                <div className="flex items-center gap-1"><div className="w-14 h-6 border border-zinc-600 bg-zinc-900 rounded flex items-center justify-center font-bold text-zinc-300">SPACE</div> SPLIT</div>
            </div>

            {/* Portal Alert */}
            {portalsRef.current.some(p => p.state === 'SPAWNING') && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-purple-900/90 text-white px-6 py-2 rounded-full font-mono animate-pulse flex items-center gap-2 border border-purple-500 shadow-[0_0_30px_#a855f7]">
                    <Timer size={16}/> PORTAL OPENING SOON
                </div>
            )}
            {portalsRef.current.some(p => p.state === 'OPEN') && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-purple-600 text-white px-8 py-3 rounded-full font-bold font-mono animate-bounce shadow-[0_0_50px_#a855f7] border-2 border-white flex items-center gap-2 z-50">
                    <Zap size={20}/> PORTAL ACTIVE - EXIT NOW!
                </div>
            )}
        </>
      )}
    </div>
  );
};

export default GameCanvas;