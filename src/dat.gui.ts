import * as dat from "dat.gui";
import { executeGPUOperations } from "./gpu";

export default function initDatGUI() {
  const gui = new dat.GUI();
  gui.add(
    {
      StartGPUWork: executeGPUOperations,
    },
    "StartGPUWork"
  );
}
