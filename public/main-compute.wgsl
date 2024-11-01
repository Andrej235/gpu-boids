struct Boid {
  position: vec2<f32>,
  velocity: vec2<f32>
}

struct ComputeOutput {
    vertexPositions: array<vec2<f32>, 3>
}

const GRID_SIZE: i32 = 10;
struct Cell {
    count: u32, 
    boidIndices: array<u32, 32>,
};

struct BoidBehavior {
    maxSpeed: f32,
    maxSteeringForce: f32,
    edgeAvoidanceForce: f32,
    separationForce: f32,
    maxSeparationDistance: f32,
    alignmentForce: f32,
    cohesionForce: f32,
    visualRange: f32,
}

@group(0) @binding(0) var<storage, read> triangleSize : f32;
@group(0) @binding(1) var<storage, read> aspectRatio : f32;
@group(0) @binding(2) var<storage, read> boidsCount : f32;
@group(0) @binding(3) var<storage, read_write> boids : array<Boid>;
@group(0) @binding(4) var<storage, read_write> output : array<ComputeOutput>;
@group(0) @binding(5) var<storage, read> spatialHash: array<Cell, 100>;
@group(0) @binding(6) var<storage, read> behavior: BoidBehavior;

@compute @workgroup_size(16, 16)
fn compute_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let workgroupIndex = global_id.x + global_id.y * 16;

    let boid = boids[workgroupIndex];

    var position = boid.position;
    var velocity = boid.velocity;

    var averageVelocity = vec2(0f, 0f);
    var averagePosition = vec2(0f, 0f);
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
                    if distance < behavior.maxSeparationDistance {
                        avoid += position - otherPosition;
                    } if distance < behavior.visualRange {
                        averageVelocity += otherVelocity;
                        averagePosition += otherPosition;
                        neighbourCount += 1f;
                    }
                }
            }
        }
    }

    var desiredVelocity = vec2(0f, 0f);
    desiredVelocity += avoid * behavior.separationForce;

    if neighbourCount > 0f {
        averageVelocity /= neighbourCount;
        desiredVelocity += averageVelocity * behavior.alignmentForce;

        averagePosition /= neighbourCount;
        desiredVelocity += (averagePosition - position) * behavior.cohesionForce;
    }

    desiredVelocity += avoidEdges(position, velocity) * behavior.edgeAvoidanceForce;

    var steering = desiredVelocity - velocity;
    steering = normalize(steering) * behavior.maxSteeringForce;

    velocity = normalize(velocity + steering) * behavior.maxSpeed;
    position += velocity;

    output[workgroupIndex] = ComputeOutput(getVertexPositions(position, velocity));
    boids[workgroupIndex] = Boid(
        position,
        velocity
    );
}

fn getCellIndex(position: vec2<f32>) -> i32 {
    let xi = floor(position.x * f32(GRID_SIZE));
    let yi = floor(position.y * f32(GRID_SIZE));
    return i32(xi + yi * f32(GRID_SIZE));
}

fn avoidEdges(position: vec2<f32>, currentVelocity: vec2<f32>) -> vec2<f32> {
    var velocity = currentVelocity;

    if position.x < 0.1 {
        velocity.x = velocity.x + behavior.edgeAvoidanceForce;
    }
    if position.x > 0.9 {
        velocity.x = velocity.x - behavior.edgeAvoidanceForce;
    }
    if position.y > 0.1 {
        velocity.y = velocity.y - behavior.edgeAvoidanceForce;
    }
    if position.y < 0.9 {
        velocity.y = velocity.y + behavior.edgeAvoidanceForce;
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