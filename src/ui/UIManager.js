export class UIManager {
  constructor() {
    this.inspectorPanel = document.getElementById("inspector-panel");
    this.inspectorData = document.getElementById("inspector-data");
    this.logContent = document.getElementById("log-content");

    if (!this.inspectorPanel || !this.inspectorData || !this.logContent) {
      console.warn(
        "UIManager: Algunos elementos del DOM no se encontraron. Verificando..."
      );
    }

    this.selectedModule = null;
    
    // Sistema de preview 3D independiente
    this.previewEngine = null;
    this.previewScene = null;
    this.previewMesh = null;
    this.previewCamera = null;
    
    this.initPreviewSystem();
  }

  initPreviewSystem() {
    const canvas = document.getElementById("mini-view");
    
    if (!canvas) {
      console.error("Canvas #mini-view no encontrado");
      return;
    }
    
    // Crear motor exclusivo para el preview
    this.previewEngine = new BABYLON.Engine(canvas, true, { 
      preserveDrawingBuffer: true, 
      stencil: true 
    });
    
    // Crear escena exclusiva
    this.previewScene = new BABYLON.Scene(this.previewEngine);
    this.previewScene.clearColor = new BABYLON.Color4(0, 0, 0, 0); // Transparente
    
    // Cámara interactiva SOLO para el preview
    this.previewCamera = new BABYLON.ArcRotateCamera(
      "PreviewCam",
      Math.PI / 2,
      Math.PI / 3,
      6,
      BABYLON.Vector3.Zero(),
      this.previewScene
    );
    
    // CRÍTICO: Vincular mouse SOLO a este canvas
    this.previewCamera.attachControl(canvas, true);
    
    // Límites de zoom
    this.previewCamera.lowerRadiusLimit = 4;
    this.previewCamera.upperRadiusLimit = 10;
    this.previewCamera.wheelPrecision = 50; // Zoom suave
    this.previewCamera.panningSensibility = 0; // Desactiva movimiento lateral con clic derecho
    
    // Luz para el preview
    const light = new BABYLON.HemisphericLight(
      "lightP",
      new BABYLON.Vector3(0, 1, 0),
      this.previewScene
    );
    light.intensity = 0.8;
    
    // --- FONDO ESPACIAL MINI (PhotoDome) ---
    const domeMini = new BABYLON.PhotoDome(
      "spaceDomeMini",
      "./assets/space.jpg", // <--- RUTA LOCAL
      {
        resolution: 32,
        size: 100, // Tamaño pequeño para el visor
        useDirectMapping: false
      },
      this.previewScene
    );
    
    // Resize event
    window.addEventListener("resize", () => {
      if (this.previewEngine) {
        this.previewEngine.resize();
      }
    });
  }

  switchTab(tabName) {
    // Ocultar todos los contenidos de tabs
    const dataTab = document.getElementById('tab-content-data');
    const visualTab = document.getElementById('tab-content-visual');
    
    // Obtener botones
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    if (tabName === 'data') {
      // Mostrar telemetría
      if (dataTab) {
        dataTab.style.display = 'block';
        dataTab.classList.add('active');
      }
      if (visualTab) {
        visualTab.style.display = 'none';
        visualTab.classList.remove('active');
      }
      
      // Actualizar clases de botones
      tabBtns.forEach((btn, idx) => {
        if (idx === 0) btn.classList.add('active');
        else btn.classList.remove('active');
      });
    } else if (tabName === 'visual') {
      // Mostrar vista 3D
      if (dataTab) {
        dataTab.style.display = 'none';
        dataTab.classList.remove('active');
      }
      if (visualTab) {
        visualTab.style.display = 'block';
        visualTab.classList.add('active');
      }
      
      // Actualizar clases de botones
      tabBtns.forEach((btn, idx) => {
        if (idx === 1) btn.classList.add('active');
        else btn.classList.remove('active');
      });
      
      // IMPORTANTE: Forzar resize del motor cuando el canvas se hace visible
      if (this.previewEngine) {
        setTimeout(() => {
          this.previewEngine.resize();
        }, 50); // Pequeño delay para asegurar que el canvas esté visible
      }
    }
  }

  hide() {
    // Ocultar panel inspector
    const panel = document.getElementById('inspector-panel');
    if (panel) {
      panel.style.display = 'none';
    }
    
    // Detener motor completamente
    if (this.previewEngine) {
      this.previewEngine.stopRenderLoop();
    }
    
    // Limpiar mesh si existe
    if (this.previewMesh) {
      this.previewMesh.dispose();
      this.previewMesh = null;
    }
    
    // Limpiar selección
    this.selectedModule = null;
  }

  log(message, type = "INFO") {
    if (!this.logContent) return;

    const timestamp = new Date().toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const logEntry = document.createElement("div");
    logEntry.className = "log-entry";
    logEntry.innerHTML = `<span class="log-timestamp">[${timestamp}]</span><span class="log-type ${type}">[${type}]</span><span class="log-message">&gt; ${message}</span>`;

    this.logContent.appendChild(logEntry);

    // Auto-scroll al final
    this.logContent.scrollTop = this.logContent.scrollHeight;

    // Limitar a 100 entradas para no consumir memoria
    const entries = this.logContent.querySelectorAll(".log-entry");
    if (entries.length > 100) {
      entries[0].remove();
    }
  }

  showWarningToast(message) {
    // Crear contenedor si no existe
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    
    // Limpiar toasts anteriores
    container.innerHTML = '';
    
    // Crear nuevo toast
    const toast = document.createElement('div');
    toast.className = 'toast-warning';
    toast.innerHTML = `
      <i class="fa-solid fa-triangle-exclamation"></i>
      <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Remover después de 5 segundos
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 5000);
  }

  showModuleInfo(module, onUndockCallback = null) {
    if (!module) return;

    this.selectedModule = module;
    
    // Mostrar panel inspector
    const panel = document.getElementById('inspector-panel');
    if (panel) {
      panel.style.display = 'block';
    }

    // Generar ID único del módulo (si no existe, usar timestamp)
    const moduleId = module.id || `MOD-${Date.now().toString(36).toUpperCase()}`;
    if (!module.id) module.id = moduleId;

    // Determinar estado con color
    const status = module.stats?.status || "unknown";
    const moduleStatus = module.status || "NOMINAL";
    let statusClass = "status-nominal";
    let statusText = "NOMINAL";

    if (moduleStatus === "CRITICAL") {
      statusClass = "status-error";
      statusText = "CRITICAL ERROR";
    } else if (status === "traveling") {
      statusClass = "status-traveling";
      statusText = "TRAVELING";
    } else if (status === "docked") {
      statusClass = "status-nominal";
      statusText = "NOMINAL";
    } else if (status === "departing") {
      statusClass = "status-traveling";
      statusText = "DEPARTING";
    }

    // Telemetría
    const temp = module.temperature || 50;
    const cpu = module.cpuLoad || 25;
    const efficiency = module.efficiency || 95;
    const power = module.powerDraw || 12.5;

    // Inyectar HTML SOLO en #inspector-data
    const inspectorData = document.getElementById('inspector-data');
    if (inspectorData) {
      // Obtener color del módulo para el tipo
      const moduleColor = module.mesh?.material?.diffuseColor?.toHexString() || '#94a3b8';
      
      // Determinar color de estado
      const statusColor = moduleStatus === 'CRITICAL' ? '#ef4444' : '#4ade80';
      const statusGlow = moduleStatus === 'CRITICAL' ? '#ef4444' : '#4ade8033';
      
      inspectorData.innerHTML = `
        <div class="info-grid">
          <div class="section-title">IDENTIDAD DEL SISTEMA</div>
          <div class="data-row">
            <span class="label">Tipo de Módulo</span>
            <span class="value" style="color: ${moduleColor}">${module.name || 'Desconocido'}</span>
          </div>
          <div class="data-row">
            <span class="label">Etiqueta ID</span>
            <span class="value mono">${moduleId.substring(0, 18)}...</span>
          </div>
          <div class="data-row">
            <span class="label">Estado</span>
            <span class="value" style="color: ${statusColor}; text-shadow: 0 0 5px ${statusGlow};">
              ● ${moduleStatus === 'OPERATIONAL' ? 'OPERACIONAL' : moduleStatus === 'CRITICAL' ? 'CRÍTICO' : moduleStatus}
            </span>
          </div>
          <div class="data-row">
            <span class="label"><i class="fa-solid fa-boxes-stacked"></i> Recursos</span>
            <span class="value" id="module-resources">${module.resourcesGenerated || 0}</span>
          </div>
          <div class="data-row">
            <span class="label"><i class="fa-solid fa-industry"></i> Producción</span>
            <span class="value">${module.stats?.production || 0}/seg</span>
          </div>

          <div class="section-title">MÉTRICAS DE RENDIMIENTO</div>
          <div class="data-row">
            <span class="label"><i class="fa-solid fa-temperature-half"></i> Temperatura</span>
            <span class="value"><span id="val-temp">${temp.toFixed(1)}</span> °C</span>
          </div>
          <div class="data-row">
            <span class="label"><i class="fa-solid fa-microchip"></i> Carga CPU</span>
            <span class="value"><span id="val-cpu">${cpu.toFixed(1)}</span> %</span>
          </div>
          <div class="data-row">
            <span class="label"><i class="fa-solid fa-gauge-high"></i> Eficiencia</span>
            <span class="value"><span id="val-eff">${efficiency.toFixed(1)}</span> %</span>
          </div>
          <div class="data-row">
            <span class="label"><i class="fa-solid fa-bolt"></i> Consumo Energético</span>
            <span class="value"><span id="val-power">${power.toFixed(1)}</span> kW</span>
          </div>
          <div class="data-row">
            <span class="label"><i class="fa-solid fa-shield-halved"></i> Integridad</span>
            <span class="value">100%</span>
          </div>
        </div>
      `;

      // Contenedor para botones de acción
      const actionsDiv = document.createElement('div');
      actionsDiv.style.cssText = 'margin-top: 20px; padding: 16px; padding-top: 10px; border-top: 1px solid #334155;';

      // Botón especial para Hub Expansion (MAKE ACTIVE HUB)
      // SOLO mostrar si es realmente un HUB (HUB_NODE o Central Hub)
      const isHub = module.type === "HUB_NODE" || module.mesh?.metadata?.isHub === true;
      if (isHub) {
        const activateBtn = document.createElement("button");
        activateBtn.id = "btn-activate";
        activateBtn.className = "btn-undock";
        activateBtn.style.cssText = 'width: 100%; margin-bottom: 8px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff;';
        activateBtn.innerHTML = `<i class="fa-solid fa-circle-dot"></i> ACTIVAR COMO HUB`;
        activateBtn.onclick = () => {
          if (this.sceneManager?.simulationManager?.setActiveHub) {
            // Pasar el objeto módulo completo
            this.sceneManager.simulationManager.setActiveHub(module);
          }
        };
        actionsDiv.appendChild(activateBtn);
      }

      // Agregar botón de remover módulo (solo para módulos, no para hubs)
      if (!isHub && module.mesh) {
        const removeBtn = document.createElement("button");
        removeBtn.className = "btn-undock";
        removeBtn.innerHTML = `<i class="fa-solid fa-eject"></i> REMOVER MÓDULO`;
        removeBtn.style.cssText = 'width: 100%; margin-bottom: 8px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #ffffff;';
        removeBtn.onclick = () => {
          if (this.sceneManager?.simulationManager?.undockModule) {
            this.sceneManager.simulationManager.undockModule(module);
            this.hide(); // Cerrar panel
          }
        };
        actionsDiv.appendChild(removeBtn);
      }

      // Agregar botón de desacople si hay callback (compatibilidad con código antiguo)
      if (onUndockCallback && status === "docked") {
        const undockBtn = document.createElement("button");
        undockBtn.className = "btn-undock";
        undockBtn.innerHTML = `<i class="fa-solid fa-rocket"></i> DESACOPLAR MÓDULO`;
        undockBtn.style.cssText = 'width: 100%; margin-bottom: 8px;';
        undockBtn.onclick = () => {
          onUndockCallback();
        };
        actionsDiv.appendChild(undockBtn);
      }
      
      // Agregar contenedor de acciones al inspector solo si tiene botones
      if (actionsDiv.children.length > 0) {
        inspectorData.appendChild(actionsDiv);
      }
    }
    
    // Actualizar visor 3D
    this.updatePreview(module);
  }

  updatePreview(module) {
    // Limpiar mesh anterior
    if (this.previewMesh) {
      this.previewMesh.dispose();
      this.previewMesh = null;
    }
    
    if (!module || !module.mesh || !this.previewScene) return;
    
    // Obtener color del módulo
    const moduleColor = module.mesh.material?.diffuseColor || new BABYLON.Color3(0.5, 0.5, 0.5);
    
    // Recrear geometría visual en la escena de preview
    // 1. Cuerpo
    const body = BABYLON.MeshBuilder.CreateCylinder("previewBody", {
      diameter: 3,
      height: 0.7,
      tessellation: 6
    }, this.previewScene);
    
    // 2. Anillo separador
    const ring = BABYLON.MeshBuilder.CreateCylinder("previewRing", {
      diameter: 3.1,
      height: 0.05,
      tessellation: 6
    }, this.previewScene);
    ring.parent = body;
    ring.position.y = 0.35;
    
    const ringMat = new BABYLON.StandardMaterial("previewRingMat", this.previewScene);
    ringMat.diffuseColor = BABYLON.Color3.FromHexString("#111111");
    ringMat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
    ring.material = ringMat;
    
    // 3. Cúpula
    const cap = BABYLON.MeshBuilder.CreateCylinder("previewCap", {
      diameterTop: 1.5,
      diameterBottom: 3,
      height: 0.35,
      tessellation: 6
    }, this.previewScene);
    cap.parent = body;
    cap.position.y = 0.55;
    
    // 4. Patas (tren de aterrizaje)
    const legMat = new BABYLON.StandardMaterial("previewLegMat", this.previewScene);
    legMat.diffuseColor = new BABYLON.Color3(1, 1, 1);
    legMat.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
    
    for (let i = 0; i < 6; i++) {
      const angle = (i * 60) * (Math.PI / 180);
      const radius = 1.3;
      
      const leg = BABYLON.MeshBuilder.CreateCylinder(`previewLeg${i}`, {
        diameter: 0.2,
        height: 0.4,
        tessellation: 8
      }, this.previewScene);
      
      leg.parent = body;
      leg.position.x = Math.cos(angle) * radius;
      leg.position.z = Math.sin(angle) * radius;
      leg.position.y = -0.55;
      leg.material = legMat;
    }
    
    // Material del cuerpo y cúpula (usa el color del módulo)
    const mat = new BABYLON.StandardMaterial("previewMat", this.previewScene);
    mat.diffuseColor = moduleColor.clone();
    mat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2);
    body.material = mat;
    cap.material = mat;
    
    // Guardar referencia al mesh principal
    this.previewMesh = body;
    
    // Iniciar render loop si estaba parado
    if (this.previewEngine && !this.previewEngine.isRunning) {
      this.previewEngine.runRenderLoop(() => {
        this.previewScene.render();
      });
    }
  }

  update() {
    // Actualizar LaunchHUD si existe
    if (this.launchHUD) {
      this.launchHUD.update();
    }

    if (!this.selectedModule) return;

    const temp = this.selectedModule.temperature || 50;
    const cpu = this.selectedModule.cpuLoad || 25;
    const efficiency = this.selectedModule.efficiency || 95;
    const power = this.selectedModule.powerDraw || 12.5;
    const resources = this.selectedModule.resourcesGenerated || 0;

    const tempEl = document.getElementById("val-temp");
    const cpuEl = document.getElementById("val-cpu");
    const effEl = document.getElementById("val-eff");
    const powerEl = document.getElementById("val-power");
    const resourcesEl = document.getElementById("module-resources");

    if (tempEl) tempEl.textContent = temp.toFixed(1);
    if (cpuEl) cpuEl.textContent = cpu.toFixed(1);
    if (effEl) effEl.textContent = efficiency.toFixed(1);
    if (powerEl) powerEl.textContent = power.toFixed(1);
    if (resourcesEl) resourcesEl.textContent = resources;
  }
}
