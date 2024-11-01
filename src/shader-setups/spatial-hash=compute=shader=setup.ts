import ComputeShaderSetup from "./compute-shader-setup";

export default function setupSpatialHashComputeShader(
  shader: string,
  device: GPUDevice,
  boidsBuffer: GPUBuffer,
  boidsCountBuffer: GPUBuffer,
  spatialHashBuffer: GPUBuffer
) {
  const setup = new ComputeShaderSetup(
    "spatial hash compute shader",
    shader,
    device,
    {
      boidsBuffer,
      boidsCountBuffer,
      spatialHashBuffer,
    },
    {
      boidsBuffer: "read-only-storage",
      boidsCountBuffer: "read-only-storage",
      spatialHashBuffer: "storage",
    }
  );

  return setup;
}
