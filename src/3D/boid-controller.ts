import * as THREE from "three";

export default function initBoids(scene: THREE.Scene, boidsCount: number) {
  const boids: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>[] = [];

  for (let i = 0; i < boidsCount; i++) {
    const boid = new THREE.Mesh(
      new THREE.SphereGeometry(0.1),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );

    boid.position.x = Math.random() * 12 - 6;
    boid.position.y = Math.random() * 8 - 4;
    scene.add(boid);

    boids.push(boid);
  }

  return boids;
}
