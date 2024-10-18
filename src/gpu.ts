let device: GPUDevice | null = null;

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
}

export async function executeGPUOperations() {
  if (!device) return;

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
    code: /* wgsl */ `
        @group(0) @binding(0) var<storage, read> first : vec2<f32>;
        @group(0) @binding(1) var<storage, read> second : vec2<f32>;
        @group(0) @binding(2) var<storage, read_write> result : vec2<f32>;
  
        @compute @workgroup_size(1)
        fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
          result = normalize(first) + sin(second);
        }
      `,
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
