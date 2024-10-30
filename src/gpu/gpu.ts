import { Vector2 } from "three";
import setupVertexAndFragmentShaders from "../shader-setups/vertex-shader-setup";
import setupMainComputeShader from "../shader-setups/main-compute-shader-setup";
import { RunShaderPipeline } from "../shader-setups/shader-setups-types";
import { getBuffer } from "./get-gpu-buffer";
import setupSpatialHashComputeShader from "../shader-setups/spatial-hash=compute=shader=setup";
import setupClearSpatialHashComputeShader from "../shader-setups/clear-spatial-hash-compute-shader-setup";

export type Boid = {
  center: Vector2;
  velocity: Vector2;
};

export default class GPUController {
  private initialized: boolean = false;

  private device: GPUDevice = null!;
  private vertexShader: string = null!;
  private mainComputeShader: string = null!;
  private spatialHashComputeShader: string = null!;
  private clearSpatialHashComputeShader: string = null!;

  private triangleSizeBuffer: GPUBuffer = null!;
  private aspectRatioBuffer: GPUBuffer = null!;
  private boidsBuffer: GPUBuffer = null!;
  private boidsCountBuffer: GPUBuffer = null!;
  private boidsComputeOutputBuffer: GPUBuffer = null!;
  private spatialHashBuffer: GPUBuffer = null!;

  private runVertAndFragShaders: RunShaderPipeline = null!;
  private runMainComputeShader: RunShaderPipeline = null!;
  private runSpatialHashComputeShader: RunShaderPipeline = null!;
  private runClearSpatialHashComputeShader: RunShaderPipeline = null!;

  constructor(canvas: HTMLCanvasElement, boids: Boid[], boidSize: number) {
    this.initGPU(canvas, boids, boidSize);
  }

  private async initGPU(
    canvas: HTMLCanvasElement,
    boids: Boid[],
    boidSize: number
  ) {
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
    this.device = await adapter.requestDevice();

    const wgsl = await fetch("shader.wgsl");
    this.vertexShader = await wgsl.text();

    const computeWgsl = await fetch("main-compute.wgsl");
    this.mainComputeShader = await computeWgsl.text();

    const spatialHashWgsl = await fetch("spatial-hash-compute.wgsl");
    this.spatialHashComputeShader = await spatialHashWgsl.text();

    const clearSpatialHashWgsl = await fetch("spatial-hash-clear-compute.wgsl");
    this.clearSpatialHashComputeShader = await clearSpatialHashWgsl.text();

    this.initBoidsPipeline(canvas, boids, boidSize);

    this.initialized = true;
  }

  initBoidsPipeline(
    canvas: HTMLCanvasElement,
    boids: Boid[],
    boidSize: number
  ) {
    const context = canvas.getContext("webgpu");
    if (!context) {
      throw new Error("Failed to get GPU context from canvas.");
    }

    const swapChainFormat = "bgra8unorm";
    context.configure({
      device: this.device,
      format: swapChainFormat,
    });

    //?BUFFERs *************************************************************************************************

    this.triangleSizeBuffer = getBuffer(this.device, "size", 4, [boidSize]);
    this.aspectRatioBuffer = getBuffer(this.device, "aspectRatio", 4, [
      canvas.width / canvas.height,
    ]);
    this.boidsBuffer = getBuffer(
      this.device,
      "boids",
      boids.length * 20,
      this.getWGSLRepresentation(boids)
    );
    this.boidsCountBuffer = getBuffer(this.device, "boidsCount", 4, [
      boids.length,
    ]);

    this.boidsComputeOutputBuffer = getBuffer(
      this.device,
      "boidsComputeOutput",
      boids.length * 24,
      []
    ); //24 = 4 bytes per float of 3 vector2s *per boid

    this.spatialHashBuffer = getBuffer(
      this.device,
      "spatialHash",
      16 * 16 * (32 * 4 + 4), //8x8 grid with (32 boids in each cell and a index count)
      [],
      GPUBufferUsage.STORAGE
    );

    //? ********************************************************************************************************

    this.runVertAndFragShaders = setupVertexAndFragmentShaders(
      this.vertexShader,
      this.device,
      context,
      this.boidsComputeOutputBuffer
    );

    this.runMainComputeShader = setupMainComputeShader(
      this.mainComputeShader,
      this.device,
      this.triangleSizeBuffer,
      this.aspectRatioBuffer,
      this.boidsCountBuffer,
      this.boidsBuffer,
      this.boidsComputeOutputBuffer,
      this.spatialHashBuffer
    );

    this.runSpatialHashComputeShader = setupSpatialHashComputeShader(
      this.spatialHashComputeShader,
      this.device,
      this.boidsBuffer,
      this.boidsCountBuffer,
      this.spatialHashBuffer
    );

    this.runClearSpatialHashComputeShader = setupClearSpatialHashComputeShader(
      this.clearSpatialHashComputeShader,
      this.device,
      this.spatialHashBuffer
    );
  }

  drawBoids(boids: Boid[]): void {
    if (!this.initialized) return;

    this.runClearSpatialHashComputeShader(boids.length);
    this.runSpatialHashComputeShader(boids.length);
    this.runMainComputeShader(boids.length);
    this.runVertAndFragShaders(boids.length);
  }

  getWGSLRepresentation(boids: Boid[]) {
    return boids.flatMap((boid) => [
      boid.center.x,
      boid.center.y,
      boid.velocity.x,
      boid.velocity.y,
      0,
    ]);
  }
}
