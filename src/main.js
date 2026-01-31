import { SceneManager } from "./core/SceneManager.js";
import { UIManager } from "./ui/UIManager.js";
import { FXManager } from "./core/FXManager.js";
import { LaunchHUD } from "./ui/LaunchHUD.js";
import { GrapheneModule } from "./modules/GrapheneModule.js";
import { PolymerModule } from "./modules/PolymerModule.js";
import { AerogelModule } from "./modules/AerogelModule.js";
import { HubExpansionModule } from "./modules/HubExpansionModule.js";

const sceneManager = new SceneManager("renderCanvas");
const uiManager = new UIManager();
const fxManager = new FXManager(sceneManager.scene);
const launchHUD = new LaunchHUD();

sceneManager.uiManager = uiManager;
sceneManager.simulationManager.fxManager = fxManager;
sceneManager.simulationManager.launchHUD = launchHUD;
uiManager.sceneManager = sceneManager;
uiManager.launchHUD = launchHUD;

window.uiManager = uiManager;

uiManager.log("System Initialized. Hub Connectivity: 100%", "SUCCESS");
uiManager.log("Awaiting module deployment commands...", "INFO");

const launch = (ModuleClass, name, colorHex, type = "MODULE") => {
  console.log(`🎯 Launch button clicked: ${name}`);
  uiManager.log(`Sequence initiated: Launching ${name}`, "INFO");
  sceneManager.simulationManager.launchModule(ModuleClass, { name, color: colorHex, type });
};

document.getElementById("btn-graphene")?.addEventListener("click", () => {
  console.log("Button graphene clicked");
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
    // Mostrar botón de reparar
    const fixBtn = document.getElementById("btn-fix-all");
    if (fixBtn) fixBtn.style.display = "block";
  }
});

document.getElementById("btn-fix-all")?.addEventListener("click", () => {
  if (sceneManager.simulationManager.fixAllFaults) {
    sceneManager.simulationManager.fixAllFaults();
    // Ocultar botón de reparar después de usarlo
    const fixBtn = document.getElementById("btn-fix-all");
    if (fixBtn) fixBtn.style.display = "none";
  }
});
