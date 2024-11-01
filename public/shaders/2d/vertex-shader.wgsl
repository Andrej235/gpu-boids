struct ComputeOutput {
    vertexPositions: array<vec2<f32>, 3>
}

@group(0) @binding(0) var<storage, read> computeOutput : array<ComputeOutput>;

@vertex
fn vertex_main(@builtin(vertex_index) vertex_index: u32) -> @builtin(position) vec4<f32> {
    return vec4(computeOutput[vertex_index / 3].vertexPositions[vertex_index % 3], 0.0, 1.0);
}

@fragment
fn fragment_main() -> @location(0) vec4<f32> {
    return vec4<f32>(1, 1, 1, 1);
}