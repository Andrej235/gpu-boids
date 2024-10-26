import { Vector2 } from "three";
import setupVertexAndFragmentShaders from "../shader-setups/vertex-shader-setup";
import setupMainComputeShader from "../shader-setups/main-compute-shader-setup";
import { RunShaderPipeline } from "../shader-setups/shader-setups-types";
import { getBuffer } from "./get-gpu-buffer";
import setupSpatialHashComputeShader from "../shader-setups/spatial-hash=compute=shader=setup";
import setupClearSpatialHashComputeShader from "../shader-setups/clear-spatial-hash-compute-shader-setup";

let device: GPUDevice | null = null;
let vertexShader: string | null = null;
let mainComputeShader: string | null = null;
let spatialHashComputeShader: string | null = null;
let clearSpatialHashComputeShader: string | null = null;

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
  vertexShader = await wgsl.text();

  const computeWgsl = await fetch("main-compute.wgsl");
  mainComputeShader = await computeWgsl.text();

  const spatialHashWgsl = await fetch("spatial-hash-compute.wgsl");
  spatialHashComputeShader = await spatialHashWgsl.text();

  const clearSpatialHashWgsl = await fetch("spatial-hash-clear-compute.wgsl");
  clearSpatialHashComputeShader = await clearSpatialHashWgsl.text();
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
let runSpatialHashComputeShader: RunShaderPipeline | null = null;
let runClearSpatialHashComputeShader: RunShaderPipeline | null = null;

export function initBoidsPipeline(
  canvas: HTMLCanvasElement,
  context: GPUCanvasContext,
  boids: Boid[],
  boidSize: number
) {
  if (
    !device ||
    !vertexShader ||
    !mainComputeShader ||
    !spatialHashComputeShader ||
    !clearSpatialHashComputeShader
  )
    return;

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
    8 * 8 * (32 * 4 + 4), //8x8 grid with (32 boids in each cell and a index count)
    [],
    GPUBufferUsage.STORAGE
  );

  //? ********************************************************************************************************

  runVertAndFragShaders = setupVertexAndFragmentShaders(
    vertexShader,
    device,
    context,
    boidsComputeOutputBuffer
  );

  runMainComputeShader = setupMainComputeShader(
    mainComputeShader,
    device,
    triangleSizeBuffer,
    aspectRatioBuffer,
    boidsCountBuffer,
    boidsBuffer,
    boidsComputeOutputBuffer,
    spatialHashBuffer
  );

  runSpatialHashComputeShader = setupSpatialHashComputeShader(
    spatialHashComputeShader,
    device,
    boidsBuffer,
    boidsCountBuffer,
    spatialHashBuffer
  );

  runClearSpatialHashComputeShader = setupClearSpatialHashComputeShader(
    clearSpatialHashComputeShader,
    device,
    spatialHashBuffer
  );
}

export function drawBoids(
  canvas: HTMLCanvasElement,
  boids: Boid[],
  boidSize: number = 0.05
) {
  if (!device) return;

  if (
    !runVertAndFragShaders ||
    !runMainComputeShader ||
    !runSpatialHashComputeShader ||
    !runClearSpatialHashComputeShader
  ) {
    const context = canvas.getContext("webgpu");
    if (!context) {
      console.log("Failed to get webgpu context");
      return;
    }

    initBoidsPipeline(canvas, context, boids, boidSize);
    return drawBoids(canvas, boids, boidSize);
  }

  runClearSpatialHashComputeShader(0);
  runSpatialHashComputeShader(boids.length);
  runMainComputeShader(boids.length);
  runVertAndFragShaders(boids.length);
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
