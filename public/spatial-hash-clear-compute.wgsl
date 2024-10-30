struct Cell {
    count: u32, 
    boidIndices: array<u32, 32>,
};

@group(0) @binding(0) var<storage, read_write> spatialHash: array<Cell, 100>;

@compute @workgroup_size(10, 10)
fn compute_clear_spatial_hash_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let workgroupIndex = global_id.x + global_id.y * 10;
    spatialHash[workgroupIndex].count = 0u;
}
