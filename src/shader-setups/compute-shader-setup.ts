export default class ComputeShaderSetup<
  Buffers extends {
    [key: string]: GPUBuffer;
  }
> {
  private device: GPUDevice;
  private buffers: Buffers;
  private computePipeline: GPUComputePipeline;
  private bindGroup: GPUBindGroup;
  private createBindGroup: (buffers: Buffers) => GPUBindGroup;

  constructor(
    shader: string,
    device: GPUDevice,
    buffers: Buffers,
    bindGroupLayout: GPUBindGroupLayout,
    createBindGroup: (buffers: Buffers) => GPUBindGroup
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

    this.createBindGroup = createBindGroup;
    this.bindGroup = this.createBindGroup(this.buffers);
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
