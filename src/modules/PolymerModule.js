import { BaseModule } from "./BaseModule.js";

export class PolymerModule extends BaseModule {
  /**
   * @param {BABYLON.Scene} scene
   * @param {BABYLON.Vector3} position
   */
  constructor(scene, position = new BABYLON.Vector3(0, 0, 0)) {
    super(scene, position);

    this.name = "PolymerModule";
    this.stats = {
      energy: 30,
      production: 5,
      status: "online",
    };
  }
  
  // Hereda createMesh() de BaseModule (cápsula hexagonal)

  activate() {
    this.isDocked = true;

    this.productionInterval = setInterval(() => {
      this.resourcesGenerated += 5;
    }, 1000);
  }
}
