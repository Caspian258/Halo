import { BaseModule } from "./BaseModule.js";

export class HubExpansionModule extends BaseModule {
  constructor(scene, position) {
    super(scene, position);
    this.name = "Hub Expansion";
    this.type = "HUB_NODE"; // Metadata especial
    
    // Telemetría específica para nodo de expansión
    this.temperature = 45;
    this.cpuLoad = 15;
    this.efficiency = 98.5;
    this.powerDraw = 8.0;
    
    // Reemplazar el mesh por geometría idéntica al Hub Central
    if (this.mesh) {
      this.mesh.dispose();
    }
    this.mesh = this.createHubMesh();
    if (this.mesh) {
      this.mesh.position = this.position.clone();
    }
  }

  createHubMesh() {
    // 1. Cuerpo Principal (Hexágono Blanco)
    const body = BABYLON.MeshBuilder.CreateCylinder("hubExpBody", {
      diameter: 3,
      height: 0.7,
      tessellation: 6
    }, this.scene);
    
    // Rotación para alineación Flat-Topped (cara con cara)
    body.rotation.y = Math.PI / 6; // 30 grados

    // Material Base: BLANCO ESPACIAL
    const hubMat = new BABYLON.StandardMaterial("hubExpMat", this.scene);
    hubMat.diffuseColor = BABYLON.Color3.FromHexString("#e2e8f0"); // Blanco ligeramente gris
    hubMat.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5); // Brillo metálico
    hubMat.specularPower = 32;
    body.material = hubMat;

    // 2. Anillo Separador (Negro Mate)
    const ring = BABYLON.MeshBuilder.CreateCylinder("hubExpRing", {
      diameter: 3.1,
      height: 0.05,
      tessellation: 6
    }, this.scene);
    ring.parent = body;
    ring.position.y = 0.35;

    const ringMat = new BABYLON.StandardMaterial("hubExpRingMat", this.scene);
    ringMat.diffuseColor = BABYLON.Color3.FromHexString("#111111");
    ringMat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
    ringMat.specularPower = 16;
    ring.material = ringMat;

    // 3. Cúpula Superior (Blanca)
    const cap = BABYLON.MeshBuilder.CreateCylinder("hubExpCap", {
      diameterTop: 1.5,
      diameterBottom: 3,
      height: 0.35,
      tessellation: 6
    }, this.scene);
    cap.parent = body;
    cap.position.y = 0.55;
    cap.material = hubMat; // Hereda el material blanco

    // 4. Tren de Aterrizaje (6 patas blancas)
    const legMat = new BABYLON.StandardMaterial("hubExpLegMat", this.scene);
    legMat.diffuseColor = new BABYLON.Color3(1, 1, 1); // Blanco puro
    legMat.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
    legMat.specularPower = 32;

    for (let i = 0; i < 6; i++) {
      const angle = (i * 60) * (Math.PI / 180);
      const radius = 1.3;
      
      const leg = BABYLON.MeshBuilder.CreateCylinder(`hubExpLeg${i}`, {
        diameter: 0.2,
        height: 0.4,
        tessellation: 8
      }, this.scene);
      
      leg.parent = body;
      leg.position.x = Math.cos(angle) * radius;
      leg.position.z = Math.sin(angle) * radius;
      leg.position.y = -0.55;
      leg.material = legMat;
      leg.metadata = { parentModule: this };
    }

    // 5. Metadata para interacción
    body.metadata = { parentModule: this };
    ring.metadata = { parentModule: this };
    cap.metadata = { parentModule: this };

    return body;
  }

  // Override para actualizar color (no aplicable en Hub Expansion, mantiene blanco)
  updateColor(hexString) {
    // Ignorar cambios de color, el Hub Expansion siempre es blanco
    console.log(`HubExpansionModule: Color changes are not applied. Maintaining white.`);
  }
}
