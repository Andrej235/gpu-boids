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
    this.gui.close();

    this.gui
      .add(this.parameters, "boidSize", 0, 0.1, 0.0001)
      .onChange((value) => {
        gpu.setParameters({ boidSize: value });
      });

    this.gui
      .add(this.parameters, "maxSpeed", 0, 0.01, 0.000001)
      .onChange((value) => {
        gpu.setParameters({ maxSpeed: value });
      });

    this.gui
      .add(this.parameters, "maxSteeringForce", 0, 0.001, 0.000001)
      .onChange((value) => {
        gpu.setParameters({ maxSteeringForce: value });
      });

    this.gui
      .add(this.parameters, "edgeAvoidanceForce", 0, 1, 0.000001)
      .onChange((value) => {
        gpu.setParameters({ edgeAvoidanceForce: value });
      });

    this.gui
      .add(this.parameters, "alignmentForce", 0, 1, 0.000001)
      .onChange((value) => {
        gpu.setParameters({ alignmentForce: value });
      });

    this.gui
      .add(this.parameters, "cohesionForce", 0, 1, 0.000001)
      .onChange((value) => {
        gpu.setParameters({ cohesionForce: value });
      });

    this.gui
      .add(this.parameters, "separationForce", 0, 1, 0.000001)
      .onChange((value) => {
        gpu.setParameters({ separationForce: value });
      });

    this.gui
      .add(this.parameters, "visualRange", 0, 0.1, 0.000001)
      .onChange((value) => {
        gpu.setParameters({ visualRange: value });
      });

    this.gui
      .add(this.parameters, "maxSeparationDistance", 0, 0.1, 0.000001)
      .onChange((value) => {
        gpu.setParameters({ maxSeparationDistance: value });
      });
  }
}
