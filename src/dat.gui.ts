import * as dat from "dat.gui";

export default function initDatGUI() {
  const gui = new dat.GUI();
  gui.add(
    {
      StartGPUWork: () => console.log("Not implemented"),
    },
    "StartGPUWork"
  );
}
