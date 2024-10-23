struct BoidInput {
  position: array<f32, 2>,
  velocity: array<f32, 2>,
  rotation: f32,
}

@group(0) @binding(0) var<storage, read_write> triangleSize : f32; //not used anywhere yet
@group(0) @binding(1) var<storage, read_write> boids : array<BoidInput>;

@compute @workgroup_size(3)
fn compute_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let boid = boids[global_id.x];

    let currentPosition = vec2(boid.position[0], boid.position[1]);
    let currentVelocity = vec2(boid.velocity[0], boid.velocity[1]);

    let position = currentPosition + normalize(currentVelocity) * .01;
    let rotation = atan2(boid.velocity[0], boid.velocity[1]);

    boids[global_id.x] = BoidInput(
        array<f32, 2>(position.x, position.y),
        boid.velocity,
        rotation
    );
}
