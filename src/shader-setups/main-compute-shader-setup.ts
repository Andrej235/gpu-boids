import ComputeShaderSetup from "./compute-shader-setup";

export default function setupMainComputeShader(
  shader: string,
  device: GPUDevice,
  triangleSizeBuffer: GPUBuffer,
  aspectRatioBuffer: GPUBuffer,
  boidsCountBuffer: GPUBuffer,
  boidsBuffer: GPUBuffer,
  boidsComputeOutputBuffer: GPUBuffer,
  spatialHashBuffer: GPUBuffer
) {
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
    {
      triangleSizeBuffer: "read-only-storage",
      aspectRatioBuffer: "read-only-storage",
      boidsCountBuffer: "read-only-storage",
      boidsBuffer: "storage",
      boidsComputeOutputBuffer: "storage",
      spatialHashBuffer: "read-only-storage",
    }
  );

  return setup;
}
