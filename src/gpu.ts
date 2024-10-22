import { Vector2 } from "three";

let device: GPUDevice | null = null;
let shader: string | null = null;

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
}

export type Boid = {
  center: Vector2;
  velocity: Vector2;
  rotation: number;
};

export async function drawBoids(
  canvas: HTMLCanvasElement,
  boids: Boid[],
  boidSize: number = 0.05
) {
  if (!device || !shader) return;

  const context = canvas.getContext("webgpu");
  if (!context) {
    console.log("Failed to get webgpu context");
    return;
  }

  const swapChainFormat = "bgra8unorm";
  context.configure({
    device: device,
    format: swapChainFormat,
  });

  const shaderModule = device.createShaderModule({
    code: shader,
  });

  //?BUFFER *************************************************************************************************

  const bindGroupLayout = device.createBindGroupLayout({
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

  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: {
          buffer: getInputBuffer(device, [boidSize], 4),
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
          buffer: getInputBuffer(device, [canvas.width / canvas.height], 4),
        },
      },
    ],
  });

  //?BUFFER *************************************************************************************************

  const pipeline = device.createRenderPipeline({
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
