struct BoidInput {
  position: array<f32, 2>,
  velocity: array<f32, 2>,
}

struct ComputeOutput {
    rotationMatrix: mat2x2<f32>,
}

@group(0) @binding(0) var<storage, read> triangleSize : f32;
@group(0) @binding(1) var<storage, read> aspectRatio: f32;
@group(0) @binding(2) var<storage, read> boids : array<BoidInput>;
@group(0) @binding(3) var<storage, read> computeOutput : array<ComputeOutput>;

@vertex
fn vs_main(@builtin(vertex_index) vertex_index: u32) -> @builtin(position) vec4<f32> {
    //Possible micro optimization: redundant calculations, make (triangleSize * 0.7) a constant
    var positions = array<vec2<f32>, 3>(
        vec2<f32>(0.0, triangleSize),
        vec2<f32>(-triangleSize * 0.7, -triangleSize * 0.7),   //-triangleSize * cos(angle), -triangleSize * sin(angle) ; angle ~= 45deg
        vec2<f32>(triangleSize * 0.7, -triangleSize * 0.7)     //triangleSize * cos(angle), -triangleSize * sin(angle) ; angle ~= 45deg
    );

    let boid = boids[vertex_index / 3];
    let rotationMatrix = computeOutput[vertex_index / 3].rotationMatrix;

    let rotatedPosition = rotationMatrix * positions[vertex_index % 3];
    let adjustedPosition = vec2<f32>(rotatedPosition.x, rotatedPosition.y * aspectRatio);

    return vec4<f32>(adjustedPosition + vec2(boid.position[0], boid.position[1]), 0.0, 1.0);
}

@fragment
fn fs_main() -> @location(0) vec4<f32> {
    return vec4<f32>(1, 1, 1, 1);
}