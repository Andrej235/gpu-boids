struct ComputeOutput {
    vertexPositions: array<vec4<f32>, 3>
}

@group(0) @binding(0) var<storage, read> computeOutput : array<ComputeOutput>;

@vertex
fn vs_main(@builtin(vertex_index) vertex_index: u32) -> @builtin(position) vec4<f32> {
    return computeOutput[vertex_index / 3].vertexPositions[vertex_index % 3];
}

@fragment
fn fs_main() -> @location(0) vec4<f32> {
    return vec4<f32>(1, 1, 1, 1);
}