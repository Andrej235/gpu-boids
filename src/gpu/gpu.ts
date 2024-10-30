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

  private canvas: HTMLCanvasElement;
  private context: GPUCanvasContext;
  private boids: Boid[];
  private boidSize: number;

  private constructor(
    canvas: HTMLCanvasElement,
    boids: Boid[],
    boidSize: number
  ) {
    this.canvas = canvas;
    const context = canvas.getContext("webgpu");
    if (!context) throw new Error("Failed to get GPU context from canvas.");
    this.context = context;

    this.boids = boids;
    if (boids.length < 1) throw new Error("No boids provided.");

    this.boidSize = boidSize;
    if (boidSize <= 0) throw new Error("Boid size must be greater than 0.");
  }

  static async create(
    canvas: HTMLCanvasElement,
    boids: Boid[],
    boidSize: number
  ) {
    const newController = new GPUController(canvas, boids, boidSize);

    await newController.initGPU();
    await newController.initShaders();
    newController.initBoidsPipeline();

    return newController;
  }

  private async initGPU() {
    if (!("gpu" in navigator)) {
      throw new Error(
        "WebGPU is not supported. Enable chrome://flags/#enable-unsafe-webgpu flag."
      );
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      console.log("Failed to get GPU adapter.");
      return;
    }
    this.device = await adapter.requestDevice();
  }

  private async initShaders() {
    const wgsl = await fetch("shader.wgsl");
    this.vertexShader = await wgsl.text();

    const computeWgsl = await fetch("main-compute.wgsl");
    this.mainComputeShader = await computeWgsl.text();

    const spatialHashWgsl = await fetch("spatial-hash-compute.wgsl");
    this.spatialHashComputeShader = await spatialHashWgsl.text();

    const clearSpatialHashWgsl = await fetch("spatial-hash-clear-compute.wgsl");
    this.clearSpatialHashComputeShader = await clearSpatialHashWgsl.text();
  }

  private initBoidsPipeline() {
    const swapChainFormat = "bgra8unorm";
    this.context.configure({
      device: this.device,
      format: swapChainFormat,
    });

    //?BUFFERs *************************************************************************************************

    this.triangleSizeBuffer = getBuffer(this.device, "size", 4, [
      this.boidSize,
    ]);
    this.aspectRatioBuffer = getBuffer(this.device, "aspectRatio", 4, [
      this.canvas.width / this.canvas.height,
    ]);
    this.boidsBuffer = getBuffer(
      this.device,
      "boids",
      this.boids.length * 20,
      this.getWGSLRepresentation(this.boids)
    );
    this.boidsCountBuffer = getBuffer(this.device, "boidsCount", 4, [
      this.boids.length,
    ]);

    this.boidsComputeOutputBuffer = getBuffer(
      this.device,
      "boidsComputeOutput",
      this.boids.length * 24,
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
      this.context,
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
    this.runClearSpatialHashComputeShader(boids.length);
    this.runSpatialHashComputeShader(boids.length);
    this.runMainComputeShader(boids.length);
    this.runVertAndFragShaders(boids.length);
  }

  private getWGSLRepresentation(boids: Boid[]) {
    return boids.flatMap((boid) => [
      boid.center.x,
      boid.center.y,
      boid.velocity.x,
      boid.velocity.y,
      0,
    ]);
  }
}
