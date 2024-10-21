import "./style.css";
import { BoidProps, drawWithGPU, initGPU } from "./gpu";
import Stats from "stats.js";
import * as dat from "dat.gui";
import { Vector2 } from "three";

let stats: Stats | null = null;
let canvas: HTMLCanvasElement | null = null;

let boidProps: BoidProps = {
  center: new Vector2(0, 0),
  rotation: Math.PI / 4,
  triangleSize: 0.05,
};

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
  canvas = document.createElement("canvas");
  appRoot.appendChild(canvas);
  canvas.height = window.innerHeight;
  canvas.width = window.innerWidth;
  canvas.style.width = "100%";
  canvas.style.height = "100%";

  requestAnimationFrame(update);

  const gui = new dat.GUI();
  const folder = gui.addFolder("Center");
  folder.add(boidProps.center, "x", undefined, undefined, 0.01);
  folder.add(boidProps.center, "y", undefined, undefined, 0.01);
  gui.add(boidProps, "rotation");
  gui.add(boidProps, "triangleSize");
}

async function update() {
  if (!canvas) {
    requestAnimationFrame(update);
    return;
  }

  stats?.begin();
  await drawWithGPU(canvas, boidProps);
  stats?.end();

  requestAnimationFrame(update);
}

init();
