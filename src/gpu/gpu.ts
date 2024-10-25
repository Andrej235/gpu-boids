import { Vector2 } from "three";
import { setupVertexAndFragmentShaders } from "../shader-setups/vertex-shader-setup";
import { RunShaderPipeline } from "../shader-setups/shader-setups-types";
import { setupMainComputeShader } from "../shader-setups/main-compute-shader-setup";
import { getBuffer } from "./get-gpu-buffer";

let device: GPUDevice | null = null;
let shader: string | null = null;
let computeShader: string | null = null;

export async function initGPU() {
  if (!("gpu" in navigator)) {
    console.log(
      "WebGPU is not supported. Enable chrome://flags/#enable-unsafe-webgpu flag."
    );
    return;
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    console.log("Failed to get GPU adapter.");
    return;
  }
  device = await adapter.requestDevice();

  const wgsl = await fetch("shader.wgsl");
  shader = await wgsl.text();

  const computeWgsl = await fetch("compute.wgsl");
  computeShader = await computeWgsl.text();
}

export type Boid = {
  center: Vector2;
  velocity: Vector2;
};

let triangleSizeBuffer: GPUBuffer | null = null;
let aspectRatioBuffer: GPUBuffer | null = null;
let boidsBuffer: GPUBuffer | null = null;
let boidsCountBuffer: GPUBuffer | null = null;
let boidsComputeOutputBuffer: GPUBuffer | null = null;
let spatialHashBuffer: GPUBuffer | null = null;

let runVertAndFragShaders: RunShaderPipeline | null = null;
let runMainComputeShader: RunShaderPipeline | null = null;

export function initBoidsPipeline(
  canvas: HTMLCanvasElement,
  context: GPUCanvasContext,
  boids: Boid[],
  boidSize: number
) {
  if (!device || !shader || !computeShader) return;

  const swapChainFormat = "bgra8unorm";
  context.configure({
    device: device,
    format: swapChainFormat,
  });

  //?BUFFERs *************************************************************************************************

  triangleSizeBuffer = getBuffer(device, "size", 4, [boidSize]);
  aspectRatioBuffer = getBuffer(device, "aspectRatio", 4, [
    canvas.width / canvas.height,
  ]);
  boidsBuffer = getBuffer(
    device,
    "boids",
    boids.length * 20,
    getWGSLRepresentation(boids)
  );
  boidsCountBuffer = getBuffer(device, "boidsCount", 4, [boids.length]);

  boidsComputeOutputBuffer = getBuffer(
    device,
    "boidsComputeOutput",
    boids.length * 48,
    []
  ); //48 = 4 bytes per float of 3 vector4s *per boid

  spatialHashBuffer = getBuffer(
    device,
    "spatialHash",
    8 + 11 * 11 * 4, //8 bytes for grid dimensions and cell size + 11x11 grid / spatial hash
    [],
    GPUBufferUsage.STORAGE
  );

  //? ********************************************************************************************************

  runVertAndFragShaders = setupVertexAndFragmentShaders(
    shader,
    device,
    context,
    boidsComputeOutputBuffer
  );

  runMainComputeShader = setupMainComputeShader(
    computeShader,
    device,
    triangleSizeBuffer,
    aspectRatioBuffer,
    boidsCountBuffer,
    boidsBuffer,
    boidsComputeOutputBuffer,
    spatialHashBuffer
  );
}

export function drawBoids(
  canvas: HTMLCanvasElement,
  boids: Boid[],
  boidSize: number = 0.05
) {
  if (!device) return;

  if (!runVertAndFragShaders || !runMainComputeShader) {
    const context = canvas.getContext("webgpu");
    if (!context) {
      console.log("Failed to get webgpu context");
      return;
    }

    initBoidsPipeline(canvas, context, boids, boidSize);
    return drawBoids(canvas, boids, boidSize);
  }

  runVertAndFragShaders(boids.length);
  runMainComputeShader(boids.length);
}

function getWGSLRepresentation(boids: Boid[]) {
  return boids.flatMap((boid) => [
    boid.center.x,
    boid.center.y,
    boid.velocity.x,
    boid.velocity.y,
    0,
  ]);
}
