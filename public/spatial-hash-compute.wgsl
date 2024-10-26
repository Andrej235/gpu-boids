struct Boid {
  position: array<f32, 2>,
  velocity: array<f32, 2>
}

const GRID_SIZE: f32 = 11;
struct Cell {
    count: u32, 
    boidIndices: array<u32, 16>,
};

@group(0) @binding(0) var<storage, read> boids : array<Boid>;
@group(0) @binding(1) var<storage, read> boidsCount : u32;
@group(0) @binding(2) var<storage, read_write> spatialHash: array<Cell, 121>;

@compute @workgroup_size(16, 16)
fn compute_spatial_hash_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let workgroupIndex = global_id.x + global_id.y * 16;
    if workgroupIndex >= boidsCount {
        return;
    }

    let boid = boids[workgroupIndex];
    let xi = floor(boid.position[0] * GRID_SIZE);
    let yi = floor(boid.position[1] * GRID_SIZE);
    let i: u32 = u32(xi * GRID_SIZE + yi);

    var cell = spatialHash[i];
    cell.boidIndices[cell.count] = workgroupIndex;
    cell.count++;
    spatialHash[i] = cell;
}