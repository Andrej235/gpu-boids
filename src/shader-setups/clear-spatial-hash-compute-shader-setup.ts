import ComputeShaderSetup from "./compute-shader-setup";

export default function setupClearSpatialHashComputeShader(
  shader: string,
  device: GPUDevice,
  spatialHashBuffer: GPUBuffer
) {
  const setup = new ComputeShaderSetup(
    "clear spatial hash compute shader",
    shader,
    device,
    {
      spatialHashBuffer,
    },
    {
      spatialHashBuffer: "storage",
    }
  );

  return setup;
}
