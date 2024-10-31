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
    bindGroupTeplate: {
      [key in keyof Buffers]: GPUBufferBindingType;
    }
  ) {
    this.device = device;
    this.buffers = buffers;

    const computeShaderModule = device.createShaderModule({
      code: shader,
      label: "main compute shader",
    });

    const bindGroupLayoutEntries: GPUBindGroupLayoutEntry[] = [];
    const bindGroupEntries: GPUBindGroupEntry[] = [];

    const bufferKeys = Object.keys(bindGroupTeplate);
    for (let i = 0; i < bufferKeys.length; i++) {
      const key = bufferKeys[i];
      const type = bindGroupTeplate[key];

      bindGroupLayoutEntries.push({
        binding: i,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type,
        },
      });

      bindGroupEntries.push({
        binding: i,
        resource: {
          label: `${label} buffer: ${key.toString()}`,
          buffer: this.buffers[key],
        },
      });
    }

    const bindGroupLayout = device.createBindGroupLayout({
      label: `${label} bind group layout`,
      entries: bindGroupLayoutEntries,
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
      entries: bindGroupEntries,
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
