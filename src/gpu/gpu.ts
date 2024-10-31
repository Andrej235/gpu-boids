import { Vector2 } from "three";
import setupVertexAndFragmentShaders from "../shader-setups/vertex-shader-setup";
import setupMainComputeShader from "../shader-setups/main-compute-shader-setup";
import type {
  RunComputeShaderPipeline,
  RunVertexShaderPipeline,
} from "../shader-setups/shader-setups-types";
import { getBuffer } from "./get-gpu-buffer";
import setupSpatialHashComputeShader from "../shader-setups/spatial-hash=compute=shader=setup";
import setupClearSpatialHashComputeShader from "../shader-setups/clear-spatial-hash-compute-shader-setup";
import { swapChainFormat } from "../utility/constants";
import getTextFromFile from "../utility/get-text-from-file";
import ComputeShaderSetup from "../shader-setups/compute-shader-setup";

export type Boid = {
  center: Vector2;
  velocity: Vector2;
};

export type BoidParameters = {
  boidSize: number;
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

  private runVertexShaders: RunVertexShaderPipeline = null!;
  private runMainComputeShader: ComputeShaderSetup = null!;
  private runSpatialHashComputeShader: RunComputeShaderPipeline = null!;
  private runClearSpatialHashComputeShader: RunComputeShaderPipeline = null!;

  private canvas: HTMLCanvasElement;
  private context: GPUCanvasContext;
  private boids: Boid[];
  private workgroupCount: number;
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

    this.workgroupCount = Math.ceil(Math.sqrt(boids.length) / 16);
  }

  static async create(
    canvas: HTMLCanvasElement,
    boids: Boid[],
    boidSize: number
  ) {
    const newController = new GPUController(canvas, boids, boidSize);

    await newController.initGPU();
    newController.initBuffers();
    await newController.initShaders();

    return newController;
  }

  private async initGPU() {
    if (!("gpu" in navigator)) {
      throw new Error(
        "WebGPU is not supported. Enable chrome://flags/#enable-unsafe-webgpu flag."
      );
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error("Failed to get GPU adapter.");

    this.device = await adapter.requestDevice();
    this.context.configure({
      device: this.device,
      format: swapChainFormat,
    });
  }

  private async initShaders() {
    this.vertexShader = await getTextFromFile("shader.wgsl");
    this.mainComputeShader = await getTextFromFile("main-compute.wgsl");
    this.spatialHashComputeShader = await getTextFromFile(
      "spatial-hash-compute.wgsl"
    );
    this.clearSpatialHashComputeShader = await getTextFromFile(
      "spatial-hash-clear-compute.wgsl"
    );

    this.runVertexShaders = setupVertexAndFragmentShaders(
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

  private initBuffers() {
    this.triangleSizeBuffer = getBuffer(this.device, "size", 4, [
      this.boidSize,
    ]);
    this.aspectRatioBuffer = getBuffer(this.device, "aspectRatio", 4, [
      this.canvas.width / this.canvas.height,
    ]);
    this.boidsBuffer = getBuffer(
      this.device,
      "boids",
      this.boids.length * 16,
      this.getWGSLBoidRepresentation(this.boids)
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
  }

  private getWGSLBoidRepresentation(boids: Boid[]) {
    return boids.flatMap((boid) => [
      boid.center.x,
      boid.center.y,
      boid.velocity.x,
      boid.velocity.y,
    ]);
  }

  drawBoids(): void {
    this.runClearSpatialHashComputeShader(1);
    this.runSpatialHashComputeShader(this.workgroupCount, this.workgroupCount);
    this.runMainComputeShader.run(this.workgroupCount, this.workgroupCount);
    this.runVertexShaders(this.boids.length);
  }

  getCurrentParameters(): BoidParameters {
    return {
      boidSize: this.boidSize,
    };
  }

  setParameters(parameters: Partial<BoidParameters>) {
    for (const key in parameters) {
      const newValue = parameters[key as keyof typeof parameters];
      if (newValue === undefined) continue;

      this.updateParameter(key as keyof BoidParameters, newValue);
    }
  }

  private updateParameter(key: keyof BoidParameters, value: number) {
    switch (key) {
      case "boidSize":
        this.boidSize = value;
        this.triangleSizeBuffer = getBuffer(this.device, "size", 4, [value]);

        this.runMainComputeShader.updateBuffer(this.triangleSizeBuffer, "triangleSizeBuffer")
        break;
    }
  }
}
