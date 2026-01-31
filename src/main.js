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

// Initial system messages
uiManager.log("System Initialized. Hub Connectivity: 100%", "SUCCESS");
uiManager.log("Awaiting deployment commands...", "INFO");

const launch = (ModuleClass, name, colorHex, type = "MODULE") => {
  uiManager.log(`Launching ${name}`, "INFO");
  sceneManager.simulationManager.launchModule(ModuleClass, { name, color: colorHex, type });
};

document.getElementById("btn-graphene")?.addEventListener("click", () => {
  launch(GrapheneModule, "Graphene", "#2563eb");
});

document.getElementById("btn-zblan")?.addEventListener("click", () => {
  launch(GrapheneModule, "ZBLAN Fiber", "#d946ef");
});

document.getElementById("btn-alloys")?.addEventListener("click", () => {
  launch(PolymerModule, "Ti-Al Alloy", "#f97316");
});

document.getElementById("btn-ceramics")?.addEventListener("click", () => {
  launch(PolymerModule, "Thermal Ceramic", "#a8a29e");
});

document.getElementById("btn-bio")?.addEventListener("click", () => {
  launch(AerogelModule, "Bio-Printed Tissue", "#10b981");
});

document.getElementById("btn-crystals")?.addEventListener("click", () => {
  launch(AerogelModule, "Protein Crystal", "#06b6d4");
});

document.getElementById("btn-hub-expansion")?.addEventListener("click", () => {
  launch(HubExpansionModule, "Expansion Node", "#e2e8f0", "HUB_NODE");
});

document.getElementById("btn-sim-fault")?.addEventListener("click", () => {
  if (sceneManager.simulationManager.triggerRandomFault) {
    sceneManager.simulationManager.triggerRandomFault();
  }
});

document.getElementById("btn-open-graph")?.addEventListener("click", () => {
  const modal = document.getElementById("graph-modal");
  if (modal) {
    modal.style.display = "flex";
  }
});

document.getElementById("btn-close-graph")?.addEventListener("click", () => {
  const modal = document.getElementById("graph-modal");
  if (modal) {
    modal.style.display = "none";
  }
});

// Event listeners for launch buttons in 2D modal
document.querySelectorAll(".graph-launch-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const moduleType = btn.dataset.module;
    
    switch(moduleType) {
      case "graphene":
        launch(GrapheneModule, "Graphene", "#2563eb");
        break;
      case "zblan":
        launch(GrapheneModule, "ZBLAN Fiber", "#d946ef");
        break;
      case "alloys":
        launch(PolymerModule, "Ti-Al Alloy", "#f97316");
        break;
      case "ceramics":
        launch(PolymerModule, "Thermal Ceramic", "#a8a29e");
        break;
      case "bio":
        launch(AerogelModule, "Bio-Printed Tissue", "#10b981");
        break;
      case "crystals":
        launch(AerogelModule, "Protein Crystal", "#06b6d4");
        break;
      case "hub":
        launch(HubExpansionModule, "Expansion Node", "#e2e8f0", "HUB_NODE");
        break;
    }
  });
});

// Store custom modules
const customModules = [];

// Modal for creating custom module
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
    alert("Please enter a name for the module");
    return;
  }
  
  // Create unique ID for the module
  const moduleId = `custom-${Date.now()}`;
  
  // Guardar módulo personalizado
  customModules.push({
    id: moduleId,
    name: moduleName,
    color: moduleColor
  });
  
  // Create button in sidebar
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
  
  // Insert before simulate fault button
  const faultBtn = document.getElementById("btn-sim-fault");
  sidebar.insertBefore(newButton, faultBtn);
  
  // Add event to delete button
  const deleteBtn = newButton.querySelector(".delete-module-btn");
  deleteBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // Prevent launching module when clicking delete
    
    // Remove from array
    const index = customModules.findIndex(m => m.id === moduleId);
    if (index > -1) {
      customModules.splice(index, 1);
    }
    
    // Remove button from DOM
    newButton.remove();
    
    uiManager.log(`Custom module removed: ${moduleName}`, "INFO");
  });
  
  // Add event to new button (to launch the module)
  newButton.addEventListener("click", () => {
    launch(GrapheneModule, moduleName, moduleColor);
  });
  
  // Close modal and clear
  document.getElementById("custom-module-modal").style.display = "none";
  nameInput.value = "";
  colorInput.value = "#ff6b6b";
  
  uiManager.log(`Custom module created: ${moduleName}`, "SUCCESS");
});
