export default class ComputeShaderSetup<
  Buffers extends {
    [key: string]: GPUBuffer;
  } = any
> {
  private label: string;
  private device: GPUDevice;
  private buffers: Buffers;
  private computePipeline: GPUComputePipeline;
  private bindGroupLayout: GPUBindGroupLayout;

  private bindGroupEntries: GPUBindGroupEntry[];
  private bindGroupEntriesIndexMap: Map<keyof Buffers, number>;
  private bindGroup: GPUBindGroup;

  constructor(
    label: string,
    shader: string,
    device: GPUDevice,
    buffers: Buffers,
    bindGroupTemplate: {
      [key in keyof Buffers]: GPUBufferBindingType;
    }
  ) {
    this.device = device;
    this.buffers = buffers;
    this.label = label;

    const computeShaderModule = device.createShaderModule({
      code: shader,
      label: label + " shader module",
    });

    const bindGroupLayoutEntries: GPUBindGroupLayoutEntry[] = [];
    this.bindGroupEntries = [];
    this.bindGroupEntriesIndexMap = new Map();

    const bufferKeys = Object.keys(bindGroupTemplate);
    for (let i = 0; i < bufferKeys.length; i++) {
      const key = bufferKeys[i];
      const type = bindGroupTemplate[key];

      bindGroupLayoutEntries.push({
        binding: i,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type,
        },
      });

      this.bindGroupEntriesIndexMap.set(key, i);

      this.bindGroupEntries.push({
        binding: i,
        resource: {
          label: `${label} buffer - ${key.toString()}`,
          buffer: this.buffers[key],
        },
      });
    }

    this.bindGroupLayout = device.createBindGroupLayout({
      label: `${label} bind group layout`,
      entries: bindGroupLayoutEntries,
    });

    this.computePipeline = device.createComputePipeline({
      layout: device.createPipelineLayout({
        bindGroupLayouts: [this.bindGroupLayout],
      }),
      compute: {
        module: computeShaderModule,
        entryPoint: "compute_main",
      },
    });

    this.bindGroup = device.createBindGroup({
      label: label + " bind group",
      layout: this.bindGroupLayout,
      entries: this.bindGroupEntries,
    });
  }

  updateBuffer(key: keyof Buffers, newBuffer: GPUBuffer) {
    (this.buffers[key] as GPUBuffer) = newBuffer;

    const index = this.bindGroupEntriesIndexMap.get(key)!;
    this.bindGroupEntries[index] = {
      binding: index,
      resource: {
        buffer: this.buffers[key],
        label: `${this.label} buffer - ${key.toString()}`,
      },
    };

    this.bindGroup = this.device.createBindGroup({
      label: this.label + " bind group",
      layout: this.bindGroupLayout,
      entries: this.bindGroupEntries,
    });
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
