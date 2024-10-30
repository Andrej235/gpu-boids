export type RunVertexShaderPipeline = (boidsCount: number) => void;

export type RunComputeShaderPipeline = (
  workgroupCountX: GPUSize32,
  workgroupCountY?: GPUSize32,
  workgroupCountZ?: GPUSize32
) => void;
