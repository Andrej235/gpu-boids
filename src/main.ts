import "./style.css";
import { drawWithGPU, initGPU } from "./gpu";
import Stats from "stats.js";

let stats: Stats | null = null;

async function init() {
  await initGPU();

  // initDatGUI();
  // const [scene, camera, renderer] = initScene();

  // const boids = initBoids(scene, 1000);
  // renderer.render(scene, camera);

  /*   boidPositions = boids.map((boid) => boid.position);
  boidVelocities = Array.from(
    {
      length: boids.length,
    },
    () => new Vector3(Math.random(), Math.random(), 0).normalize()
  );
 */

  stats = new Stats();
  stats.showPanel(1);
  document.body.appendChild(stats.dom);

  const appRoot = document.getElementById("app")!;
  const canvas = document.createElement("canvas");
  appRoot.appendChild(canvas);
  canvas.height = window.innerHeight;
  canvas.width = window.innerWidth;
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  drawWithGPU(canvas);

  requestAnimationFrame(update);
}

async function update() {
  stats?.begin();
  // await executeGPUOperations();
  stats?.end();

  requestAnimationFrame(update);
}

init();
