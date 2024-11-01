import { swapChainFormat } from "../utility/constants";

export default class VertexShaderSetup<
  Buffers extends {
    [key: string]: GPUBuffer;
  } = any
> {
  private label: string;
  private device: GPUDevice;
  private buffers: Buffers;
  private context: GPUCanvasContext;
  private renderPipeline: GPURenderPipeline;
  private bindGroupLayout: GPUBindGroupLayout;

  private bindGroupEntries: GPUBindGroupEntry[];
  private bindGroupEntriesIndexMap: Map<keyof Buffers, number>;
  private bindGroup: GPUBindGroup;

  constructor(
    label: string,
    shader: string,
    device: GPUDevice,
    context: GPUCanvasContext,
    buffers: Buffers,
    bindGroupTemplate: {
      [key in keyof Buffers]: GPUBufferBindingType;
    }
  ) {
    this.device = device;
    this.buffers = buffers;
    this.label = label;
    this.context = context;

    const shaderModule = device.createShaderModule({
      code: shader,
      label: this.label + " shader module",
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
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
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

    this.renderPipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({
        bindGroupLayouts: [this.bindGroupLayout],
      }),
      vertex: {
        module: shaderModule,
        entryPoint: "vertex_main",
      },
      fragment: {
        module: shaderModule,
        entryPoint: "fragment_main",
        targets: [{ format: swapChainFormat }],
      },
      primitive: {
        topology: "triangle-list",
      },
    });

    this.bindGroup = device.createBindGroup({
      label: label + " bind group",
      layout: this.bindGroupLayout,
      entries: this.bindGroupEntries,
    });
  }

  run(vertexCount: number) {
    const textureView = this.context.getCurrentTexture().createView();
    const commandEncoder = this.device.createCommandEncoder();

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

    passEncoder.setPipeline(this.renderPipeline);
    passEncoder.setBindGroup(0, this.bindGroup);
    passEncoder.draw(vertexCount * 3, 1, 0, 0);
    passEncoder.end();

    this.device.queue.submit([commandEncoder.finish()]);
  }
}
