export default class ComputeShaderSetup<
  Buffers extends {
    [key: string]: GPUBuffer;
  }
> {
  private device: GPUDevice;
  private buffers: Buffers;
  private computePipeline: GPUComputePipeline;
  private bindGroup: GPUBindGroup;

  constructor(
    label: string,
    shader: string,
    device: GPUDevice,
    buffers: Buffers,
    bindGroupLayout: GPUBindGroupLayout,
    bufferOrder: (keyof Buffers)[]
  ) {
    this.device = device;
    this.buffers = buffers;

    const computeShaderModule = device.createShaderModule({
      code: shader,
      label: "main compute shader",
    });

    this.computePipeline = device.createComputePipeline({
      layout: device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
      }),
      compute: {
        module: computeShaderModule,
        entryPoint: "compute_main",
      },
    });

    this.bindGroup = device.createBindGroup({
      label: label + " bind group",
      layout: bindGroupLayout,
      entries: bufferOrder.map((key, i) => ({
        binding: i,
        resource: {
          label: `${label} buffer: ${key.toString()}`,
          buffer: this.buffers[key],
        },
      })),
    });
  }

  updateBuffer(newBuffer: GPUBuffer, label: keyof Buffers) {
    (this.buffers[label] as GPUBuffer) = newBuffer;
  }

  run(
    workgroupCountX: GPUSize32,
    workgroupCountY?: GPUSize32,
    workgroupCountZ?: GPUSize32
  ) {
    const computeCommandEncoder = this.device.createCommandEncoder();
    const computePassEncoder = computeCommandEncoder.beginComputePass();

    computePassEncoder.setPipeline(this.computePipeline);
    computePassEncoder.setBindGroup(0, this.bindGroup);
    computePassEncoder.dispatchWorkgroups(
      workgroupCountX,
      workgroupCountY,
      workgroupCountZ
    );
    computePassEncoder.end();

    this.device.queue.submit([computeCommandEncoder.finish()]);
  }
}
