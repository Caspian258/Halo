import { BaseModule } from "./BaseModule.js";

export class GrapheneModule extends BaseModule {
  /**
   * @param {BABYLON.Scene} scene
   * @param {BABYLON.Vector3} position
   */
  constructor(scene, position = new BABYLON.Vector3(0, 0, 0)) {
    super(scene, position);

    this.name = "GrapheneModule";
    this.stats = {
      energy: 25,
      production: 100,
      status: "online",
    };
  }
  
  // Hereda createMesh() de BaseModule (cápsula hexagonal)
}
