import { Vector2 } from "three";
import { setupVertexAndFragmentShaders } from "./setup-shader";
import { swapChainFormat } from "./constants";

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

let computeShaderModule: GPUShaderModule | null = null;
let computeBindGroup: GPUBindGroup | null = null;
let computeBindGroupLayout: GPUBindGroupLayout | null = null;

let pipeline: GPURenderPipeline | null = null;
let computePipeline: GPUComputePipeline | null = null;

let triangleSizeBuffer: GPUBuffer | null = null;
let aspectRatioBuffer: GPUBuffer | null = null;
let boidsBuffer: GPUBuffer | null = null;
let boidsCountBuffer: GPUBuffer | null = null;
let boidsComputeOutputBuffer: GPUBuffer | null = null;
let spatialHashBuffer: GPUBuffer | null = null;

let draw: ((boidsCount: number) => void) | null = null;

export function initBoidsPipeline(
  canvas: HTMLCanvasElement,
  context: GPUCanvasContext,
  boids: Boid[],
  boidSize: number
) {
  if (!device || !shader || !computeShader) return;

  context.configure({
    device,
    format: swapChainFormat,
  });

  computeShaderModule = device.createShaderModule({
    code: computeShader,
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

  computeBindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: "read-only-storage",
        },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: "read-only-storage",
        },
      },
      {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: "read-only-storage",
        },
      },
      {
        binding: 3,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: "storage",
        },
      },
      {
        binding: 4,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: "storage",
        },
      },
      {
        binding: 5,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: "storage",
        },
      },
    ],
  });

  computeBindGroup = device.createBindGroup({
    layout: computeBindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: {
          buffer: triangleSizeBuffer,
        },
      },
      {
        binding: 1,
        resource: {
          buffer: aspectRatioBuffer,
        },
      },
      {
        binding: 2,
        resource: {
          buffer: boidsCountBuffer,
        },
      },
      {
        binding: 3,
        resource: {
          buffer: boidsBuffer,
        },
      },
      {
        binding: 4,
        resource: {
          buffer: boidsComputeOutputBuffer,
        },
      },
      {
        binding: 5,
        resource: {
          buffer: spatialHashBuffer,
        },
      },
    ],
  });

  //? ********************************************************************************************************

  computePipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [computeBindGroupLayout],
    }),
    compute: {
      module: computeShaderModule,
      entryPoint: "compute_main",
    },
  });

  draw = setupVertexAndFragmentShaders(
    shader,
    device,
    context,
    boidsComputeOutputBuffer
  );
}

export function drawBoids(
  canvas: HTMLCanvasElement,
  boids: Boid[],
  boidSize: number = 0.05
) {
  if (!device) return;

  const context = canvas.getContext("webgpu");
  if (!context) {
    console.log("Failed to get webgpu context");
    return;
  }

  if (!pipeline || !computePipeline || !draw) {
    initBoidsPipeline(canvas, context, boids, boidSize);
    return drawBoids(canvas, boids, boidSize);
  }

  const computeCommandEncoder = device.createCommandEncoder();
  const computePassEncoder = computeCommandEncoder.beginComputePass();
  computePassEncoder.setPipeline(computePipeline);
  computePassEncoder.setBindGroup(0, computeBindGroup);

  const boidLenghtSqrt = Math.ceil(Math.sqrt(boids.length));
  computePassEncoder.dispatchWorkgroups(
    Math.ceil(boidLenghtSqrt / 16),
    Math.ceil(boidLenghtSqrt / 16),
    1
  );

  computePassEncoder.end();
  device.queue.submit([computeCommandEncoder.finish()]);

  draw(boids.length);
}

function getBuffer(
  device: GPUDevice,
  label: string,
  size: number,
  arrayBuffer: number[] = [],
  usage: GPUBufferUsageFlags = GPUBufferUsage.STORAGE
): GPUBuffer {
  const gpuBuffer = device.createBuffer({
    mappedAtCreation: true,
    size,
    usage: usage,
    label,
  });

  if (arrayBuffer.length > 0) {
    const arrayInputBuffer = gpuBuffer.getMappedRange();
    new Float32Array(arrayInputBuffer).set(arrayBuffer);
  }

  gpuBuffer.unmap();
  return gpuBuffer;
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
