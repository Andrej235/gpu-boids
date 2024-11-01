import { Vector2 } from "three";
import setupVertexShader from "../shader-setups/2d/main-vertex-shader-setup";
import setupMainComputeShader from "../shader-setups/2d/main-compute-shader-setup";
import { getBuffer } from "./get-gpu-buffer";
import setupSpatialHashComputeShader from "../shader-setups/2d/spatial-hash=compute=shader=setup";
import setupClearSpatialHashComputeShader from "../shader-setups/2d/clear-spatial-hash-compute-shader-setup";
import { swapChainFormat } from "../utility/constants";
import getTextFromFile from "../utility/get-text-from-file";
import setupVertexShader3D from "../shader-setups/3d/main-vertex-shader-setup-3d";

export type Boid = {
  center: Vector2;
  velocity: Vector2;
};

export enum Dimensions {
  TwoDimensions = "2d",
  ThreeDimensions = "3d",
}

export type BoidParameters = {
  dimensions: Dimensions;
  boidSize: number;
  maxSpeed: number;
  maxSteeringForce: number;
  edgeAvoidanceForce: number;
  separationForce: number;
  maxSeparationDistance: number;
  alignmentForce: number;
  cohesionForce: number;
  visualRange: number;
};

export default class GPUController {
  private device: GPUDevice = null!;
  private vertexShader: string = null!;
  private mainComputeShader: string = null!;
  private spatialHashComputeShader: string = null!;
  private clearSpatialHashComputeShader: string = null!;

  private vertexShader3D: string = null!;

  private triangleSizeBuffer: GPUBuffer = null!;
  private aspectRatioBuffer: GPUBuffer = null!;
  private boidsBuffer: GPUBuffer = null!;
  private boidsCountBuffer: GPUBuffer = null!;
  private boidsComputeOutputBuffer: GPUBuffer = null!;
  private spatialHashBuffer: GPUBuffer = null!;
  private boidBehaviorBuffer: GPUBuffer = null!;

  private runVertexShaders: ReturnType<typeof setupVertexShader> = null!;
  private runMainComputeShader: ReturnType<typeof setupMainComputeShader> =
    null!;
  private runSpatialHashComputeShader: ReturnType<
    typeof setupSpatialHashComputeShader
  > = null!;
  private runClearSpatialHashComputeShader: ReturnType<
    typeof setupClearSpatialHashComputeShader
  > = null!;

  private runVertexShaders3D: ReturnType<typeof setupVertexShader3D> = null!;

  private canvas: HTMLCanvasElement;
  private context: GPUCanvasContext;
  private boids: Boid[];
  private workgroupCount: number;

  private boidParameters: BoidParameters = {
    dimensions: Dimensions.TwoDimensions,
    boidSize: 0.01,
    maxSpeed: 0.001,
    maxSteeringForce: 0.0001,
    edgeAvoidanceForce: 0.05,
    separationForce: 1,
    maxSeparationDistance: 0.02,
    alignmentForce: 0.5,
    cohesionForce: 0.0125,
    visualRange: 0.07,
  };

  private constructor(canvas: HTMLCanvasElement, boids: Boid[]) {
    this.canvas = canvas;
    const context = canvas.getContext("webgpu");
    if (!context) throw new Error("Failed to get GPU context from canvas.");
    this.context = context;

    this.boids = boids;
    if (boids.length < 1) throw new Error("No boids provided.");

    this.workgroupCount = Math.ceil(Math.sqrt(boids.length) / 16);
  }

  static async create(canvas: HTMLCanvasElement, boids: Boid[]) {
    const newController = new GPUController(canvas, boids);

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
    this.vertexShader = await getTextFromFile("shaders/2d/vertex-shader.wgsl");
    this.mainComputeShader = await getTextFromFile(
      "shaders/2d/main-compute.wgsl"
    );
    this.spatialHashComputeShader = await getTextFromFile(
      "shaders/2d/spatial-hash-compute.wgsl"
    );
    this.clearSpatialHashComputeShader = await getTextFromFile(
      "shaders/2d/spatial-hash-clear-compute.wgsl"
    );

    this.vertexShader3D = await getTextFromFile(
      "shaders/3d/vertex-shader.wgsl"
    );

    this.runVertexShaders = setupVertexShader(
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
      this.spatialHashBuffer,
      this.boidBehaviorBuffer
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

    this.runVertexShaders3D = setupVertexShader3D(
      this.vertexShader3D,
      this.device,
      this.context
    );
  }

  private initBuffers() {
    this.triangleSizeBuffer = getBuffer(this.device, "size", 4, [
      this.boidParameters.boidSize,
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
      []
    );

    this.boidBehaviorBuffer = getBuffer(this.device, "boidBehavior", 32, [
      this.boidParameters.maxSpeed,
      this.boidParameters.maxSteeringForce,
      this.boidParameters.edgeAvoidanceForce,
      this.boidParameters.separationForce,
      this.boidParameters.maxSeparationDistance,
      this.boidParameters.alignmentForce,
      this.boidParameters.cohesionForce,
      this.boidParameters.visualRange,
    ]);
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
    //TODO: Replace with a simple state machine
    if (this.boidParameters.dimensions === Dimensions.TwoDimensions) {
      this.runClearSpatialHashComputeShader.run(1);
      this.runSpatialHashComputeShader.run(
        this.workgroupCount,
        this.workgroupCount
      );
      this.runMainComputeShader.run(this.workgroupCount, this.workgroupCount);
      this.runVertexShaders.run(this.boids.length * 3);
    } else {
      this.runVertexShaders3D.run(6);
    }
  }

  public get BoidParameters(): BoidParameters {
    return this.boidParameters;
  }

  setParameters(parameters: Partial<BoidParameters>) {
    for (const key in parameters) {
      const newValue = parameters[key as keyof typeof parameters];
      if (newValue === undefined) continue;

      this.updateParameter(key as keyof BoidParameters, newValue);
    }
  }

  private updateParameter<T extends keyof BoidParameters>(
    key: T,
    value: BoidParameters[T]
  ) {
    this.boidParameters[key] = value;

    switch (key) {
      case "boidSize":
        this.triangleSizeBuffer = getBuffer(this.device, "size", 4, [
          this.boidParameters.boidSize,
        ]);

        this.runMainComputeShader.updateBuffer(
          "triangleSizeBuffer",
          this.triangleSizeBuffer
        );
        break;

      case "maxSpeed":
      case "maxSteeringForce":
      case "edgeAvoidanceForce":
      case "separationForce":
      case "maxSeparationDistance":
      case "alignmentForce":
      case "cohesionForce":
      case "visualRange":
        this.boidBehaviorBuffer = getBuffer(this.device, "boidBehavior", 32, [
          this.boidParameters.maxSpeed,
          this.boidParameters.maxSteeringForce,
          this.boidParameters.edgeAvoidanceForce,
          this.boidParameters.separationForce,
          this.boidParameters.maxSeparationDistance,
          this.boidParameters.alignmentForce,
          this.boidParameters.cohesionForce,
          this.boidParameters.visualRange,
        ]);

        this.runMainComputeShader.updateBuffer(
          "boidBehaviorBuffer",
          this.boidBehaviorBuffer
        );
        break;

      default:
        break;
    }
  }
}
