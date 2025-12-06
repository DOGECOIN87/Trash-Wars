use wasm_bindgen::prelude::*;
use std::collections::HashMap;

#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[wasm_bindgen]
pub fn init_panic_hook() {
    console_error_panic_hook::set_once();
}

#[wasm_bindgen]
#[derive(Clone, Copy, Debug)]
pub struct Entity {
    pub id: u32,
    pub x: f32,
    pub y: f32,
    pub radius: f32,
    pub mass: f32,
}

#[wasm_bindgen]
impl Entity {
    #[wasm_bindgen(constructor)]
    pub fn new(id: u32, x: f32, y: f32, radius: f32, mass: f32) -> Entity {
        Entity { id, x, y, radius, mass }
    }
}

// Spatial grid for efficient collision detection
struct SpatialGrid {
    cell_size: f32,
    grid: HashMap<(i32, i32), Vec<usize>>,
}

impl SpatialGrid {
    fn new(cell_size: f32) -> Self {
        SpatialGrid {
            cell_size,
            grid: HashMap::new(),
        }
    }

    fn clear(&mut self) {
        self.grid.clear();
    }

    fn get_cell(&self, x: f32, y: f32) -> (i32, i32) {
        (
            (x / self.cell_size).floor() as i32,
            (y / self.cell_size).floor() as i32,
        )
    }

    fn insert(&mut self, entity_idx: usize, x: f32, y: f32, radius: f32) {
        let (cx, cy) = self.get_cell(x, y);

        // Insert into multiple cells if entity spans them
        let cells_to_check = ((radius / self.cell_size).ceil() as i32).max(1);

        for dx in -cells_to_check..=cells_to_check {
            for dy in -cells_to_check..=cells_to_check {
                let cell = (cx + dx, cy + dy);
                self.grid.entry(cell).or_insert_with(Vec::new).push(entity_idx);
            }
        }
    }

    fn query_nearby(&self, x: f32, y: f32, radius: f32) -> Vec<usize> {
        let (cx, cy) = self.get_cell(x, y);
        let cells_to_check = ((radius / self.cell_size).ceil() as i32).max(1);

        let mut nearby = Vec::new();
        for dx in -cells_to_check..=cells_to_check {
            for dy in -cells_to_check..=cells_to_check {
                let cell = (cx + dx, cy + dy);
                if let Some(indices) = self.grid.get(&cell) {
                    nearby.extend_from_slice(indices);
                }
            }
        }

        // Remove duplicates
        nearby.sort_unstable();
        nearby.dedup();
        nearby
    }
}

#[wasm_bindgen]
pub struct PhysicsWorld {
    entities: Vec<Entity>,
    spatial_grid: SpatialGrid,
    collision_pairs: Vec<u32>,
}

#[wasm_bindgen]
impl PhysicsWorld {
    #[wasm_bindgen(constructor)]
    pub fn new() -> PhysicsWorld {
        init_panic_hook();
        PhysicsWorld {
            entities: Vec::new(),
            spatial_grid: SpatialGrid::new(200.0), // 200px cell size
            collision_pairs: Vec::new(),
        }
    }

    /// Clear all entities
    pub fn clear(&mut self) {
        self.entities.clear();
        self.spatial_grid.clear();
    }

    /// Add or update an entity
    pub fn add_entity(&mut self, id: u32, x: f32, y: f32, radius: f32, mass: f32) {
        // Check if entity exists
        if let Some(entity) = self.entities.iter_mut().find(|e| e.id == id) {
            entity.x = x;
            entity.y = y;
            entity.radius = radius;
            entity.mass = mass;
        } else {
            self.entities.push(Entity { id, x, y, radius, mass });
        }
    }

    /// Remove an entity by ID
    pub fn remove_entity(&mut self, id: u32) {
        self.entities.retain(|e| e.id != id);
    }

    /// Update spatial grid (call before check_collisions)
    pub fn update_spatial_grid(&mut self) {
        self.spatial_grid.clear();
        for (idx, entity) in self.entities.iter().enumerate() {
            self.spatial_grid.insert(idx, entity.x, entity.y, entity.radius);
        }
    }

