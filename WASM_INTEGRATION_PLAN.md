# 🚀 TRASH WARS - WASM INTEGRATION PLAN

**Status**: NOT YET IMPLEMENTED
**Priority**: MEDIUM (Performance Optimization)
**Estimated Effort**: 8-12 hours
**Date**: December 6, 2025

---

## ❌ CURRENT STATUS

**WASM integration has NOT been accomplished.** It's mentioned in the development plan as a Phase 3 optimization but no code exists yet.

### What's Currently Implemented:
- ✅ Pure JavaScript/TypeScript physics in `GameCanvas.tsx` (1,215 lines)
- ✅ Collision detection using nested loops
- ✅ Position/velocity updates
- ✅ AI bot calculations
- ✅ Particle systems

### What's Missing:
- ❌ No WASM modules
- ❌ No Rust code
- ❌ No performance-critical code moved to WASM
- ❌ No benchmarking data

---

## 🎯 WHY WASM?

### Current Performance Bottlenecks (JavaScript)

Looking at `GameCanvas.tsx`, the main performance issues are:

#### 1. **O(n²) Collision Detection** (Lines 522-700+)
```typescript
// Player vs Player collisions - nested loops!
for (let i = 0; i < playersRef.current.length; i++) {
    const p1 = playersRef.current[i];
    for (let j = i + 1; j < playersRef.current.length; j++) {
        const p2 = playersRef.current[j];
        // Distance calculation
        const dist = Math.hypot(p1.pos.x - p2.pos.x, p1.pos.y - p2.pos.y);
        // ... collision resolution
    }
}
```

**Problem:**
- With 12 bots + player cells (up to 16), this is ~200+ distance calculations per frame
- At 60 FPS = 12,000+ calculations/second
- JavaScript is not optimized for tight numeric loops

#### 2. **Multiple Entity Collision Checks** (Lines 556-647)
- Trash items (~100 items)
- Ejected mass (variable)
- Viruses (15 viruses)
- Portals (1-2 active)

Each requires:
```typescript
const dist = Math.hypot(p1.pos.x - trash.pos.x, p1.pos.y - trash.pos.y);
```

#### 3. **Per-Frame Physics Updates** (Lines 446-521)
- Mass decay calculations
- Velocity/position updates
- AI pathfinding
- Dash vector decay

### WASM Benefits:
- ✅ **10-100x faster** numeric calculations
- ✅ **SIMD** vector operations
- ✅ **Spatial partitioning** (quadtree/grid)
- ✅ **Memory efficient** typed arrays
- ✅ **Predictable performance** no GC pauses

---

## 📊 PERFORMANCE TARGETS

### Current (JavaScript):
- Collision checks: ~200-500 per frame
- Update loop: ~2-5ms per frame (at 60 FPS)
- Max entities before lag: ~150-200

### Target (WASM):
- Collision checks: 1000+ per frame
- Update loop: < 1ms per frame
- Max entities before lag: 500+
- Smooth 60 FPS with 20+ players

---

## 🛠️ IMPLEMENTATION OPTIONS

### Option 1: Full Rust Physics Engine ⭐ **RECOMMENDED**

**Use Rapier2D** - Production-ready 2D physics engine in Rust

**Pros:**
- ✅ Complete physics solution
- ✅ Spatial partitioning built-in
- ✅ Well-tested and maintained
- ✅ WASM bindings ready
- ✅ Collision detection optimized

**Cons:**
- ⚠️ Learning curve
- ⚠️ More complex than needed
- ⚠️ Larger WASM bundle (~500KB)

**Effort:** 8-10 hours

### Option 2: Custom Rust Collision Module

**Write minimal Rust code** for just collision detection

**Pros:**
- ✅ Lighter weight (~50KB WASM)
- ✅ Exactly what we need
- ✅ Full control
- ✅ Easier to understand

**Cons:**
- ⚠️ More code to write
- ⚠️ Need to handle edge cases
- ⚠️ No spatial partitioning unless we build it

**Effort:** 6-8 hours

### Option 3: AssemblyScript

**Use TypeScript-like language** that compiles to WASM

**Pros:**
- ✅ Similar to TypeScript
- ✅ Easier migration
- ✅ Smaller learning curve

**Cons:**
- ⚠️ Less mature ecosystem
- ⚠️ Not as fast as Rust
- ⚠️ Limited library support

