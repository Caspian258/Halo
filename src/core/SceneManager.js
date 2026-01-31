import { SimulationManager } from '../simulation/SimulationManager.js';

export class SceneManager {
  constructor(canvasId) {
    const canvas = document.getElementById(canvasId);
    this.engine = new BABYLON.Engine(canvas, true);
    this.scene = this.createScene(canvas);
    this.uiManager = null;
    this.modules = [];
    
    this.engine.runRenderLoop(() => {
      this.scene.render();
      if (this.uiManager) this.uiManager.update();
    });

    window.addEventListener("resize", () => {
      this.engine.resize();
    });
  }

  createScene(canvas) {
    const scene = new BABYLON.Scene(this.engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);

    this.camera = new BABYLON.ArcRotateCamera(
      "camera",
      -Math.PI / 2,
      Math.PI / 2.5,
      15,
      BABYLON.Vector3.Zero(),
      scene
    );
    this.camera.attachControl(canvas, true);
    this.camera.wheelPrecision = 50;

    const light = new BABYLON.HemisphericLight(
      "light",
      new BABYLON.Vector3(1, 1, 0),
      scene
    );
    light.intensity = 1;

    try {
      const dome = new BABYLON.PhotoDome(
        "spaceDome",
        "./assets/space.jpg",
        { resolution: 32, size: 1000, useDirectMapping: false },
        scene
      );
      dome.imageMode = BABYLON.PhotoDome.MODE_MONOSCOPIC;
    } catch (e) {
      console.warn("PhotoDome error:", e);
    }

    const hubBody = BABYLON.MeshBuilder.CreateCylinder(
      "hubBody",
      { diameter: 3, height: 0.7, tessellation: 6 },
      scene
    );
    hubBody.position = new BABYLON.Vector3(0, 0, 0);
    hubBody.rotation.y = Math.PI / 3; // 30 degrees (same as modules)
    
    const hubMat = new BABYLON.StandardMaterial("hubMat", scene);
    hubMat.diffuseColor = BABYLON.Color3.FromHexString("#e2e8f0");
    hubMat.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
    hubBody.material = hubMat;
    this.hubBody = hubBody;

    const hubRing = BABYLON.MeshBuilder.CreateCylinder(
      "hubRing",
      { diameter: 3.1, height: 0.05, tessellation: 6 },
      scene
    );
    const ringMat = new BABYLON.StandardMaterial("ringMat", scene);
    ringMat.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    hubRing.material = ringMat;
    hubRing.parent = hubBody;
    hubRing.position.y = 0.35;

    const hubCap = BABYLON.MeshBuilder.CreateCylinder(
      "hubCap",
      { diameterTop: 1.5, diameterBottom: 3, height: 0.35, tessellation: 6 },
      scene
    );
    hubCap.material = hubMat;
    hubCap.parent = hubBody;
    hubCap.position.y = 0.55;

    // Agregar patitas al hub (6 patas mecánicas)
    const legMat = new BABYLON.StandardMaterial("hubLegMat", scene);
    legMat.diffuseColor = new BABYLON.Color3(1, 1, 1); // Blanco puro
    legMat.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5); // Brillo metálico
    legMat.specularPower = 32;

    for (let i = 0; i < 6; i++) {
      const angle = (i * 60) * (Math.PI / 180); // 0°, 60°, 120°, 180°, 240°, 300°
      const radius = 1.3; // Distancia desde el centro a las esquinas del hexágono
      
      const leg = BABYLON.MeshBuilder.CreateCylinder(`hubLeg${i}`, {
        diameter: 0.2,
        height: 0.4,
        tessellation: 8
      }, scene);
      
      leg.parent = hubBody;
      leg.position.x = Math.cos(angle) * radius;
      leg.position.z = Math.sin(angle) * radius;
      leg.position.y = -0.55; // Debajo del cuerpo
      leg.material = legMat;
    }

    if (!hubBody.metadata) hubBody.metadata = {};
    hubBody.metadata.isHub = true;
    hubBody.metadata.parentModule = {
      name: "Estación Central",
      type: "HUB_NODE",
      mesh: hubBody
    };

    this.simulationManager = new SimulationManager(this);
    scene.simulationManager = this.simulationManager;

    scene.onPointerObservable.add((pointerInfo) => {
      if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN) {
        const pickResult = pointerInfo.pickInfo;
        if (pickResult.hit && pickResult.pickedMesh) {
          let mesh = pickResult.pickedMesh;
          if (!mesh.metadata && mesh.parent && mesh.parent.metadata) {
            mesh = mesh.parent;
          }
          
          if (mesh.metadata && (mesh.metadata.parentModule || mesh.metadata.isHub)) {
            this.handleModuleClick(mesh);
            return;
          }
        }
        if (this.uiManager) {
          this.uiManager.hide();
        }
        // Deseleccionar en el grafo 2D
        if (this.graphVisualizer) {
          this.graphVisualizer.selectModule(null);
        }
      }
    });

    return scene;
  }

  /**
   * Maneja el click en un módulo (desde 3D o 2D)
   */
  handleModuleClick(mesh) {
    if (!mesh) return;
    
    const moduleData = mesh.metadata.parentModule || {
      name: "Hub Central",
      type: "HUB_NODE",
      mesh: mesh
    };
    
    // Mostrar info en UIManager
    if (this.uiManager) {
      this.uiManager.showModuleInfo(moduleData);
    }
    
    // Sincronizar selección en GraphVisualizer
    if (this.graphVisualizer) {
      this.graphVisualizer.selectModule(mesh);
    }
  }

  addModule(module) {
    this.modules.push(module);
  }
}

