/* tslint:disable */
/* eslint-disable */

export class Entity {
  free(): void;
  [Symbol.dispose](): void;
  constructor(id: number, x: number, y: number, radius: number, mass: number);
  id: number;
  x: number;
  y: number;
  radius: number;
  mass: number;
}

export class PhysicsWorld {
  free(): void;
  [Symbol.dispose](): void;
  /**
   * Add or update an entity
   */
  add_entity(id: number, x: number, y: number, radius: number, mass: number): void;
  /**
   * Find nearest entity to a point
   */
  findNearest(x: number, y: number, exclude_id: number): number;
  /**
   * Get distance between two points (optimized)
   */
  static getDistance(x1: number, y1: number, x2: number, y2: number): number;
  /**
   * Remove an entity by ID
   */
  remove_entity(id: number): void;
  /**
   * Get all entity IDs
   */
  getEntityIds(): Uint32Array;
  /**
   * Batch distance calculations
   * Input: [x1, y1, x2, y2, x3, y3, ...]
   * Output: [dist1, dist2, ...]
   */
  static batchDistances(positions: Float32Array): Float32Array;
  /**
   * Check if point is within circle
   */
  static pointInCircle(px: number, py: number, cx: number, cy: number, radius: number): boolean;
  /**
   * Check collisions and return pairs of IDs
   * Returns flat array: [id1, id2, id3, id4, ...] where pairs are (id1,id2), (id3,id4), etc.
   */
  check_collisions(): Uint32Array;
  /**
   * Get entity count
   */
  getEntityCount(): number;
  /**
   * Update spatial grid (call before check_collisions)
   */
  update_spatial_grid(): void;
  constructor();
  /**
   * Clear all entities
   */
  clear(): void;
}

export function init_panic_hook(): void;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_entity_free: (a: number, b: number) => void;
  readonly __wbg_get_entity_id: (a: number) => number;
  readonly __wbg_get_entity_mass: (a: number) => number;
  readonly __wbg_get_entity_radius: (a: number) => number;
  readonly __wbg_get_entity_x: (a: number) => number;
  readonly __wbg_get_entity_y: (a: number) => number;
  readonly __wbg_physicsworld_free: (a: number, b: number) => void;
  readonly __wbg_set_entity_id: (a: number, b: number) => void;
  readonly __wbg_set_entity_mass: (a: number, b: number) => void;
  readonly __wbg_set_entity_radius: (a: number, b: number) => void;
  readonly __wbg_set_entity_x: (a: number, b: number) => void;
  readonly __wbg_set_entity_y: (a: number, b: number) => void;
  readonly entity_new: (a: number, b: number, c: number, d: number, e: number) => number;
  readonly physicsworld_add_entity: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
  readonly physicsworld_batchDistances: (a: number, b: number) => [number, number];
  readonly physicsworld_check_collisions: (a: number) => [number, number];
  readonly physicsworld_clear: (a: number) => void;
  readonly physicsworld_findNearest: (a: number, b: number, c: number, d: number) => number;
  readonly physicsworld_getDistance: (a: number, b: number, c: number, d: number) => number;
  readonly physicsworld_getEntityCount: (a: number) => number;
  readonly physicsworld_getEntityIds: (a: number) => [number, number];
  readonly physicsworld_new: () => number;
  readonly physicsworld_pointInCircle: (a: number, b: number, c: number, d: number, e: number) => number;
  readonly physicsworld_remove_entity: (a: number, b: number) => void;
  readonly physicsworld_update_spatial_grid: (a: number) => void;
  readonly init_panic_hook: () => void;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_externrefs: WebAssembly.Table;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
