import * as dat from "dat.gui";
import { executeOperations } from "./gpu";

export default function initDatGUI() {
  const gui = new dat.GUI();
  gui.add(
    {
      StartGPUWork: executeOperations,
    },
    "StartGPUWork"
  );
}
