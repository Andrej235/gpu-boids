export function getBuffer(
  device: GPUDevice,
  label: string,
  size: number,
  arrayBuffer: number[] = [],
  usage: GPUBufferUsageFlags = GPUBufferUsage.STORAGE
): GPUBuffer {
  const gpuBuffer = device.createBuffer({
    mappedAtCreation: true,
    size,
    usage: usage,
    label,
  });

  if (arrayBuffer.length > 0) {
    const arrayInputBuffer = gpuBuffer.getMappedRange();
    new Float32Array(arrayInputBuffer).set(arrayBuffer);
  }

  gpuBuffer.unmap();
  return gpuBuffer;
}
