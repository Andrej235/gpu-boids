import GPUController, { BoidParameters } from "./gpu/gpu";
import * as dat from "dat.gui";

export default class GUIController {
  private gpu: GPUController;
  private gui: dat.GUI;
  private parameters: BoidParameters;

  constructor(gpu: GPUController) {
    this.gpu = gpu;
    this.gui = new dat.GUI();
    this.parameters = this.gpu.BoidParameters;

    this.gui
      .add(this.parameters, "boidSize", 0, 0.1, 0.0001)
      .onChange((value) => {
        gpu.setParameters({ boidSize: value });
      });
  }
}
