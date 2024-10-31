import ComputeShaderSetup from "./compute-shader-setup";
import type { RunComputeShaderPipeline } from "./shader-setups-types";

export default function setupMainComputeShader(
  shader: string,
  device: GPUDevice,
  triangleSizeBuffer: GPUBuffer,
  aspectRatioBuffer: GPUBuffer,
  boidsCountBuffer: GPUBuffer,
  boidsBuffer: GPUBuffer,
  boidsComputeOutputBuffer: GPUBuffer,
  spatialHashBuffer: GPUBuffer
): RunComputeShaderPipeline {
  const computeBindGroupLayout = device.createBindGroupLayout({
    label: "main compute bind group layout",
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
          type: "read-only-storage",
        },
      },
    ],
  });

  const setup = new ComputeShaderSetup(
    "main compute shader",
    shader,
    device,
    {
      triangleSizeBuffer,
      aspectRatioBuffer,
      boidsCountBuffer,
      boidsBuffer,
      boidsComputeOutputBuffer,
      spatialHashBuffer,
    },
    computeBindGroupLayout,
    [
      "triangleSizeBuffer",
      "aspectRatioBuffer",
      "boidsCountBuffer",
      "boidsBuffer",
      "boidsComputeOutputBuffer",
      "spatialHashBuffer",
    ]
  );

  return (x, y, z) => setup.run(x, y, z);
}