**Effort:** 4-6 hours

---

## 🚀 RECOMMENDED APPROACH: Rapier2D

### Step 1: Setup Rust & WASM Tools (30 min)

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Add WASM target
rustup target add wasm32-unknown-unknown

# Install wasm-pack
cargo install wasm-pack

# Install wasm-bindgen
cargo install wasm-bindgen-cli
```

### Step 2: Create Rust Physics Module (2-3 hours)

```bash
cd /home/user/Trash-Wars
mkdir wasm-physics
cd wasm-physics

# Initialize Rust project
cargo init --lib

# Add dependencies to Cargo.toml
```

**Cargo.toml:**
```toml
[package]
name = "trash-wars-physics"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
wasm-bindgen = "0.2"
rapier2d = { version = "0.17", features = ["wasm-bindgen"] }
serde = { version = "1.0", features = ["derive"] }
serde-wasm-bindgen = "0.6"

[profile.release]
opt-level = 3
lto = true
```

**lib.rs:**
```rust
use wasm_bindgen::prelude::*;
use rapier2d::prelude::*;

#[wasm_bindgen]
pub struct PhysicsWorld {
    physics_pipeline: PhysicsPipeline,
    island_manager: IslandManager,
    broad_phase: BroadPhase,
    narrow_phase: NarrowPhase,
    rigid_body_set: RigidBodySet,
    collider_set: ColliderSet,
    impulse_joint_set: ImpulseJointSet,
    multibody_joint_set: MultibodyJointSet,
    ccd_solver: CCDSolver,
}

#[wasm_bindgen]
impl PhysicsWorld {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            physics_pipeline: PhysicsPipeline::new(),
            island_manager: IslandManager::new(),
            broad_phase: BroadPhase::new(),
            narrow_phase: NarrowPhase::new(),
            rigid_body_set: RigidBodySet::new(),
            collider_set: ColliderSet::new(),
            impulse_joint_set: ImpulseJointSet::new(),
            multibody_joint_set: MultibodyJointSet::new(),
            ccd_solver: CCDSolver::new(),
        }
    }

    pub fn add_player(&mut self, x: f32, y: f32, radius: f32) -> u32 {
        let rigid_body = RigidBodyBuilder::dynamic()
            .translation(vector![x, y])
            .build();
        let collider = ColliderBuilder::ball(radius).build();

        let handle = self.rigid_body_set.insert(rigid_body);
        self.collider_set.insert_with_parent(collider, handle, &mut self.rigid_body_set);

        handle.into_raw_parts().0
    }

    pub fn step(&mut self, dt: f32) {
        self.physics_pipeline.step(
            &vector![0.0, 0.0], // No gravity
            &IntegrationParameters {
                dt,
                ..Default::default()
            },
            &mut self.island_manager,
            &mut self.broad_phase,
            &mut self.narrow_phase,
            &mut self.rigid_body_set,
            &mut self.collider_set,
            &mut self.impulse_joint_set,
            &mut self.multibody_joint_set,
            &mut self.ccd_solver,
            None,
            &(),
            &(),
        );
    }

    pub fn get_collisions(&self) -> Vec<u32> {
        let mut collisions = Vec::new();
        for contact_pair in self.narrow_phase.contact_pairs() {
            if contact_pair.has_any_active_contact() {
                let (h1, h2) = (contact_pair.collider1, contact_pair.collider2);
                collisions.push(h1.into_raw_parts().0);
                collisions.push(h2.into_raw_parts().0);
            }
        }
        collisions
    }
}
```

### Step 3: Build WASM (15 min)

```bash
cd wasm-physics
wasm-pack build --target web --release

# Output: pkg/ directory with:
# - trash_wars_physics_bg.wasm
# - trash_wars_physics.js
# - trash_wars_physics.d.ts
```

### Step 4: Integrate with GameCanvas (2-3 hours)

**Update package.json:**
```json
{
  "dependencies": {
    "trash-wars-physics": "file:./wasm-physics/pkg"
  }
}
```

**In GameCanvas.tsx:**
```typescript
import init, { PhysicsWorld } from 'trash-wars-physics';

