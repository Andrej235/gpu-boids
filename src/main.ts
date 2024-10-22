import "./style.css";
import { Boid, drawBoids, initGPU } from "./gpu";
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
      rotation: Math.PI / 4,
    },
    {
      center: new Vector2(0, 0.5),
      rotation: Math.PI / 4,
    },
    {
      center: new Vector2(0.3, -0.4),
      rotation: Math.PI / 4,
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
        new Array<Boid>(newCount - oldCount)
          .fill({ center: new Vector2(0, 0), rotation: 0 })
          .map(() => ({
            center: new Vector2(0, 0),
            rotation: Math.PI / 4,
          }))
      );

    gui?.destroy();
    initGUI();
  });

  gui.add(
    {
      "Randomize Boids": () => {
        boidData.boids.forEach((each) => {
          each.center.x = Math.random() - 0.5;
          each.center.y = Math.random() - 0.5;
        });
      },
    },
    "Randomize Boids"
  );

  const guiFolders: dat.GUI[] = [];

  // data is an array of objects
  boidData.boids.forEach(function (each, i) {
    guiFolders.push(gui!.addFolder(i.toString()));

    guiFolders[i]
      .add(each.center, "x", undefined, undefined, 0.01)
      .name("Position X");

    guiFolders[i]
      .add(each.center, "y", undefined, undefined, 0.01)
      .name("Position Y");

    guiFolders[i].add(each, "rotation").name("Rotation");
  });
}

async function update() {
  if (!canvas) {
    requestAnimationFrame(update);
    return;
  }

  stats?.begin();
  await drawBoids(canvas, boidData.boids, boidData.size);
  stats?.end();

  requestAnimationFrame(update);
}

init();
