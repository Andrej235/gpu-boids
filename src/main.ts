import "./style.css";
import initScene from "./3D/scene-setup";
import initDatGUI from "./dat.gui";
import { executeGPUOperations, initGPU } from "./gpu";
import initBoids from "./3D/boid-controller";
import { Vector3 } from "three";
import Stats from "stats.js";

let boidPositions: Vector3[] = [];
let boidVelocities: Vector3[] = [];
let stats: Stats | null = null;

async function init() {
  await initGPU();

  initDatGUI();
  const [scene, camera, renderer] = initScene();

  const boids = initBoids(scene, 1000);
  renderer.render(scene, camera);

  boidPositions = boids.map((boid) => boid.position);
  boidVelocities = Array.from(
    {
      length: boids.length,
    },
    () => new Vector3(Math.random(), Math.random(), 0).normalize()
  );

  stats = new Stats();
  stats.showPanel(1);
  document.body.appendChild(stats.dom);

  requestAnimationFrame(update);
}

async function update() {
  stats?.begin();
  await executeGPUOperations();
  stats?.end();

  requestAnimationFrame(update);
}

init();
