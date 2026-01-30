import { BaseModule } from "./BaseModule.js";

export class GenericModule extends BaseModule {
  /**
   * @param {BABYLON.Scene} scene
   * @param {BABYLON.Vector3} position
   * @param {Object} config - { name, color, emissive, production }
   */
  constructor(scene, position = new BABYLON.Vector3(0, 0, 0), config = {}) {
    super(scene, position);

    this.name = config.name || "GenericModule";
    this.customColor = config.color || "#3b82f6";
    this.customEmissive = config.emissive || "#1e3a8a";
    
    this.stats = {
      energy: 20,
      production: config.production || 50,
      status: "online",
    };
  }

  createMesh() {
    // Crear geometría compuesta: Cuerpo + Cúpula
    const body = BABYLON.MeshBuilder.CreateCylinder(
      `${this.id}-body`,
      { height: 0.7, diameter: 3, tessellation: 6 },
      this.scene
    );

    const cap = BABYLON.MeshBuilder.CreateCylinder(
      `${this.id}-cap`,
      { 
        height: 0.3, 
        diameterTop: 1.5, 
        diameterBottom: 3, 
        tessellation: 6 
      },
      this.scene
    );

    cap.position.y = 0.5;
    cap.parent = body;

    this.mesh = body;
    this.mesh.metadata = { parentModule: this };

    const material = new BABYLON.StandardMaterial(
      `${this.id}-mat`,
      this.scene
    );
    material.diffuseColor = BABYLON.Color3.FromHexString(this.customColor);
    material.emissiveColor = BABYLON.Color3.FromHexString(this.customEmissive);
    material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    material.specularPower = 32;
    
    body.material = material;
    cap.material = material;

    return body;
  }
}
