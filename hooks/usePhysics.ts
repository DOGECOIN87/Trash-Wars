import { useEffect, useRef, useState } from 'react';

// WASM physics types
interface PhysicsWorld {
  clear(): void;
  add_entity(id: number, x: number, y: number, radius: number, mass: number): void;
  remove_entity(id: number): void;
  update_spatial_grid(): void;
  check_collisions(): Uint32Array;
  getDistance(x1: number, y1: number, x2: number, y2: number): number;
  pointInCircle(px: number, py: number, cx: number, cy: number, radius: number): boolean;
  getEntityCount(): number;
  findNearest(x: number, y: number, exclude_id: number): number;
}

interface PhysicsModule {
  PhysicsWorld: new () => PhysicsWorld;
  init_panic_hook(): void;
}

let wasmModule: PhysicsModule | null = null;
let wasmInitPromise: Promise<PhysicsModule> | null = null;

/**
 * Initialize WASM physics module
 */
async function initWasm(): Promise<PhysicsModule> {
  if (wasmModule) {
    return wasmModule;
  }

  if (wasmInitPromise) {
    return wasmInitPromise;
  }

  wasmInitPromise = (async () => {
    try {
      // Dynamic import of WASM module
      const module = await import('../wasm-physics/pkg/trash_wars_physics.js');

      // Initialize WASM
      await module.default();

      // Set panic hook for better error messages
      module.init_panic_hook();

      wasmModule = module as unknown as PhysicsModule;
      console.log('✅ WASM Physics initialized');

      return wasmModule;
    } catch (error) {
      console.error('Failed to initialize WASM physics:', error);
      throw error;
    }
  })();

  return wasmInitPromise;
}

/**
 * Hook for using WASM physics engine
 */
export function usePhysics() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const physicsRef = useRef<PhysicsWorld | null>(null);

  useEffect(() => {
    let mounted = true;

    initWasm()
      .then((module) => {
        if (!mounted) return;

        // Create physics world instance
        physicsRef.current = new module.PhysicsWorld();
        setIsReady(true);
      })
      .catch((err) => {
        if (!mounted) return;

        console.error('WASM initialization failed:', err);
        setError(err.message);
        setIsReady(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return {
    physics: physicsRef.current,
    isReady,
    error,
  };
}

/**
 * Fallback JavaScript collision detection
 * Used when WASM is not available or fails to load
 */
export class JSPhysicsWorld {
  private entities: Map<number, { x: number; y: number; radius: number; mass: number }>;

  constructor() {
    this.entities = new Map();
  }

  clear() {
    this.entities.clear();
  }

  add_entity(id: number, x: number, y: number, radius: number, mass: number) {
    this.entities.set(id, { x, y, radius, mass });
  }

  remove_entity(id: number) {
    this.entities.delete(id);
  }

  update_spatial_grid() {
    // No-op for JS version (spatial grid is WASM-only optimization)
  }

  check_collisions(): number[] {
    const collisions: number[] = [];
    const entities = Array.from(this.entities.entries());

    // O(n²) collision check
    for (let i = 0; i < entities.length; i++) {
      const [id1, e1] = entities[i];

      for (let j = i + 1; j < entities.length; j++) {
        const [id2, e2] = entities[j];

        // AABB check first
        const dx_abs = Math.abs(e1.x - e2.x);
        const dy_abs = Math.abs(e1.y - e2.y);
        const radius_sum = e1.radius + e2.radius;

        if (dx_abs > radius_sum || dy_abs > radius_sum) {
          continue;
        }

        // Circle collision check
        const dist_sq = dx_abs * dx_abs + dy_abs * dy_abs;
        const radius_sum_sq = radius_sum * radius_sum;

        if (dist_sq < radius_sum_sq) {
          collisions.push(id1, id2);
        }
      }
    }

    return collisions;
  }

  getDistance(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  pointInCircle(px: number, py: number, cx: number, cy: number, radius: number): boolean {
    const dx = px - cx;
    const dy = py - cy;
    return dx * dx + dy * dy < radius * radius;
  }

  getEntityCount(): number {
    return this.entities.size;
  }

  findNearest(x: number, y: number, exclude_id: number): number {
    let nearest_id = -1;
    let nearest_dist = Infinity;

    for (const [id, entity] of this.entities) {
      if (id === exclude_id) continue;

      const dx = entity.x - x;
      const dy = entity.y - y;
      const dist_sq = dx * dx + dy * dy;

      if (dist_sq < nearest_dist) {
        nearest_dist = dist_sq;
        nearest_id = id;
      }
    }

    return nearest_id;
  }
}
