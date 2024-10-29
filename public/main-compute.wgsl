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

const MAX_SPEED = 0.001;
const MAX_STEERING_FORCE = 0.0001;

const EDGE_AVOIDANCE_FORCE = 0.1;

const SEPARATION_FORCE = 10f;
const MAX_SEPARATION_DISTANCE = 0.05;

const ALIGNMENT_FORCE = 1f;
const COHESION_FORCE = 1f;
const MAX_ALIGNMENT_DISTANCE = 0.125f;

@compute @workgroup_size(16, 16)
fn compute_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let workgroupIndex = global_id.x + global_id.y * 16;

    let boid = boids[workgroupIndex];

    var position = vec2(boid.position[0], boid.position[1]);
    var velocity = vec2(boid.velocity[0], boid.velocity[1]);

    var averageVelocity = vec2(0f, 0f);
    var averageXPosition = 0f;
    var averageYPosition = 0f;
    var neighbourCount = 0f;

    var avoid = vec2(0.0, 0.0);

    let cellIndex = getCellIndex(boid.position);
    for (var dx = -1i; dx <= 1; dx++) {
        for (var dy = -1i; dy <= 1; dy++) {
            let neighborX = (cellIndex % GRID_SIZE) + dx;
            let neighborY = (cellIndex / GRID_SIZE) + dy;

            if neighborX >= 0 && neighborX < GRID_SIZE && neighborY >= 0 && neighborY < GRID_SIZE {
                let neighborCellIndex = neighborY * GRID_SIZE + neighborX;

                for (var j = 0u; j < spatialHash[neighborCellIndex].count; j++) {
                    let otherIndex = spatialHash[neighborCellIndex].boidIndices[j];
                    let otherBoid = boids[otherIndex];

                    var otherPosition = vec2(otherBoid.position[0], otherBoid.position[1]);
                    var otherVelocity = vec2(otherBoid.velocity[0], otherBoid.velocity[1]);

                    let distance = distance(otherPosition, position);
                    if distance < MAX_SEPARATION_DISTANCE {
                        avoid += position - otherPosition;
                    } if distance < MAX_ALIGNMENT_DISTANCE {
                        averageVelocity += otherVelocity;
                        neighbourCount += 1f;
                    }
                }
            }
        }
    }

    var desiredVelocity = vec2(0f, 0f);
    if length(avoid) > 0f {
        desiredVelocity += avoid;
    }

    if neighbourCount > 0f {
        averageVelocity /= neighbourCount;
        desiredVelocity += averageVelocity;
    }

    let edgeAvoidance = avoidEdges(position, velocity);
    if length(edgeAvoidance) > 0f {
        desiredVelocity += edgeAvoidance * EDGE_AVOIDANCE_FORCE;
    }

    var steering = desiredVelocity - velocity;
    steering = normalize(steering) * MAX_STEERING_FORCE;
    velocity = normalize(velocity + steering) * MAX_SPEED;

    position += velocity;
    // position = validatePosition(position);

    output[workgroupIndex] = ComputeOutput(getVertexPositions(position, velocity));
    boids[workgroupIndex] = Boid(
        array<f32, 2>(position.x, position.y),
        array<f32, 2>(velocity.x, velocity.y)
    );
}

// fn validatePosition(currentPosition: vec2<f32>) -> vec2<f32> {
//     var position = currentPosition;

//     if position.x > 1.0 {
//         position = vec2<f32>(0.5, 0.5);
//     } else if position.x < 0.0 {
//         position = vec2<f32>(0.5, 0.5);
//     }

//     if position.y > 1.0 {
//         position = vec2<f32>(0.5, 0.5);
//     } else if position.y < 0.0 {
//         position = vec2<f32>(0.5, 0.5);
//     }

//     return position;
// }

fn getCellIndex(position: array<f32, 2>) -> i32 {
    let xi = floor(position[0] * f32(GRID_SIZE));
    let yi = floor(position[1] * f32(GRID_SIZE));
    return i32(xi + yi * f32(GRID_SIZE));
}

//TODO: Fix and implement this
fn avoidEdges(position: vec2<f32>, currentVelocity: vec2<f32>) -> vec2<f32> {
    var velocity = currentVelocity;

    if position.x < 0.15 {
        velocity.x = velocity.x + EDGE_AVOIDANCE_FORCE;
    }
    if position.x > 0.85 {
        velocity.x = velocity.x - EDGE_AVOIDANCE_FORCE;
    }
    if position.y > 0.15 {
        velocity.y = velocity.y - EDGE_AVOIDANCE_FORCE;
    }
    if position.y < 0.85 {
        velocity.y = velocity.y + EDGE_AVOIDANCE_FORCE;
    }
    return velocity;
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
    let mappedPosition = position * 2.0 - vec2<f32>(1.0, 1.0);

    //Possible micro optimization: redundant calculations, make (triangleSize * 0.707) a constant
    var relativeVertexPositions = array<vec2<f32>, 3>(
        vec2<f32>(0.0, triangleSize),
        vec2<f32>(-triangleSize * 0.707, -triangleSize * 0.707),   //-triangleSize * cos(angle), -triangleSize * sin(angle) ; angle ~= 45deg
        vec2<f32>(triangleSize * 0.707, -triangleSize * 0.707)     //triangleSize * cos(angle), -triangleSize * sin(angle) ; angle ~= 45deg
    );

    let aspectRatioVector = vec2<f32>(1.0, aspectRatio);
    let output = array<vec2<f32>, 3>(
        rotationMatrix * relativeVertexPositions[0] * aspectRatioVector + mappedPosition,
        rotationMatrix * relativeVertexPositions[1] * aspectRatioVector + mappedPosition,
        rotationMatrix * relativeVertexPositions[2] * aspectRatioVector + mappedPosition,
    );

    return output;
}