@group(0) @binding(0) var<storage, read_write> triangleData: f32;

@compute @workgroup_size(1)
fn compute_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    if global_id.x == 0u && global_id.y == 0u && global_id.z == 0u {
        triangleData = 0.01;
    }
}
