import "./style.css";
import { Boid, drawBoids, initGPU } from "./gpu";
import Stats from "stats.js";
import * as dat from "dat.gui";
import { Vector2 } from "three";

let stats: Stats | null = null;
let canvas: HTMLCanvasElement | null = null;

let boids: Boid[] = [
  {
    center: new Vector2(0, 0),
    rotation: Math.PI / 4,
    triangleSize: 0.05,
  },
  {
    center: new Vector2(0, 0.5),
    rotation: Math.PI / 4,
    triangleSize: 0.05,
  },
  {
    center: new Vector2(0.3, -0.4),
    rotation: Math.PI / 4,
    triangleSize: 0.05,
  },
];

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

function initGUI() {
  const gui = new dat.GUI();
  const guiFolders: dat.GUI[] = [];

  // data is an array of objects
  boids.forEach(function (each, i) {
    guiFolders.push(gui.addFolder(i.toString()));

    guiFolders[i]
      .add(each.center, "x", undefined, undefined, 0.01)
      .name("Position X");

    guiFolders[i]
      .add(each.center, "y", undefined, undefined, 0.01)
      .name("Position Y");

    guiFolders[i].add(each, "rotation").name("Rotation");
    guiFolders[i].add(each, "triangleSize").name("Size");
  });
}

async function update() {
  if (!canvas) {
    requestAnimationFrame(update);
    return;
  }

  stats?.begin();
  await drawBoids(canvas, boids);
  stats?.end();

  requestAnimationFrame(update);
}

init();
