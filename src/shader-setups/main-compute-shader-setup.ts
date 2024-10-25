export function setupMainComputeShader(
  shader: string,
  device: GPUDevice,
  triangleSizeBuffer: GPUBuffer,
  aspectRatioBuffer: GPUBuffer,
  boidsCountBuffer: GPUBuffer,
  boidsBuffer: GPUBuffer,
  boidsComputeOutputBuffer: GPUBuffer,
  spatialHashBuffer: GPUBuffer
) {
  const computeShaderModule = device.createShaderModule({
    code: shader,
  });

  const computeBindGroupLayout = device.createBindGroupLayout({
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

  return (boidsCount: number) => {
    const computeCommandEncoder = device.createCommandEncoder();
    const computePassEncoder = computeCommandEncoder.beginComputePass();
    computePassEncoder.setPipeline(computePipeline);
    computePassEncoder.setBindGroup(0, computeBindGroup);

    const boidLenghtSqrt = Math.ceil(Math.sqrt(boidsCount));
    computePassEncoder.dispatchWorkgroups(
      Math.ceil(boidLenghtSqrt / 16),
      Math.ceil(boidLenghtSqrt / 16),
      1
    );

    computePassEncoder.end();
    device.queue.submit([computeCommandEncoder.finish()]);
  };
}
