import { Vector2 } from "three";

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
  rotation: number;
};

let shaderModule: GPUShaderModule | null = null;
let computeShaderModule: GPUShaderModule | null = null;

let bindGroup: GPUBindGroup | null = null;
let computeBindGroup: GPUBindGroup | null = null;

let bindGroupLayout: GPUBindGroupLayout | null = null;
let computeBindGroupLayout: GPUBindGroupLayout | null = null;

let pipeline: GPURenderPipeline | null = null;
let computePipeline: GPUComputePipeline | null = null;

let triangleSizeBuffer: GPUBuffer | null = null;
let aspectRatioBuffer: GPUBuffer | null = null;

function initBoidsPipeline(
  canvas: HTMLCanvasElement,
  context: GPUCanvasContext,
  boids: Boid[]
) {
  if (!device || !shader || !computeShader) return;

  const swapChainFormat = "bgra8unorm";
  context.configure({
    device: device,
    format: swapChainFormat,
  });

  shaderModule = device.createShaderModule({
    code: shader,
  });

  computeShaderModule = device.createShaderModule({
    code: computeShader,
  });

  //?BUFFERs *************************************************************************************************

  triangleSizeBuffer = device.createBuffer({
    size: 4, // 1 float
    usage:
      GPUBufferUsage.STORAGE |
      GPUBufferUsage.COPY_DST |
      GPUBufferUsage.COPY_SRC,
  });

  aspectRatioBuffer = getInputBuffer(device, [canvas.width / canvas.height], 4);

  bindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: {
          type: "read-only-storage",
        },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.VERTEX,
        buffer: {
          type: "read-only-storage",
        },
      },
      {
        binding: 2,
        visibility: GPUShaderStage.VERTEX,
        buffer: {
          type: "read-only-storage",
        },
      },
    ],
  });

  computeBindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: "storage",
        },
      },
    ],
  });

  bindGroup = createBindGroupForVertexShader(boids);

  computeBindGroup = device.createBindGroup({
    layout: computeBindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: {
          buffer: triangleSizeBuffer,
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

  pipeline = device.createRenderPipeline({
    vertex: {
      module: shaderModule,
      entryPoint: "vs_main",
    },
    fragment: {
      module: shaderModule,
      entryPoint: "fs_main",
      targets: [{ format: swapChainFormat }],
    },
    primitive: {
      topology: "triangle-list",
    },
    layout: device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    }),
  });
}

function createBindGroupForVertexShader(boids: Boid[]) {
  if (
    !device ||
    !bindGroupLayout ||
    !triangleSizeBuffer ||
    !aspectRatioBuffer ||
    boids.length === 0
  )
    return null;

  return device.createBindGroup({
    layout: bindGroupLayout,
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
          buffer: getInputBuffer(
            device,
            getWGSLRepresentation(boids),
            boids.length * 12
          ),
        },
      },
      {
        binding: 2,
        resource: {
          buffer: aspectRatioBuffer,
        },
      },
    ],
  });
}

export function drawBoids(
  canvas: HTMLCanvasElement,
  boids: Boid[],
  boidSize: number = 0.05
) {
  if (!device || !shader || !computeShader) return;

  const context = canvas.getContext("webgpu");
  if (!context) {
    console.log("Failed to get webgpu context");
    return;
  }

  if (!pipeline || !computePipeline) {
    initBoidsPipeline(canvas, context, boids);
    return drawBoids(canvas, boids, boidSize);
  }

  bindGroup = createBindGroupForVertexShader(boids);

  const computeCommandEncoder = device.createCommandEncoder();
  const computePassEncoder = computeCommandEncoder.beginComputePass();
  computePassEncoder.setPipeline(computePipeline);
  computePassEncoder.setBindGroup(0, computeBindGroup);
  computePassEncoder.dispatchWorkgroups(1);
  computePassEncoder.end();
  device.queue.submit([computeCommandEncoder.finish()]);

  const commandEncoder = device.createCommandEncoder();
  const textureView = context.getCurrentTexture().createView();

  const passEncoder = commandEncoder.beginRenderPass({
    colorAttachments: [
      {
        view: textureView,
        loadOp: "clear",
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
        storeOp: "store",
      },
    ],
  });

  passEncoder.setPipeline(pipeline);
  passEncoder.setBindGroup(0, bindGroup);
  passEncoder.draw(boids.length * 3, 1, 0, 0);
  passEncoder.end();

  device.queue.submit([commandEncoder.finish()]);
}

function getInputBuffer(
  device: GPUDevice,
  arrayBuffer: number[],
  size: number
): GPUBuffer {
  const gpuInputBuffer = device.createBuffer({
    mappedAtCreation: true,
    size,
    usage: GPUBufferUsage.STORAGE,
  });

  const arrayInputBuffer = gpuInputBuffer.getMappedRange();
  new Float32Array(arrayInputBuffer).set(arrayBuffer);
  gpuInputBuffer.unmap();

  return gpuInputBuffer;
}

function getWGSLRepresentation(boids: Boid[]) {
  return boids.flatMap((boid) => [boid.center.x, boid.center.y, boid.rotation]);
}
