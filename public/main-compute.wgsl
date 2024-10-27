struct Boid {
  position: array<f32, 2>,
  velocity: array<f32, 2>
}

struct ComputeOutput {
    vertexPositions: array<vec2<f32>, 3>
}

const GRID_SIZE: i32 = 8;
struct Cell {
    count: u32, 
    boidIndices: array<u32, 32>,
};

@group(0) @binding(0) var<storage, read> triangleSize : f32;
@group(0) @binding(1) var<storage, read> aspectRatio : f32;
@group(0) @binding(2) var<storage, read> boidsCount : f32;
@group(0) @binding(3) var<storage, read_write> boids : array<Boid>;
@group(0) @binding(4) var<storage, read_write> output : array<ComputeOutput>;
@group(0) @binding(5) var<storage, read> spatialHash: array<Cell, 64>;

const STEERING_FORCE = 0.01;
const MAX_SPEED = 0.0025;

const EDGE_AVOIDANCE_FORCE = 10f;

const SEPARATION_FORCE = 10f;
const MAX_SEPARATION_DISTANCE = 0.05;

const ALIGNMENT_FORCE = 1f;
const COHESION_FORCE = 1f;
const MAX_ALIGNMENT_DISTANCE = 0.15f;

@compute @workgroup_size(16, 16)
fn compute_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let workgroupIndex = global_id.x + global_id.y * 16;

    let boid = boids[workgroupIndex];

    var position = vec2(boid.position[0], boid.position[1]);
    var velocity = vec2(boid.velocity[0], boid.velocity[1]);


    var averageXVelocity = 0f;
    var averageYVelocity = 0f;
    var averageXPosition = 0f;
    var averageYPosition = 0f;

    var closeDistanceX = 0f;
    var closeDistanceY = 0f;

    var neighbourCount = 0f;

    let cellIndex = getCellIndex(boid.position);
    for (var dx = -1; dx <= 1; dx++) {
        for (var dy = -1; dy <= 1; dy++) {
            let neighborX = (cellIndex % GRID_SIZE) + dx;
            let neighborY = (cellIndex / GRID_SIZE) + dy;

            let neighborCellIndex = neighborY * GRID_SIZE + neighborX;

            for (var j = 0u; j < spatialHash[neighborCellIndex].count; j++) {
                let otherIndex = spatialHash[neighborCellIndex].boidIndices[j];
                let otherBoid = boids[otherIndex];

                var otherPosition = vec2(otherBoid.position[0], otherBoid.position[1]);
                var otherVelocity = vec2(otherBoid.velocity[0], otherBoid.velocity[1]);

                var distance = length(otherPosition - position);
                if distance < MAX_ALIGNMENT_DISTANCE {
                    neighbourCount += 1f;
                    averageXVelocity += otherVelocity.x;
                    averageYVelocity += otherVelocity.y;
                    averageXPosition += otherPosition.x;
                    averageYPosition += otherPosition.y;
                }

                if distance < MAX_SEPARATION_DISTANCE {
                    closeDistanceX += position.x - otherPosition.x;
                    closeDistanceY += position.y - otherPosition.y;
                }
            }
        }
    }

    // for (var j = 0u; j < u32(boidsCount); j++) {
    //     if j == workgroupIndex {
    //         continue;
    //     }

    //     let otherBoid = boids[j];
    //     var otherPosition = vec2(otherBoid.position[0], otherBoid.position[1]);
    //     var otherVelocity = vec2(otherBoid.velocity[0], otherBoid.velocity[1]);

    //     var distance = length(otherPosition - position);
    //     if distance < MAX_ALIGNMENT_DISTANCE {
    //         neighbourCount += 1f;
    //         averageXVelocity += otherVelocity.x;
    //         averageYVelocity += otherVelocity.y;
    //         averageXPosition += otherPosition.x;
    //         averageYPosition += otherPosition.y;
    //     }

    //     if distance < MAX_SEPARATION_DISTANCE {
    //         closeDistanceX += position.x - otherPosition.x;
    //         closeDistanceY += position.y - otherPosition.y;
    //     }
    // }

    if neighbourCount != 0 {
        averageXVelocity /= neighbourCount;
        averageYVelocity /= neighbourCount;
        averageXPosition /= neighbourCount;
        averageYPosition /= neighbourCount;
    }

    var desiredVelocity = vec2(0f, 0f);
    desiredVelocity += vec2(closeDistanceX, closeDistanceY) * SEPARATION_FORCE;
    desiredVelocity += vec2(averageXVelocity, averageYVelocity) * ALIGNMENT_FORCE;
    desiredVelocity += vec2(averageXPosition - position.x, averageYPosition - position.y) * COHESION_FORCE;

    var magnitude = length(desiredVelocity);
    if magnitude > 0.0 {
        var steering = normalize(desiredVelocity) - velocity;
        // steering += avoidEdges(position, velocity) * EDGE_AVOIDANCE_FORCE;
        steering = normalize(steering) * STEERING_FORCE;

        velocity += steering;
    }

    position += normalize(velocity) * MAX_SPEED;

    position = validatePosition(position);

    output[workgroupIndex] = ComputeOutput(
        getVertexPositions(position, velocity)
    );

    //workgroupIndex will be the same for all boids calculated by the same workgroup, replace this with a global boid id
    boids[workgroupIndex] = Boid(
        array<f32, 2>(position.x, position.y),
        array<f32, 2>(velocity.x, velocity.y)
    );
}

