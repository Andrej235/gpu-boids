import "./style.css";
import { Boid, drawBoids, initBoidsPipeline, initGPU } from "./gpu/gpu";
import Stats from "stats.js";
import * as dat from "dat.gui";
import { Vector2 } from "three";

let stats: Stats | null = null;
let canvas: HTMLCanvasElement | null = null;
const initialBoidsCount = 128; //5592405 is maximum, limited by the buffer size of boidsComputeOutputBuffer

let boidData: {
  boids: Boid[];
  size: number;
  count: number;
} = {
  boids: [],
  size: 0.01,
  count: 0,
};

async function init() {
  await initGPU();

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

  initGUI();
  requestAnimationFrame(update);
}

let gui: dat.GUI | null = null;

function initGUI() {
  gui = new dat.GUI();
  gui.add(boidData, "size", 0.0001, 0.075, 0.001).name("Boid Size");

  gui.add(boidData, "count", 1, undefined, 1).onChange((newCount) => {
    const oldCount = boidData.boids.length;
    if (oldCount === newCount) return;

    if (oldCount > newCount) boidData.boids = boidData.boids.slice(0, newCount);
    else
      boidData.boids = boidData.boids.concat(
        new Array<Boid>(newCount - oldCount).fill({
          center: new Vector2(0, 0),
          velocity: new Vector2(0, 0),
        })
      );

    gui?.destroy();
    initGUI();

    const context = canvas?.getContext("webgpu");
    if (!canvas || !context) return;

    initBoidsPipeline(canvas, context, boidData.boids, boidData.size);
  });

  gui.add(
    {
      "Randomize Boids": () => {
        randomizeBoids();
        const context = canvas?.getContext("webgpu");
        if (!canvas || !context) return;

        initBoidsPipeline(canvas, context, boidData.boids, boidData.size);
      },
    },
    "Randomize Boids"
  );

  gui.add(
    {
      Update: () => {
        const context = canvas?.getContext("webgpu");
        if (!canvas || !context) return;

        initBoidsPipeline(canvas, context, boidData.boids, boidData.size);
      },
    },
    "Update"
  );

  if (boidData.boids.length > 10) return;

  const guiFolders: dat.GUI[] = [];

  boidData.boids.forEach(function (each, i) {
    guiFolders.push(gui!.addFolder(i.toString()));

    guiFolders[i].add(each.center, "x", -1, 1, 0.01).name("Position X");

    guiFolders[i].add(each.center, "y", -1, 1, 0.01).name("Position Y");

    guiFolders[i].add(each.velocity, "x", -1, 1, 0.01).name("Velocity X");

    guiFolders[i].add(each.velocity, "y", -1, 1, 0.01).name("Velocity Y");
  });
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
  drawBoids(canvas, boidData.boids, boidData.size);
  stats?.end();

  requestAnimationFrame(update);
}

init();
