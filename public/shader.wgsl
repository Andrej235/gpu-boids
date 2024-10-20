@group(0) @binding(0) var<storage, read> triangleSize : f32;
@group(0) @binding(1) var<storage, read> center : vec2<f32>;
@group(0) @binding(2) var<storage, read> rotation : f32;

@vertex
fn vs_main(@builtin(vertex_index) vertex_index: u32) -> @builtin(position) vec4<f32> {
    var positions = array<vec2<f32>, 3>(
        vec2<f32>(0.0, triangleSize),
        vec2<f32>(-triangleSize * 0.866, -triangleSize * 0.5),
        vec2<f32>(triangleSize * 0.866, -triangleSize * 0.5)
    );

    let cosAngle = cos(rotation);
    let sinAngle = sin(rotation);
    let rotationMatrix = mat2x2<f32>(
        cosAngle, -sinAngle,
        sinAngle, cosAngle
    );

    let rotatedPosition = rotationMatrix * positions[vertex_index];

    return vec4<f32>(rotatedPosition + center, 0.0, 1.0);
}

@fragment
fn fs_main() -> @location(0) vec4<f32> {
    return vec4<f32>(1, 1, 1, 1);
}