fn validatePosition(currentPosition: vec2<f32>) -> vec2<f32> {
    var position = currentPosition;

    if position.x > 1.0 {
        position.x = -1.0;
    } else if position.x < -1.0 {
        position.x = 1.0;
    }

    if position.y > 1.0 {
        position.y = -1.0;
    } else if position.y < -1.0 {
        position.y = 1.0;
    }

    return position;
}

fn getCellIndex(position: array<f32, 2>) -> i32 {
    let xi = floor(position[0] * f32(GRID_SIZE));
    let yi = floor(position[1] * f32(GRID_SIZE));
    let i: i32 = i32(xi * f32(GRID_SIZE) + yi);
    return i;
}

//TODO: Fix and implement this
fn avoidEdges(position: vec2<f32>, velocity: vec2<f32>) -> vec2<f32> {
    var steering = vec2f(0.0, 0.0);

    if position.x + velocity.x > 0.7 {
        steering = vec2f(-velocity.x, velocity.y);
    } else if position.x + velocity.x < -0.7 {
        steering = vec2f(-velocity.x, velocity.y);
    }

    if position.y + velocity.y > 0.7 {
        steering = vec2f(steering.x, -velocity.y);
    } else if position.y + velocity.y < -0.7 {
        steering = vec2f(steering.x, -velocity.y);
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

fn getVertexPositions(position: vec2<f32>, velocity: vec2<f32>) -> array<vec2<f32>, 3> {
    let rotationMatrix = getRotationMatrix(velocity);

    //Possible micro optimization: redundant calculations, make (triangleSize * 0.707) a constant
    var relativeVertexPositions = array<vec2<f32>, 3>(
        vec2<f32>(0.0, triangleSize),
        vec2<f32>(-triangleSize * 0.707, -triangleSize * 0.707),   //-triangleSize * cos(angle), -triangleSize * sin(angle) ; angle ~= 45deg
        vec2<f32>(triangleSize * 0.707, -triangleSize * 0.707)     //triangleSize * cos(angle), -triangleSize * sin(angle) ; angle ~= 45deg
    );

    let aspectRatioVector = vec2<f32>(1.0, aspectRatio);
    let output = array<vec2<f32>, 3>(
        rotationMatrix * relativeVertexPositions[0] * aspectRatioVector + position,
        rotationMatrix * relativeVertexPositions[1] * aspectRatioVector + position,
        rotationMatrix * relativeVertexPositions[2] * aspectRatioVector + position,
    );

    return output;
}