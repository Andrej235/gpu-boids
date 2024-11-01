import "./style.css";
import GPUController, { Boid } from "./gpu/gpu";
import Stats from "stats.js";
import { Vector2 } from "three";
import GUIController from "./gui-controller";

let stats: Stats | null = null;
let canvas: HTMLCanvasElement | null = null;
const initialBoidsCount = 128; //5592405 is maximum, limited by the buffer size of boidsComputeOutputBuffer

let boidData: {
  boids: Boid[];
  count: number;
} = {
  boids: [],
  count: 0,
};

let gpu: GPUController;

async function init() {
  stats = new Stats();
  stats.showPanel(0);
  document.body.appendChild(stats.dom);

  const appRoot = document.getElementById("app")!;
  canvas = document.createElement("canvas");
  appRoot.appendChild(canvas);
  canvas.height = window.innerHeight;
  canvas.width = window.innerWidth;
  canvas.style.width = "100%";
  canvas.style.height = "100%";

  boidData.boids = Array.from(
    {
      length: initialBoidsCount,
    },
    () => ({
      center: new Vector2(0, 0),
      velocity: new Vector2(0, 0),
    })
  );
  boidData.count = boidData.boids.length;
  randomizeBoids();

  gpu = await GPUController.create(canvas, boidData.boids);
  new GUIController(gpu);
  requestAnimationFrame(update);
}

function randomizeBoids() {
  boidData.boids.forEach((each) => {
    each.center.set(Math.random(), Math.random());
    each.velocity.set(Math.random() * 2 - 1, Math.random() * 2 - 1);
  });
}

function update() {
  if (!canvas) {
    requestAnimationFrame(update);
    return;
  }

  stats?.begin();
  gpu.drawBoids();
  stats?.end();

  requestAnimationFrame(update);
}

init();
