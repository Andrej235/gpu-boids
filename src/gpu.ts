let device: GPUDevice | null = null;
let computeShader: string | null = null;
let shader: string | null = null;

export async function initGPU() {
  if (!("gpu" in navigator)) {
    console.log(
      "WebGPU is not supported. Enable chrome://flags/#enable-unsafe-webgpu flag."
    );
    return;
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    console.log("Failed to get GPU adapter.");
    return;
  }
  device = await adapter.requestDevice();

  const wgslCompute = await fetch("compute.wgsl");
  computeShader = await wgslCompute.text();

  const wgsl = await fetch("shader.wgsl");
  shader = await wgsl.text();
}

export async function executeGPUOperations() {
  if (!device || !computeShader) return;

  // First Matrix

  const gpuBufferFirstInput = device.createBuffer({
    mappedAtCreation: true,
    size: 8,
    usage: GPUBufferUsage.STORAGE,
  });
  const arrayBufferFirstInput = gpuBufferFirstInput.getMappedRange();
  new Float32Array(arrayBufferFirstInput).set([1, 2]);
  gpuBufferFirstInput.unmap();

  // Second Matrix

  const gpuBufferSecondInput = device.createBuffer({
    mappedAtCreation: true,
    size: 8,
    usage: GPUBufferUsage.STORAGE,
  });
  const arrayBufferSecond = gpuBufferSecondInput.getMappedRange();
  new Float32Array(arrayBufferSecond).set([2, 7]);
  gpuBufferSecondInput.unmap();

  // Result Matrix

  const resultMatrixBuffer = device.createBuffer({
    size: 8,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });

  // Bind group layout and bind group

  const bindGroupLayout = device.createBindGroupLayout({
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
          buffer: gpuBufferFirstInput,
        },
      },
      {
        binding: 1,
        resource: {
          buffer: gpuBufferSecondInput,
        },
      },
      {
        binding: 2,
        resource: {
          buffer: resultMatrixBuffer,
        },
      },
    ],
  });

  // Compute shader code

  const shaderModule = device.createShaderModule({
    code: computeShader,
  });

  // Pipeline setup

  const computePipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    }),
    compute: {
      module: shaderModule,
      entryPoint: "main",
    },
  });

  // Commands submission

  const commandEncoder = device.createCommandEncoder();

  const passEncoder = commandEncoder.beginComputePass();
  passEncoder.setPipeline(computePipeline);
  passEncoder.setBindGroup(0, bindGroup);
  const workgroupCountX = 1;
  const workgroupCountY = 1;
  passEncoder.dispatchWorkgroups(workgroupCountX, workgroupCountY);
  passEncoder.end();

  // Get a GPU buffer for reading in an unmapped state.
  const gpuReadBuffer = device.createBuffer({
    size: 8,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });

  // Encode commands for copying buffer to buffer.
  commandEncoder.copyBufferToBuffer(
    resultMatrixBuffer /* source buffer */,
    0 /* source offset */,
    gpuReadBuffer /* destination buffer */,
    0 /* destination offset */,
    8 /* size */
  );

  // Submit GPU commands.
  const gpuCommands = commandEncoder.finish();
  device.queue.submit([gpuCommands]);

  // Read buffer.
  await gpuReadBuffer.mapAsync(GPUMapMode.READ);
  const arrayBuffer = gpuReadBuffer.getMappedRange();

  const res = new Float32Array(arrayBuffer);
  console.log(res);
  document.querySelector("h1#title")!.innerHTML = res.toString();
}

export async function drawWithGPU(canvas: HTMLCanvasElement) {
  if (!device || !shader) return;

  const context = canvas.getContext("webgpu");
  if (!context) {
    console.log("Failed to get webgpu context");
    return;
  }

  const swapChainFormat = "bgra8unorm";
  context.configure({
    device: device,
    format: swapChainFormat,
  });

  const shaderModule = device.createShaderModule({
    code: shader,
  });

  const vertices = new Float32Array([
    // First triangle
    -0.5, -0.5, 0.5, -0.5, 0.0, 0.5,
    // Second triangle
    0.5, 0.5, 1.0, -0.5, 0.0, -0.5,
  ]);

  const vertexBuffer = device.createBuffer({
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  // Copy the vertex data to the buffer
  device.queue.writeBuffer(vertexBuffer, 0, vertices);

  const pipeline = device.createRenderPipeline({
    vertex: {
      module: shaderModule,
      entryPoint: "vs_main",
      buffers: [
        {
          arrayStride: 2 * 4, // 2 floats, each 4 bytes
          attributes: [
            {
              shaderLocation: 0,
              offset: 0,
              format: "float32x2",
            },
          ],
        },
      ],
    },
    fragment: {
      module: shaderModule,
      entryPoint: "fs_main",
      targets: [{ format: swapChainFormat }],
    },
    primitive: {
      topology: "triangle-list",
    },
    layout: "auto",
  });

  const commandEncoder = device.createCommandEncoder();
  const textureView = context.getCurrentTexture().createView();

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
  passEncoder.setVertexBuffer(0, vertexBuffer);
  passEncoder.draw(6, 1, 0, 0);
  passEncoder.end();

  device.queue.submit([commandEncoder.finish()]);
}
