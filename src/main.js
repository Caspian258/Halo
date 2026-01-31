import { SceneManager } from "./core/SceneManager.js";
import { UIManager } from "./ui/UIManager.js";
import { FXManager } from "./core/FXManager.js";
import { LaunchHUD } from "./ui/LaunchHUD.js";
import { GraphVisualizer } from "./ui/GraphVisualizer.js";
import { GrapheneModule } from "./modules/GrapheneModule.js";
import { PolymerModule } from "./modules/PolymerModule.js";
import { AerogelModule } from "./modules/AerogelModule.js";
import { HubExpansionModule } from "./modules/HubExpansionModule.js";

const sceneManager = new SceneManager("renderCanvas");
const uiManager = new UIManager();
const fxManager = new FXManager(sceneManager.scene);
const launchHUD = new LaunchHUD();
const graphVisualizer = new GraphVisualizer(
  "graph-canvas",
  sceneManager.simulationManager,
  sceneManager
);

sceneManager.uiManager = uiManager;
sceneManager.simulationManager.fxManager = fxManager;
sceneManager.simulationManager.launchHUD = launchHUD;
sceneManager.graphVisualizer = graphVisualizer;
uiManager.sceneManager = sceneManager;
uiManager.launchHUD = launchHUD;
uiManager.graphVisualizer = graphVisualizer;

window.uiManager = uiManager;

// Mensajes iniciales del sistema
uiManager.log("Sistema Inicializado. Conectividad del Hub: 100%", "SUCCESS");
uiManager.log("Esperando comandos de despliegue...", "INFO");

const launch = (ModuleClass, name, colorHex, type = "MODULE") => {
  uiManager.log(`Lanzando ${name}`, "INFO");
  sceneManager.simulationManager.launchModule(ModuleClass, { name, color: colorHex, type });
};

document.getElementById("btn-graphene")?.addEventListener("click", () => {
  launch(GrapheneModule, "Grafeno", "#2563eb");
});

document.getElementById("btn-zblan")?.addEventListener("click", () => {
  launch(GrapheneModule, "Fibra ZBLAN", "#d946ef");
});

document.getElementById("btn-alloys")?.addEventListener("click", () => {
  launch(PolymerModule, "Aleación Ti-Al", "#f97316");
});

document.getElementById("btn-ceramics")?.addEventListener("click", () => {
  launch(PolymerModule, "Cerámica Térmica", "#a8a29e");
});

document.getElementById("btn-bio")?.addEventListener("click", () => {
  launch(AerogelModule, "Tejido Bio-Impreso", "#10b981");
});

document.getElementById("btn-crystals")?.addEventListener("click", () => {
  launch(AerogelModule, "Cristal Proteico", "#06b6d4");
});

document.getElementById("btn-hub-expansion")?.addEventListener("click", () => {
  launch(HubExpansionModule, "Nodo de Expansión", "#e2e8f0", "HUB_NODE");
});

document.getElementById("btn-sim-fault")?.addEventListener("click", () => {
  if (sceneManager.simulationManager.triggerRandomFault) {
    sceneManager.simulationManager.triggerRandomFault();
  }
});

document.getElementById("btn-close-graph")?.addEventListener("click", () => {
  const modal = document.getElementById("graph-modal");
  if (modal) {
    modal.style.display = "none";
  }
});

// Event listeners para botones de lanzamiento en el modal 2D
document.querySelectorAll(".graph-launch-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const moduleType = btn.dataset.module;
    
    switch(moduleType) {
      case "graphene":
        launch(GrapheneModule, "Grafeno", "#2563eb");
        break;
      case "zblan":
        launch(GrapheneModule, "Fibra ZBLAN", "#d946ef");
        break;
      case "alloys":
        launch(PolymerModule, "Aleación Ti-Al", "#f97316");
        break;
      case "ceramics":
        launch(PolymerModule, "Cerámica Térmica", "#a8a29e");
        break;
      case "bio":
        launch(AerogelModule, "Tejido Bio-Impreso", "#10b981");
        break;
      case "crystals":
        launch(AerogelModule, "Cristal Proteico", "#06b6d4");
        break;
      case "hub":
        launch(HubExpansionModule, "Nodo de Expansión", "#e2e8f0", "HUB_NODE");
        break;
    }
  });
});

// Almacenar módulos personalizados
const customModules = [];

// Modal para crear módulo personalizado
document.getElementById("btn-custom-module")?.addEventListener("click", () => {
  const modal = document.getElementById("custom-module-modal");
  if (modal) {
    modal.style.display = "flex";
  }
});

document.getElementById("btn-close-custom-modal")?.addEventListener("click", () => {
  const modal = document.getElementById("custom-module-modal");
  if (modal) {
    modal.style.display = "none";
  }
});

document.getElementById("btn-create-custom-module")?.addEventListener("click", () => {
  const nameInput = document.getElementById("custom-module-name");
  const colorInput = document.getElementById("custom-module-color");
  
  const moduleName = nameInput.value.trim();
  const moduleColor = colorInput.value;
  
  if (!moduleName) {
    alert("Por favor ingresa un nombre para el módulo");
    return;
  }
  
  // Crear ID único para el módulo
  const moduleId = `custom-${Date.now()}`;
  
  // Guardar módulo personalizado
  customModules.push({
    id: moduleId,
    name: moduleName,
    color: moduleColor
  });
  
  // Crear botón en el sidebar
  const sidebar = document.getElementById("sidebar");
  const newButton = document.createElement("button");
  newButton.id = `btn-${moduleId}`;
  newButton.className = "module-card";
  newButton.style.cssText = `background: linear-gradient(135deg, ${moduleColor}40 0%, ${moduleColor}20 100%); border: 2px solid ${moduleColor}; position: relative;`;
  newButton.innerHTML = `
    <i class="fa-solid fa-cube" style="color: ${moduleColor};"></i>
    <span>${moduleName}</span>
    <button class="delete-module-btn" data-module-id="${moduleId}" style="position: absolute; top: 4px; right: 4px; background: rgba(239, 68, 68, 0.9); border: none; color: white; width: 20px; height: 20px; border-radius: 50%; cursor: pointer; font-size: 10px; display: flex; align-items: center; justify-content: center; z-index: 10;">
      <i class="fa-solid fa-times"></i>
    </button>
  `;
  
  // Insertar antes del botón de simular falla
  const faultBtn = document.getElementById("btn-sim-fault");
  sidebar.insertBefore(newButton, faultBtn);
  
  // Agregar evento al botón de eliminar
  const deleteBtn = newButton.querySelector(".delete-module-btn");
  deleteBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // Evitar que se lance el módulo al hacer clic en eliminar
    
    // Eliminar del array
    const index = customModules.findIndex(m => m.id === moduleId);
    if (index > -1) {
      customModules.splice(index, 1);
    }
    
    // Eliminar el botón del DOM
    newButton.remove();
    
    uiManager.log(`Módulo personalizado eliminado: ${moduleName}`, "INFO");
  });
  
  // Agregar evento al nuevo botón (para lanzar el módulo)
  newButton.addEventListener("click", () => {
    launch(GrapheneModule, moduleName, moduleColor);
  });
  
  // Cerrar modal y limpiar
  document.getElementById("custom-module-modal").style.display = "none";
  nameInput.value = "";
  colorInput.value = "#ff6b6b";
  
  uiManager.log(`Módulo personalizado creado: ${moduleName}`, "SUCCESS");
});
