const MODULE_SPACING = 2.6;

export class SimulationManager {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.modules = []; // List of all launched modules
    this.activeHub = null;
    this.isLaunching = false; // Launch in progress control

    // Try to initialize only if hub exists
    if (this.sceneManager.hubBody) {
      this.initCentralHub();
    } else {
      console.error("Critical: Hub Body not found during Simulation init");
    }
  }

  initCentralHub() {
    this.activeHub = this.sceneManager.hubBody;
    
    // Configure Metadata for Central Hub
    if (!this.activeHub.metadata) this.activeHub.metadata = {};
    this.activeHub.metadata.isHub = true;
    this.activeHub.metadata.gridQ = 0; // Base Axial Coordinate
    this.activeHub.metadata.gridR = 0;
    this.activeHub.metadata.parentModule = {
      name: "Central Station",
      type: "HUB_NODE"
    };
    
    // Add to collision list
    this.modules.push({ mesh: this.activeHub });
    console.log("System Online: Central Hub Registered.");
  }

  // Finds a free physical space around the selected Hub
  findFreeSlot(hubMesh) {
    if (!hubMesh) return null;

    // 6 Angles for flat faces (30° Rotation)
    const angles = [30, 90, 150, 210, 270, 330];

    for (let angle of angles) {
      const rad = angle * (Math.PI / 180);
      // Candidate position
      const offsetX = Math.cos(rad) * MODULE_SPACING;
      const offsetZ = Math.sin(rad) * MODULE_SPACING;
      const candidatePos = hubMesh.position.add(new BABYLON.Vector3(offsetX, 0, offsetZ));

      // Collision check (distance < 1.0)
      const isOccupied = this.modules.some(mod => {
        if (!mod.mesh) return false;
        return BABYLON.Vector3.Distance(mod.mesh.position, candidatePos) < 1.0;
      });

      if (!isOccupied) {
        return { position: candidatePos, angle: angle };
      }
    }
    return null;
  }

  launchModule(ModuleClass, config = {}) {
    console.log("🚀 LaunchModule called with:", ModuleClass?.name, config);
    
    // Check if launch is in progress
    if (this.isLaunching) {
      if (this.sceneManager.uiManager) {
        this.sceneManager.uiManager.showWarningToast("Wait for the previous module to land");
      }
      return;
    }
    
    if (!this.activeHub) {
      console.error("No Active Hub selected");
      return;
    }

    const slotInfo = this.findFreeSlot(this.activeHub);

    if (!slotInfo) {
      if (this.sceneManager.uiManager) {
        this.sceneManager.uiManager.showWarningToast("HUB FULL. Activate another node.");
      }
      return;
    }

    const targetPos = slotInfo.position;
    
    // Mark that a launch is in progress
    this.isLaunching = true;

    // Instantiate
    const module = new ModuleClass(this.sceneManager.scene, targetPos);
    
    // Rotación para alineación cara a cara
    // El módulo ya tiene una rotación base de 30° (Math.PI / 6)
    // Necesitamos que mire hacia el hub (180° + ángulo del slot)
    const rotationAngle = (slotInfo.angle + 180) * (Math.PI / 180);
    module.mesh.rotation.y = rotationAngle + (Math.PI / 6); // Agregar rotación base
    
    // Configuración
    if (config.name) module.name = config.name;
    if (config.color) module.updateColor(config.color);
    
    // Identificar si es Hub (SOLO para HUB_NODE)
    if (config.type === "HUB_NODE") {
      module.type = "HUB_NODE";
      if (!module.mesh.metadata) module.mesh.metadata = {};
      module.mesh.metadata.isHub = true;
    } else {
      // Módulos normales NO son hubs
      module.type = "MODULE";
      if (!module.mesh.metadata) module.mesh.metadata = {};
      module.mesh.metadata.isHub = false;
    }

    // Registrar
    this.modules.push(module);
    module.activate();

    // Animación
    const spawnPos = targetPos.add(new BABYLON.Vector3(0, 15, 0));
    module.mesh.position = spawnPos;
    
    if (module.setDestination) {
      module.setDestination(targetPos, () => {
        // Callback when landing is complete
        this.isLaunching = false;
      });
    }

    // HUD
    if (this.launchHUD) {
      this.launchHUD.show(module, targetPos);
    }

    // Create virtual agent in 2D visualizer
    if (this.sceneManager.graphVisualizer) {
      this.sceneManager.graphVisualizer.createVirtualAgent(module.mesh);
    }

    // Log
    if (this.sceneManager.uiManager) {
      this.sceneManager.uiManager.log(`Launching ${module.name}...`, "INFO");
    }

    return module;
  }

  setActiveHub(moduleOrMesh) {
    let targetMesh = null;

    // Determine if we received a module or a direct mesh
    if (moduleOrMesh && moduleOrMesh.mesh) {
      // It's a module object
      targetMesh = moduleOrMesh.mesh;
    } else if (moduleOrMesh && moduleOrMesh.position) {
      // It's a direct mesh
      targetMesh = moduleOrMesh;
    }

    if (!targetMesh) return;
    
    this.activeHub = targetMesh;
    
    // Move camera to new center
    this.sceneManager.camera.setTarget(targetMesh.position);
    
    // User feedback
    if (this.sceneManager.uiManager) {
      const name = targetMesh.metadata?.parentModule?.name || moduleOrMesh.name || "Expansion Node";
      this.sceneManager.uiManager.showWarningToast(`ACTIVE HUB: ${name}`);
      this.sceneManager.uiManager.log(`Active hub changed to: ${name}`, "INFO");
    }
  }

  // Method for compatibility with old code
  undockModule(module) {
    if (!module || !module.mesh) {
      console.warn("undockModule: invalid module.");
      return;
    }

    // Remove from module list
    const index = this.modules.indexOf(module);
    if (index > -1) {
      this.modules.splice(index, 1);
    }

    // Farewell animation
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
    // Update each module if it has update
    this.modules.forEach(moduleWrapper => {
      const module = moduleWrapper.mesh?.metadata?.parentModule || moduleWrapper;
      if (module && typeof module.update === 'function') {
        module.update(deltaTime);
      }
    });
  }

  triggerRandomFault() {
    // Filter only operational modules (not hubs, not in fault)
    const operationalModules = this.modules.filter(m => {
      const mod = m.mesh?.metadata?.parentModule || m;
      return mod && mod.status === "NOMINAL" && mod.type !== "HUB_NODE" && !mod.mesh?.metadata?.isHub;
    });

    if (operationalModules.length === 0) {
      if (this.sceneManager.uiManager) {
        this.sceneManager.uiManager.showWarningToast("No operational modules to simulate fault");
      }
      return;
    }

    // Select a random one
    const randomIndex = Math.floor(Math.random() * operationalModules.length);
    const moduleWrapper = operationalModules[randomIndex];
    const module = moduleWrapper.mesh?.metadata?.parentModule || moduleWrapper;

    if (module && module.triggerFault) {
      module.triggerFault();
      
      if (this.sceneManager.uiManager) {
        this.sceneManager.uiManager.log(`⚠️ CRITICAL FAULT detected in ${module.name}!`, "ERROR");
        this.sceneManager.uiManager.showWarningToast(`ALERT: ${module.name} malfunction detected!`);
      }

      // Visual effects
      if (this.fxManager && this.fxManager.spawnAlertParticles) {
        this.fxManager.spawnAlertParticles(module.mesh.position);
      }
    }
  }

  fixAllFaults() {
    let fixedCount = 0;

    this.modules.forEach(moduleWrapper => {
      const module = moduleWrapper.mesh?.metadata?.parentModule || moduleWrapper;
      if (module && module.status === "CRITICAL" && module.repairFault) {
        module.repairFault();
        fixedCount++;
      }
    });

    if (this.sceneManager.uiManager) {
      if (fixedCount > 0) {
        this.sceneManager.uiManager.log(`✅ System restored: ${fixedCount} module(s) repaired`, "SUCCESS");
        this.sceneManager.uiManager.showWarningToast(`${fixedCount} fault(s) resolved`);
      } else {
        this.sceneManager.uiManager.log("No faults detected in the system", "INFO");
      }
    }
  }
}
