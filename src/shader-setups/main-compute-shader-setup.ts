import type { RunComputeShaderPipeline } from "./shader-setups-types";

export default function setupMainComputeShader(
  shader: string,
  device: GPUDevice,
  triangleSizeBuffer: GPUBuffer,
  aspectRatioBuffer: GPUBuffer,
  boidsCountBuffer: GPUBuffer,
  boidsBuffer: GPUBuffer,
  boidsComputeOutputBuffer: GPUBuffer,
  spatialHashBuffer: GPUBuffer
): RunComputeShaderPipeline {
  const computeShaderModule = device.createShaderModule({
    code: shader,
    label: "main compute shader",
  });

  const computeBindGroupLayout = device.createBindGroupLayout({
    label: "main compute bind group layout",
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
          type: "read-only-storage",
        },
      },
    ],
  });

  const computeBindGroup = device.createBindGroup({
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

  const computePipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [computeBindGroupLayout],
    }),
    compute: {
      module: computeShaderModule,
      entryPoint: "compute_main",
    },
  });

  return (x, y, z) => {
    const computeCommandEncoder = device.createCommandEncoder();
    const computePassEncoder = computeCommandEncoder.beginComputePass();
    
    computePassEncoder.setPipeline(computePipeline);
    computePassEncoder.setBindGroup(0, computeBindGroup);
    computePassEncoder.dispatchWorkgroups(x, y, z);
    computePassEncoder.end();

    device.queue.submit([computeCommandEncoder.finish()]);
  };
}
