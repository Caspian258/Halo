const MODULE_SPACING = 2.6;

export class SimulationManager {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.modules = []; // Lista de todos los módulos lanzados
    this.activeHub = null;

    // Intentar iniciar solo si el hub existe
    if (this.sceneManager.hubBody) {
      this.initCentralHub();
    } else {
      console.error("Critical: Hub Body not found during Simulation init");
    }
  }

  initCentralHub() {
    this.activeHub = this.sceneManager.hubBody;
    
    // Configurar Metadata para el Hub Central
    if (!this.activeHub.metadata) this.activeHub.metadata = {};
    this.activeHub.metadata.isHub = true;
    this.activeHub.metadata.gridQ = 0; // Coordenada Axial Base
    this.activeHub.metadata.gridR = 0;
    this.activeHub.metadata.parentModule = {
      name: "Estación Central",
      type: "HUB_NODE"
    };
    
    // Añadir a la lista de colisiones
    this.modules.push({ mesh: this.activeHub });
    console.log("System Online: Central Hub Registered.");
  }

  // Busca un espacio físico libre alrededor del Hub seleccionado
  findFreeSlot(hubMesh) {
    if (!hubMesh) return null;

    // 6 Ángulos para caras planas (Rotación 30°)
    const angles = [30, 90, 150, 210, 270, 330];

    for (let angle of angles) {
      const rad = angle * (Math.PI / 180);
      // Posición candidata
      const offsetX = Math.cos(rad) * MODULE_SPACING;
      const offsetZ = Math.sin(rad) * MODULE_SPACING;
      const candidatePos = hubMesh.position.add(new BABYLON.Vector3(offsetX, 0, offsetZ));

      // Chequeo de colisión (distancia < 1.0)
      const isOccupied = this.modules.some(mod => {
        if (!mod.mesh) return false;
        return BABYLON.Vector3.Distance(mod.mesh.position, candidatePos) < 1.0;
      });

      if (!isOccupied) {
        return candidatePos;
      }
    }
    return null;
  }

  launchModule(ModuleClass, config = {}) {
    console.log("🚀 LaunchModule called with:", ModuleClass?.name, config);
    
    if (!this.activeHub) {
      console.error("No Active Hub selected");
      return;
    }

    const targetPos = this.findFreeSlot(this.activeHub);
    console.log("📍 Target position found:", targetPos);

    if (!targetPos) {
      console.warn("No free slot available");
      if (this.sceneManager.uiManager) {
        this.sceneManager.uiManager.showWarningToast("HUB COMPLETO. Active otro nodo.");
      }
      return;
    }

    // Instanciar
    console.log("🔧 Creating module instance...");
    const module = new ModuleClass(this.sceneManager.scene, targetPos);
    console.log("✅ Module created:", module);
    
    // Rotación Geométrica
    module.mesh.rotation.y = Math.PI / 6;
    
    // Configuración
    if (config.name) module.name = config.name;
    if (config.color) module.updateColor(config.color);
    
    // Identificar si es Hub
    if (config.type === "HUB_NODE") {
      module.type = "HUB_NODE";
      if (!module.mesh.metadata) module.mesh.metadata = {};
      module.mesh.metadata.isHub = true;
    }

    // Registrar
    this.modules.push(module);
    module.activate();

    // Animación
    const spawnPos = targetPos.add(new BABYLON.Vector3(0, 15, 0));
    module.mesh.position = spawnPos;
    
    if (module.setDestination) {
      module.setDestination(targetPos);
    }

    // HUD
    if (this.sceneManager.uiManager && this.sceneManager.uiManager.launchHUD) {
      this.sceneManager.uiManager.launchHUD.show(module, targetPos);
    }

    // Log
    if (this.sceneManager.uiManager) {
      this.sceneManager.uiManager.log(`Launching ${module.name}...`, "INFO");
    }

    return module;
  }

  setActiveHub(moduleOrMesh) {
    let targetMesh = null;

    // Determinar si recibimos un módulo o un mesh directo
    if (moduleOrMesh && moduleOrMesh.mesh) {
      // Es un objeto módulo
      targetMesh = moduleOrMesh.mesh;
    } else if (moduleOrMesh && moduleOrMesh.position) {
      // Es un mesh directo
      targetMesh = moduleOrMesh;
    }

    if (!targetMesh) return;
    
    this.activeHub = targetMesh;
    
    // Mover cámara al nuevo centro
    this.sceneManager.camera.setTarget(targetMesh.position);
    
    // Feedback usuario
    if (this.sceneManager.uiManager) {
      const name = targetMesh.metadata?.parentModule?.name || moduleOrMesh.name || "Nodo de Expansión";
      this.sceneManager.uiManager.showWarningToast(`HUB ACTIVO: ${name}`);
      this.sceneManager.uiManager.log(`Active hub changed to: ${name}`, "INFO");
    }
  }

  // Método para compatibilidad con código antiguo
  undockModule(module) {
    if (!module || !module.mesh) {
      console.warn("undockModule: módulo inválido.");
      return;
    }

    // Eliminar de la lista de módulos
    const index = this.modules.indexOf(module);
    if (index > -1) {
      this.modules.splice(index, 1);
    }

    // Animación de despedida
    const scene = this.sceneManager.scene;
    if (!scene) return;

    const currentPos = module.mesh.position.clone();
    const exitPos = currentPos.add(new BABYLON.Vector3(0, 20, 0));

    const frameRate = 60;
    const duration = 2;
    const anim = new BABYLON.Animation(
      "undockAnim",
      "position",
      frameRate,
      BABYLON.Animation.ANIMATIONTYPE_VECTOR3,
      BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
    );

    const keys = [];
    keys.push({ frame: 0, value: currentPos });
    keys.push({ frame: frameRate * duration, value: exitPos });
    anim.setKeys(keys);

    module.mesh.animations = [];
    module.mesh.animations.push(anim);

    if (module.stats) module.stats.status = "departing";

    scene.beginAnimation(module.mesh, 0, frameRate * duration, false, 1, () => {
      if (module.mesh) {
        module.mesh.dispose();
      }
      this.sceneManager.uiManager.log(`${module.name} undocked.`, "INFO");
    });

    this.sceneManager.uiManager.log(`Undocking ${module.name}...`, "INFO");
  }

  update(deltaTime) {
    // Actualizar cada módulo si tiene update
    this.modules.forEach(moduleWrapper => {
      const module = moduleWrapper.mesh?.metadata?.parentModule || moduleWrapper;
      if (module && typeof module.update === 'function') {
        module.update(deltaTime);
      }
    });
  }
}
