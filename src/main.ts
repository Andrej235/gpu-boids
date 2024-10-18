import "./style.css";
import initScene from "./3D/scene-setup";
import initDatGUI from "./dat.gui";
import { initGPU } from "./gpu";
import initBoids from "./3D/boid-controller";

async function init() {
  await initGPU();

  initDatGUI();
  const [scene, camera, renderer] = initScene();

  const boids = initBoids(scene, 1000);
  renderer.render(scene, camera);

  console.log(boids);
}

init();
