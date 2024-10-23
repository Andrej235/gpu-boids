struct BoidInput {
  position: array<f32, 2>,
  velocity: array<f32, 2>
}

struct ComputeOutput {
    vertexPositions: array<vec4<f32>, 3>
}

@group(0) @binding(0) var<storage, read> triangleSize : f32; 
@group(0) @binding(1) var<storage, read> aspectRatio : f32;
@group(0) @binding(2) var<storage, read_write> boids : array<BoidInput>;
@group(0) @binding(3) var<storage, read_write> output : array<ComputeOutput>;

@compute @workgroup_size(50, 5)
fn compute_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let boid = boids[global_id.x + global_id.y * 50];

    let currentPosition = vec2(boid.position[0], boid.position[1]);
    let currentVelocity = vec2(boid.velocity[0], boid.velocity[1]);

    var position = currentPosition + normalize(currentVelocity) * .01;
    let rotation = atan2(boid.velocity[0], boid.velocity[1]);

    if position.x > 1.05 {
        position = vec2(-1.05, position.y);
    } else if position.x < -1.05 {
        position = vec2(1.05, position.y);
    }

    if position.y > 1.05 {
        position = vec2(position.x, -1.05);
    } else if position.y < -1.05 {
        position = vec2(position.x, 1.05);
    }

    let cosAngle = cos(rotation);
    let sinAngle = sin(rotation);
    let rotationMatrix = mat2x2<f32>(
        cosAngle, -sinAngle,
        sinAngle, cosAngle
    );

    //Possible micro optimization: redundant calculations, make (triangleSize * 0.707) a constant
    var relativeVertexPositions = array<vec2<f32>, 3>(
        vec2<f32>(0.0, triangleSize),
        vec2<f32>(-triangleSize * 0.707, -triangleSize * 0.707),   //-triangleSize * cos(angle), -triangleSize * sin(angle) ; angle ~= 45deg
        vec2<f32>(triangleSize * 0.707, -triangleSize * 0.707)     //triangleSize * cos(angle), -triangleSize * sin(angle) ; angle ~= 45deg
    );

    let aspectRatioVector = vec2<f32>(1.0, aspectRatio);
    output[global_id.x + global_id.y * 50] = ComputeOutput(
        array<vec4<f32>, 3>(
            vec4(rotationMatrix * relativeVertexPositions[0] * aspectRatioVector + position, 0.0, 1.0),
            vec4(rotationMatrix * relativeVertexPositions[1] * aspectRatioVector + position, 0.0, 1.0),
            vec4(rotationMatrix * relativeVertexPositions[2] * aspectRatioVector + position, 0.0, 1.0),
        )
    );

    //global_id.x + global_id.y * 50 will be the same for all boids calculated by the same workgroup, replace this with a global boid id
    boids[global_id.x + global_id.y * 50] = BoidInput(
        array<f32, 2>(position.x, position.y),
        boid.velocity,
    );
}