    /// Check collisions and return pairs of IDs
    /// Returns flat array: [id1, id2, id3, id4, ...] where pairs are (id1,id2), (id3,id4), etc.
    pub fn check_collisions(&mut self) -> Vec<u32> {
        self.collision_pairs.clear();

        for i in 0..self.entities.len() {
            let entity_a = self.entities[i];

            // Query nearby entities using spatial grid
            let nearby = self.spatial_grid.query_nearby(
                entity_a.x,
                entity_a.y,
                entity_a.radius * 2.0,
            );

            for &j in &nearby {
                if j <= i {
                    continue; // Skip self and already checked pairs
                }

                let entity_b = self.entities[j];

                // Fast AABB check first
                let dx_abs = (entity_a.x - entity_b.x).abs();
                let dy_abs = (entity_a.y - entity_b.y).abs();
                let radius_sum = entity_a.radius + entity_b.radius;

                if dx_abs > radius_sum || dy_abs > radius_sum {
                    continue;
                }

                // Precise circle collision check
                let dist_sq = dx_abs * dx_abs + dy_abs * dy_abs;
                let radius_sum_sq = radius_sum * radius_sum;

                if dist_sq < radius_sum_sq {
                    self.collision_pairs.push(entity_a.id);
                    self.collision_pairs.push(entity_b.id);
                }
            }
        }

        self.collision_pairs.clone()
    }

    /// Get distance between two points (optimized)
    #[wasm_bindgen(js_name = getDistance)]
    pub fn get_distance(x1: f32, y1: f32, x2: f32, y2: f32) -> f32 {
        let dx = x2 - x1;
        let dy = y2 - y1;
        (dx * dx + dy * dy).sqrt()
    }

    /// Batch distance calculations
    /// Input: [x1, y1, x2, y2, x3, y3, ...]
    /// Output: [dist1, dist2, ...]
    #[wasm_bindgen(js_name = batchDistances)]
    pub fn batch_distances(positions: &[f32]) -> Vec<f32> {
        let mut distances = Vec::with_capacity(positions.len() / 4);

        for chunk in positions.chunks_exact(4) {
            let dx = chunk[2] - chunk[0];
            let dy = chunk[3] - chunk[1];
            distances.push((dx * dx + dy * dy).sqrt());
        }

        distances
    }

    /// Check if point is within circle
    #[wasm_bindgen(js_name = pointInCircle)]
    pub fn point_in_circle(px: f32, py: f32, cx: f32, cy: f32, radius: f32) -> bool {
        let dx = px - cx;
        let dy = py - cy;
        dx * dx + dy * dy < radius * radius
    }

    /// Get entity count
    #[wasm_bindgen(js_name = getEntityCount)]
    pub fn get_entity_count(&self) -> usize {
        self.entities.len()
    }

    /// Get all entity IDs
    #[wasm_bindgen(js_name = getEntityIds)]
    pub fn get_entity_ids(&self) -> Vec<u32> {
        self.entities.iter().map(|e| e.id).collect()
    }

    /// Find nearest entity to a point
    #[wasm_bindgen(js_name = findNearest)]
    pub fn find_nearest(&self, x: f32, y: f32, exclude_id: u32) -> i32 {
        let mut nearest_id = -1i32;
        let mut nearest_dist = f32::MAX;

        for entity in &self.entities {
            if entity.id == exclude_id {
                continue;
            }

            let dx = entity.x - x;
            let dy = entity.y - y;
            let dist = dx * dx + dy * dy; // Use squared distance for speed

            if dist < nearest_dist {
                nearest_dist = dist;
                nearest_id = entity.id as i32;
            }
        }

        nearest_id
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_collision_detection() {
        let mut world = PhysicsWorld::new();

        // Add two overlapping entities
        world.add_entity(1, 0.0, 0.0, 10.0, 100.0);
        world.add_entity(2, 15.0, 0.0, 10.0, 100.0);

        world.update_spatial_grid();
        let collisions = world.check_collisions();

        assert_eq!(collisions.len(), 2);
        assert_eq!(collisions[0], 1);
        assert_eq!(collisions[1], 2);
    }

    #[test]
    fn test_no_collision() {
        let mut world = PhysicsWorld::new();

        // Add two non-overlapping entities
        world.add_entity(1, 0.0, 0.0, 10.0, 100.0);
        world.add_entity(2, 100.0, 0.0, 10.0, 100.0);

        world.update_spatial_grid();
        let collisions = world.check_collisions();

        assert_eq!(collisions.len(), 0);
    }

    #[test]
    fn test_spatial_grid() {
        let mut grid = SpatialGrid::new(100.0);
        grid.insert(0, 50.0, 50.0, 10.0);

        let nearby = grid.query_nearby(55.0, 55.0, 10.0);
        assert!(nearby.contains(&0));
    }
}
