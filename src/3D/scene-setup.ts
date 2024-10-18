import * as THREE from "three";

export default function initScene(): [
  THREE.Scene,
  THREE.PerspectiveCamera,
  THREE.WebGLRenderer
] {
  const appRoot = document.getElementById("app");
  if (!appRoot) {
    console.log("Failed to get app root element");
    throw new Error("Failed to get app root element");
  }

  const canvas = document.createElement("canvas");
  appRoot.appendChild(canvas);
  canvas.height = window.innerHeight;
  canvas.width = window.innerWidth;
  canvas.style.width = "100%";
  canvas.style.height = "100%";

  const renderer = setupRenderer(canvas);
  const camera = setupCamera();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  renderer.render(scene, camera);
  return [scene, camera, renderer];
}

function setupRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
  return new THREE.WebGLRenderer({ antialias: true, canvas });
}

function setupCamera(): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 5;

  return camera;
}
