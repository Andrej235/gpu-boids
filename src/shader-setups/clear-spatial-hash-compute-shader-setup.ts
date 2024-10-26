export default function setupClearSpatialHashComputeShader(
  shader: string,
  device: GPUDevice,
  spatialHashBuffer: GPUBuffer
) {
  const shaderModule = device.createShaderModule({
    code: shader,
    label: "clear spatial hash compute shader",
  });

  const bindGroupLayout = device.createBindGroupLayout({
    label: "clear spatial hash compute bind group layout",
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

  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      {
        binding: 0,
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
      entryPoint: "compute_clear_spatial_hash_main",
    },
  });

  return () => {
    const computeCommandEncoder = device.createCommandEncoder();
    const computePassEncoder = computeCommandEncoder.beginComputePass();
    computePassEncoder.setPipeline(computePipeline);
    computePassEncoder.setBindGroup(0, bindGroup);

    computePassEncoder.dispatchWorkgroups(1);
    computePassEncoder.end();
    device.queue.submit([computeCommandEncoder.finish()]);
  };
}
