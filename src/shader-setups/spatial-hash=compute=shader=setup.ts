export default function setupSpatialHashComputeShader(
  shader: string,
  device: GPUDevice,
  boidsBuffer: GPUBuffer,
  boidsCountBuffer: GPUBuffer,
  spatialHashBuffer: GPUBuffer
) {
  const shaderModule = device.createShaderModule({
    code: shader,
    label: "spatial hash compute shader",
  });

  const bindGroupLayout = device.createBindGroupLayout({
    label: "spatial hash compute bind group layout",
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
          type: "storage",
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
          buffer: boidsBuffer,
        },
      },
      {
        binding: 1,
        resource: {
          buffer: boidsCountBuffer,
        },
      },
      {
        binding: 2,
        resource: {
          buffer: spatialHashBuffer,
        },
      },
    ],
  });

  const computePipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    }),
    compute: {
      module: shaderModule,
      entryPoint: "compute_spatial_hash_main",
    },
  });

  return (boidsCount: number) => {
    const computeCommandEncoder = device.createCommandEncoder();
    const computePassEncoder = computeCommandEncoder.beginComputePass();
    computePassEncoder.setPipeline(computePipeline);
    computePassEncoder.setBindGroup(0, bindGroup);

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
