struct Boid {
  position: array<f32, 2>,
  velocity: array<f32, 2>
}

struct ComputeOutput {
    vertexPositions: array<vec4<f32>, 3>
}

@group(0) @binding(0) var<storage, read> triangleSize : f32; 
@group(0) @binding(1) var<storage, read> aspectRatio : f32;
@group(0) @binding(2) var<storage, read> boidsCount : f32;
@group(0) @binding(3) var<storage, read_write> boids : array<Boid>;
@group(0) @binding(4) var<storage, read_write> output : array<ComputeOutput>;

const STEERING_FORCE = 0.01;
const MAX_SPEED = 0.01;

const ALIGNMENT_FORCE = 1f;

@compute @workgroup_size(16, 16)
fn compute_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let workgroupIndex = global_id.x + global_id.y * 16;

    let boid = boids[workgroupIndex];

    var position = vec2(boid.position[0], boid.position[1]);
    var velocity = vec2(boid.velocity[0], boid.velocity[1]);


    var averageXVelocity = 0f;
    var averageYVelocity = 0f;
    var neighbourCount = 0f;

    for (var i = 0u; i < u32(boidsCount); i += 1u) {
        if i == workgroupIndex {
            continue;
        }

        let otherBoid = boids[i];

        var otherPosition = vec2(otherBoid.position[0], otherBoid.position[1]);
        var otherVelocity = vec2(otherBoid.velocity[0], otherBoid.velocity[1]);

        var distance = length(otherPosition - position);
        if distance < 0.3 {
            averageXVelocity += otherVelocity.x;
            averageYVelocity += otherVelocity.y;
            neighbourCount += 1f;
        }
    }



    if neighbourCount != 0 {
        averageXVelocity /= neighbourCount;
        averageYVelocity /= neighbourCount;
    }

    var desiredVelocity = avoidEdges(position);
    desiredVelocity += vec2(averageXVelocity, averageYVelocity) * ALIGNMENT_FORCE;

    var magnitude = length(desiredVelocity);
    if magnitude > 0.0 {
        var steering = desiredVelocity - velocity;
        steering = normalize(steering) * STEERING_FORCE;

        velocity += steering;
    }

    position += normalize(velocity) * MAX_SPEED;



    output[workgroupIndex] = ComputeOutput(
        getVertexPositions(position, velocity)
    );

    //workgroupIndex will be the same for all boids calculated by the same workgroup, replace this with a global boid id
    boids[workgroupIndex] = Boid(
        array<f32, 2>(position.x, position.y),
        array<f32, 2>(velocity.x, velocity.y)
    );
}

fn avoidEdges(position: vec2<f32>) -> vec2<f32> {
    var steering = vec2f(0, 0);

    if position.x > 0.5 {
        steering = vec2f(-1, 0);
    } else if position.x < -0.5 {
        steering = vec2f(1, 0);
    }

    if position.y > 0.5 {
        steering = vec2f(steering.x, -1);
    } else if position.y < -0.5 {
        steering = vec2f(steering.x, 1);
    }

    return steering * 0.5;
}

fn getRotationMatrix(velocity: vec2<f32>) -> mat2x2<f32> {
    let rotation = atan2(velocity.x, velocity.y);
    let cosAngle = cos(rotation);
    let sinAngle = sin(rotation);
    let rotationMatrix = mat2x2<f32>(
        cosAngle, -sinAngle,
        sinAngle, cosAngle
    );

    return rotationMatrix;
}

fn getVertexPositions(position: vec2<f32>, velocity: vec2<f32>) -> array<vec4<f32>, 3> {
    let rotationMatrix = getRotationMatrix(velocity);

    //Possible micro optimization: redundant calculations, make (triangleSize * 0.707) a constant
    var relativeVertexPositions = array<vec2<f32>, 3>(
        vec2<f32>(0.0, triangleSize),
        vec2<f32>(-triangleSize * 0.707, -triangleSize * 0.707),   //-triangleSize * cos(angle), -triangleSize * sin(angle) ; angle ~= 45deg
        vec2<f32>(triangleSize * 0.707, -triangleSize * 0.707)     //triangleSize * cos(angle), -triangleSize * sin(angle) ; angle ~= 45deg
    );

    let aspectRatioVector = vec2<f32>(1.0, aspectRatio);
    let output = array<vec4<f32>, 3>(
        vec4(rotationMatrix * relativeVertexPositions[0] * aspectRatioVector + position, 0.0, 1.0),
        vec4(rotationMatrix * relativeVertexPositions[1] * aspectRatioVector + position, 0.0, 1.0),
        vec4(rotationMatrix * relativeVertexPositions[2] * aspectRatioVector + position, 0.0, 1.0),
    );

    return output;
}