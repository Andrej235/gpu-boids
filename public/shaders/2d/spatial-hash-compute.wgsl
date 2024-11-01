struct Boid {
    position: vec2<f32>,
    velocity: vec2<f32>,
}

const GRID_SIZE: u32 = 10;
struct Cell {
    count: atomic<u32>,
    boidIndices: array<u32, 32>,
};

@group(0) @binding(0) var<storage, read> boids : array<Boid>;
@group(0) @binding(1) var<storage, read> boidsCount : u32;
@group(0) @binding(2) var<storage, read_write> spatialHash: array<Cell, 100>;

@compute @workgroup_size(16, 16)
fn compute_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let workgroupIndex = global_id.x + global_id.y * 16;
    if workgroupIndex >= u32(boidsCount) {
        return;
    }

    let bucketIndex = getCellIndex(boids[workgroupIndex].position);

    //TODO: This skips the first index of spatialHash[0].boidIndices, fix it.
    //For some reason changing the clear function to reset the count to -1 doesn't work even if the type is changed to i32 instead of u32, and instead breaks the whole thing
    let index = atomicAdd(&spatialHash[bucketIndex].count, 1u);

    if index >= 32u {
        return;
    }
    spatialHash[bucketIndex].boidIndices[index] = workgroupIndex;
}

fn getCellIndex(position: vec2<f32>) -> u32 {
    let xi = floor(position.x * f32(GRID_SIZE));
    let yi = floor(position.y * f32(GRID_SIZE));
    return u32(xi) + u32(yi) * GRID_SIZE;
}