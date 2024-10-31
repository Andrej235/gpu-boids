import { swapChainFormat } from "../utility/constants";
import { RunVertexShaderPipeline } from "./shader-setups-types";

export default function setupVertexAndFragmentShaders(
  shader: string,
  device: GPUDevice,
  gpuCanvasContext: GPUCanvasContext,
  boidsComputeOutputBuffer: GPUBuffer
): RunVertexShaderPipeline {
  const shaderModule = device.createShaderModule({
    code: shader,
    label: "vertex and fragment shader",
  });

  const bindGroupLayout = device.createBindGroupLayout({
    label: "vertex and fragment shader bind group layout",
    entries: [
      {
        binding: 0,
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
          buffer: boidsComputeOutputBuffer,
        },
      },
    ],
  });

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

  return (boidsCount: number) => {
    const textureView = gpuCanvasContext.getCurrentTexture().createView();
    const commandEncoder = device.createCommandEncoder();

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
    passEncoder.draw(boidsCount * 3, 1, 0, 0);
    passEncoder.end();

    device.queue.submit([commandEncoder.finish()]);
  };
}