const GameCanvas: React.FC<GameCanvasProps> = ({ ... }) => {
  const physicsRef = useRef<PhysicsWorld | null>(null);

  // Initialize WASM
  useEffect(() => {
    init().then(() => {
      physicsRef.current = new PhysicsWorld();
      console.log('WASM physics initialized');
    });
  }, []);

  const update = (dt: number) => {
    if (!physicsRef.current) return; // Fallback to JS

    // Step physics
    physicsRef.current.step(dt / 1000);

    // Get collisions
    const collisions = physicsRef.current.get_collisions();

    // Process collisions (game logic stays in JS)
    for (let i = 0; i < collisions.length; i += 2) {
      const id1 = collisions[i];
      const id2 = collisions[i + 1];
      // Handle collision...
    }
  };
};
```

### Step 5: Benchmark (1 hour)

```typescript
// Before WASM
console.time('collision-check');
// ... collision code
console.timeEnd('collision-check');

// After WASM
console.time('wasm-collision');
// ... WASM code
console.timeEnd('wasm-collision');
```

---

## 📋 IMPLEMENTATION CHECKLIST

### Prerequisites
- [ ] Install Rust toolchain
- [ ] Install wasm-pack
- [ ] Install wasm-bindgen-cli
- [ ] Verify WASM support in browser

### Development
- [ ] Create Rust project structure
- [ ] Set up Rapier2D dependencies
- [ ] Write physics world wrapper
- [ ] Implement collision detection
- [ ] Add entity management
- [ ] Build WASM module
- [ ] Test WASM in isolation

### Integration
- [ ] Add WASM package to project
- [ ] Initialize WASM in GameCanvas
- [ ] Replace JS collision with WASM
- [ ] Maintain JS fallback
- [ ] Update entity synchronization
- [ ] Test in development

### Optimization
- [ ] Profile performance
- [ ] Compare JS vs WASM benchmarks
- [ ] Optimize memory usage
- [ ] Add spatial partitioning
- [ ] Tune physics parameters

### Production
- [ ] Build optimized WASM (release mode)
- [ ] Test in production build
- [ ] Verify bundle size
- [ ] Document performance gains
- [ ] Add error handling

---

## 🎯 EXPECTED RESULTS

### Performance Improvements:
- **Collision detection**: 5-10x faster
- **Frame time**: 2-5ms → < 1ms
- **Max entities**: 200 → 500+
- **Bundle size**: +300-500KB (gzipped: ~100KB)

### Trade-offs:
- ✅ Much faster physics
- ✅ More entities supported
- ✅ Smoother gameplay
- ⚠️ Larger initial download
- ⚠️ Rust learning curve
- ⚠️ More complex debugging

---

## 🚧 ALTERNATIVE: Quick Win (No Rust)

If you want performance gains **without WASM**:

### Option A: Spatial Partitioning (JavaScript)
```typescript
// Implement quadtree in JS
class Quadtree {
  // Only check collisions in same grid cell
  // Reduces O(n²) to O(n log n)
}
```

**Effort:** 2-3 hours
**Gain:** 3-5x faster collisions

### Option B: Web Workers
```typescript
// Move physics to background thread
const physicsWorker = new Worker('./physics-worker.js');
```

**Effort:** 3-4 hours
**Gain:** Non-blocking game loop

---

## 💡 RECOMMENDATION

### For Production Game:
**Use Rapier2D + WASM** - Best long-term solution

### For Quick Testing:
**Add JavaScript Quadtree** - Fast to implement, good gains

### Current Priority:
⚠️ **Deploy smart contract first**, then optimize with WASM

---

## 📚 RESOURCES

- **Rapier2D Docs**: https://rapier.rs
- **wasm-pack Guide**: https://rustwasm.github.io/wasm-pack/
- **WASM Bindgen**: https://rustwasm.github.io/wasm-bindgen/
- **Rust Book**: https://doc.rust-lang.org/book/

---

## ❓ SHOULD YOU DO THIS NOW?

### ✅ Yes, if:
- Game is already deployed and working
- You have 100+ players experiencing lag
- Smart contract is deployed
- You know Rust or want to learn

### ❌ No, if:
- Smart contract not deployed yet ← **CURRENT STATE**
- Game isn't live yet
- Performance is acceptable
- Limited time/resources

---

**Current Recommendation:** Complete smart contract deployment (Phase 2) before starting WASM optimization (Phase 3).

**Priority Order:**
1. ✅ Frontend integration (DONE)
2. ⏳ Smart contract deployment (NEXT)
3. 🔜 WASM physics (LATER)
