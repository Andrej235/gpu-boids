import "./style.css";
import { Boid, drawBoids, initBoidsPipeline, initGPU } from "./gpu";
import Stats from "stats.js";
import * as dat from "dat.gui";
import { Vector2 } from "three";

let stats: Stats | null = null;
let canvas: HTMLCanvasElement | null = null;

let boidData: {
  boids: Boid[];
  size: number;
  count: number;
} = {
  boids: [
    {
      center: new Vector2(0, 0),
      velocity: new Vector2(0, 0),
    },
    {
      center: new Vector2(0, 0.5),
      velocity: new Vector2(0, 0),
    },
    {
      center: new Vector2(0.3, -0.4),
      velocity: new Vector2(0, 0),
    },
  ],
  size: 0.05,
  count: 3,
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

  requestAnimationFrame(update);
  initGUI();
}

let gui: dat.GUI | null = null;

function initGUI() {
  gui = new dat.GUI();
  gui.add(boidData, "size", 0.0001, 0.5, 0.01).name("Boid Size");

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
        boidData.boids.forEach((each) => {
          each.center.set(
            Math.random() * 1.5 - 0.75,
            Math.random() * 1.5 - 0.75
          );
          each.velocity.set(Math.random() * 2 - 1, Math.random() * 2 - 1);

          const context = canvas?.getContext("webgpu");
          if (!canvas || !context) return;

          initBoidsPipeline(canvas, context, boidData.boids, boidData.size);
        });
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

  if (boidData.count > 10) return;

  const guiFolders: dat.GUI[] = [];

  boidData.boids.forEach(function (each, i) {
    guiFolders.push(gui!.addFolder(i.toString()));

    guiFolders[i].add(each.center, "x", -1, 1, 0.01).name("Position X");

    guiFolders[i].add(each.center, "y", -1, 1, 0.01).name("Position Y");

    guiFolders[i].add(each.velocity, "x", -1, 1, 0.01).name("Velocity X");

    guiFolders[i].add(each.velocity, "y", -1, 1, 0.01).name("Velocity Y");
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
