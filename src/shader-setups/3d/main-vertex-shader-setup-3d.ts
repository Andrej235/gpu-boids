import VertexShaderSetup from "../vertex-shader-setup";

export default function setupVertexShader3D(
  shader: string,
  device: GPUDevice,
  context: GPUCanvasContext
) {
  const setup = new VertexShaderSetup(
    "main vertex shader 3d",
    shader,
    device,
    context,
    {},
    {}
  );

  return setup;
}
