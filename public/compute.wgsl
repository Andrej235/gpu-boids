struct Boid {
  position: array<f32, 2>,
  velocity: array<f32, 2>
}

struct ComputeOutput {
    vertexPositions: array<vec4<f32>, 3>
}

@group(0) @binding(0) var<storage, read> triangleSize : f32; 
@group(0) @binding(1) var<storage, read> aspectRatio : f32;
@group(0) @binding(2) var<storage, read> boidsCount : u32;
@group(0) @binding(3) var<storage, read_write> boids : array<Boid>;
@group(0) @binding(4) var<storage, read_write> output : array<ComputeOutput>;

const STEERING_FORCE = 0.01;
const MAX_SPEED = 0.01;

@compute @workgroup_size(16, 16)
fn compute_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let workgroupIndex = global_id.x + global_id.y * 16;

    let boid = boids[workgroupIndex];

    var position = vec2(boid.position[0], boid.position[1]);
    var velocity = vec2(boid.velocity[0], boid.velocity[1]);

    var desiredVelocity = avoidEdges(position);
    var magnitude = length(desiredVelocity);

    if magnitude > 0.0 {
        var steering = desiredVelocity - velocity;
        steering = normalize(steering) * STEERING_FORCE;

        velocity += steering;
    }

    position += normalize(velocity) * MAX_SPEED;
    // position = keepOnScreen(position);



    output[workgroupIndex] = ComputeOutput(
        getVertexPositions(position, velocity)
    );

    //workgroupIndex will be the same for all boids calculated by the same workgroup, replace this with a global boid id
    boids[workgroupIndex] = Boid(
        array<f32, 2>(position.x, position.y),
        array<f32, 2>(velocity.x, velocity.y)
    );
}

fn keepOnScreen(currentPosition: vec2<f32>) -> vec2<f32> {
    var position = currentPosition;

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

    return position;
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

    return steering;
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