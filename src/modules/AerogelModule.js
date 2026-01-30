import { BaseModule } from "./BaseModule.js";

export class AerogelModule extends BaseModule {
  /**
   * @param {BABYLON.Scene} scene
   * @param {BABYLON.Vector3} position
   */
  constructor(scene, position = new BABYLON.Vector3(0, 0, 0)) {
    super(scene, position);

    this.name = "AerogelModule";
    this.stats = {
      energy: 15,
      production: 10,
      status: "online",
    };
  }
  
  // Hereda createMesh() de BaseModule (cápsula hexagonal)

  activate() {
    this.isDocked = true;

    this.productionInterval = setInterval(() => {
      this.resourcesGenerated += 10;
    }, 5000);
  }
}
