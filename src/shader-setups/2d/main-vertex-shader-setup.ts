import VertexShaderSetup from "../vertex-shader-setup";

export default function setupVertexShader(
  shader: string,
  device: GPUDevice,
  context: GPUCanvasContext,
  boidsComputeOutputBuffer: GPUBuffer
) {
  const setup = new VertexShaderSetup(
    "main vertex shader",
    shader,
    device,
    context,
    { boidsComputeOutputBuffer },
    { boidsComputeOutputBuffer: "read-only-storage" }
  );

  return setup;
}
