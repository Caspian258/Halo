/**
 * GraphVisualizer.js
 * Digital Twin Navigation Graph - 2D visualizer of station topology
 * Based on "Edge-Connected Modular Orbital Assembly" algorithm
 */

export class GraphVisualizer {
  constructor(canvasId, simulationManager, sceneManager) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    
    this.ctx = this.canvas.getContext("2d");
    this.simulationManager = simulationManager;
    this.sceneManager = sceneManager;
    
    this.scale = 70;
    this.targetScale = 70;
    this.hexSize = 12;
    this.hubSize = 16;
    
    this.cameraOffset = { x: 0, y: 0 };
    this.targetOffset = { x: 0, y: 0 };
    this.zoomLevels = [50, 70, 100, 140];
    this.currentZoomIndex = 1;
    
    this.graph = new Map();
    this.selectedModule = null;
    this.pathToSelected = [];
    
    // Virtual agents system for 2D animation
    this.virtualAgents = [];
    this.completedModules = new Map(); // Save info of completed modules
    this.dockedModules = new Set(); // IDs of modules that have docked (100%)
    
    // Simplified HCW physics constants
    this.DT = 0.05;
    this.N = 0.05;
    this.KP = 0.9;
    this.KD = 1.2;
    this.DAMP = 0.35;
    this.BASE_THRUST = 0.02;
    this.THRUST_GAIN = 0.03;
    this.DOCK_R = 0.15;
    this.DOCK_V = 0.1;
    
    this.colors = {
      bg: "#0b0e14",
      hub: "#ffd54f",
      module: "#42a5f5",
      connection: "#4caf50",
      pathHighlight: "#00ff41",
      selected: "#ff00ff",
      approaching: "#64748b",
      dashedConnection: "#475569"
    };
    
    this.canvas.addEventListener("click", (e) => this.handleClick(e));
    this.canvas.addEventListener("wheel", (e) => this.handleWheel(e), { passive: false });
    
    this.startRenderLoop();
  }
  
  /**
   * Crea un agente virtual que se aproxima a su destino
   */
  createVirtualAgent(targetMesh) {
    const modules = this.simulationManager.modules;
    if (!modules || modules.length === 0) return;
    
    // Posición inicial aleatoria alrededor de la estación
    const angle = Math.random() * Math.PI * 2;
    const distance = 5;
    
    const moduleName = targetMesh.metadata?.parentModule?.name || "Módulo";
    const moduleId = this.getModuleId(targetMesh);
    
    const agent = {
      id: moduleId,
      targetMesh: targetMesh,
      name: moduleName,
      pos: {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance
      },
      vel: { x: 0, y: 0 },
      docked: false,
      isHub: targetMesh.metadata?.isHub || false,
      initialDistance: distance,
      maxProgress: 0 // Guardar progreso máximo alcanzado
    };
    
    this.virtualAgents.push(agent);
  }
  
  /**
   * Física HCW simplificada para aproximación
   */
  propagate(agent, thrust) {
    const ax = 3 * this.N * this.N * agent.pos.x + 2 * this.N * agent.vel.y + thrust.x;
    const ay = -2 * this.N * agent.vel.x + thrust.y;
    
    agent.vel.x += ax * this.DT;
    agent.vel.y += ay * this.DT;
    agent.pos.x += agent.vel.x * this.DT;
    agent.pos.y += agent.vel.y * this.DT;
  }
  
  /**
   * Control PD para aproximación
   */
  computeControl(agent) {
    const target = agent.targetMesh.position;
    const tx = target.x;
    const ty = target.z;
    
    const ex = agent.pos.x - tx;
    const ey = agent.pos.y - ty;
    const evx = agent.vel.x;
    const evy = agent.vel.y;
    
    let ux = -this.KP * ex - this.KD * evx - (3 * this.N * this.N * agent.pos.x + 2 * this.N * agent.vel.y) - this.DAMP * agent.vel.x;
    let uy = -this.KP * ey - this.KD * evy + (2 * this.N * agent.vel.x) - this.DAMP * agent.vel.y;
    
    const umax = this.BASE_THRUST + this.THRUST_GAIN * Math.hypot(ex, ey);
    const mag = Math.hypot(ux, uy);
    if (mag > umax) {
      ux *= umax / mag;
      uy *= umax / mag;
    }
    
    return { x: ux, y: uy };
  }
  
  /**
   * Updates virtual agents
   */
  updateVirtualAgents() {
    this.virtualAgents = this.virtualAgents.filter(agent => {
      if (agent.docked) return false;
      
      const target = agent.targetMesh.position;
      const tx = target.x;
      const ty = target.z;
      
      const dr = Math.hypot(agent.pos.x - tx, agent.pos.y - ty);
      const dv = Math.hypot(agent.vel.x, agent.vel.y);
      
      // Update progress (current distance vs initial)
      agent.currentDistance = dr;
      const currentProgress = Math.max(0, Math.min(100, ((agent.initialDistance - dr) / agent.initialDistance) * 100));
      // Progress only goes up, never down
      agent.maxProgress = Math.max(agent.maxProgress, currentProgress);
      agent.progress = agent.maxProgress;
      
      // Check if docked
      if (dr < this.DOCK_R && dv < this.DOCK_V) {
        agent.docked = true;
        agent.progress = 100; // Ensure 100% on docking
        
        // Save in completed to keep in UI
        this.completedModules.set(agent.id, {
          name: agent.name,
          progress: 100,
          distance: 0,
          timestamp: Date.now()
        });
        
        // Mark as permanently docked
        this.dockedModules.add(agent.id);
        
        return false;
      }
      
      // Apply control
      const thrust = this.computeControl(agent);
      this.propagate(agent, thrust);
      
      return true;
    });
    
    // Clean completed modules after 3 seconds
    const now = Date.now();
    this.completedModules.forEach((data, key) => {
      if (now - data.timestamp > 3000) {
        this.completedModules.delete(key);
      }
    });
    
    // Actualizar UI de progreso
    this.updateProgressUI();
  }
  
  /**
   * Actualiza la UI de progreso en el panel lateral
   */
  updateProgressUI() {
    const container = document.getElementById("progress-container");
    if (!container) return;
    
    if (this.virtualAgents.length === 0 && this.completedModules.size === 0) {
      container.innerHTML = '<p style="color: #64748b; font-size: 10px; text-align: center; padding: 8px;">Sin módulos en ruta</p>';
      return;
    }
    
    let html = '';
    
    // Mostrar agentes en ruta
    this.virtualAgents.forEach((agent, index) => {
      const progress = agent.progress || 0;
      html += `
        <div style="margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #94a3b8; font-size: 10px;">${agent.name}</span>
            <span style="color: #64748b; font-size: 9px;">${progress.toFixed(0)}%</span>
          </div>
          <div style="width: 100%; height: 4px; background: #1e293b; border-radius: 2px; overflow: hidden;">
            <div style="width: ${progress}%; height: 100%; background: linear-gradient(90deg, #06b6d4 0%, #0891b2 100%); transition: width 0.3s;"></div>
          </div>
          <div style="color: #64748b; font-size: 9px; margin-top: 2px;">
            ${agent.currentDistance?.toFixed(2) || '0.00'} m
          </div>
        </div>
      `;
    });
    
    // Show recently completed modules
    this.completedModules.forEach((data, key) => {
      html += `
        <div style="margin-bottom: 12px; opacity: 0.7;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #10b981; font-size: 10px;">✓ ${data.name}</span>
            <span style="color: #10b981; font-size: 9px;">100%</span>
          </div>
          <div style="width: 100%; height: 4px; background: #1e293b; border-radius: 2px; overflow: hidden;">
            <div style="width: 100%; height: 100%; background: linear-gradient(90deg, #10b981 0%, #059669 100%);"></div>
          </div>
          <div style="color: #10b981; font-size: 9px; margin-top: 2px;">
            DOCKED
          </div>
        </div>
      `;
    });
    
    container.innerHTML = html;
  }
  
  /**
   * Builds connectivity graph from SimulationManager.modules
   */
  buildGraph() {
    this.graph.clear();
    
    const modules = this.simulationManager.modules;
    if (!modules || modules.length === 0) return;
    
    // Central hub is always first element (ID 0)
    const centralHub = modules[0];
    if (!centralHub || !centralHub.mesh) return;
    
    const hubId = this.getModuleId(centralHub.mesh);
    this.graph.set(hubId, []);
    
    // Only connect each module with central hub (no module-to-module connections)
    modules.forEach((mod, idx) => {
      if (idx === 0 || !mod.mesh) return; // Skip hub itself
      
      const modId = this.getModuleId(mod.mesh);
      const dist = BABYLON.Vector3.Distance(centralHub.mesh.position, mod.mesh.position);
      
      // If module is close to hub (< 3.0 units)
      if (dist < 3.0) {
        if (!this.graph.has(modId)) {
          this.graph.set(modId, []);
        }
        
        // Bidirectional hub-module connection
        if (!this.graph.get(hubId).includes(modId)) {
          this.graph.get(hubId).push(modId);
        }
        if (!this.graph.get(modId).includes(hubId)) {
          this.graph.get(modId).push(hubId);
        }
      }
    });
  }
  
  /**
   * Gets unique ID from module's mesh
   */
  getModuleId(mesh) {
    return mesh.uniqueId || mesh.id || mesh.name;
  }
  
  /**
   * Pathfinding algorithm (BFS) from central hub to selected module
   */
  findPath(targetId) {
    if (!this.graph.size) return [];
    
    const modules = this.simulationManager.modules;
    if (!modules || modules.length === 0) return [];
    
    const centralHubId = this.getModuleId(modules[0].mesh);
    if (centralHubId === targetId) return [centralHubId];
    
    // BFS
    const queue = [[centralHubId]];
    const visited = new Set([centralHubId]);
    
    while (queue.length > 0) {
      const path = queue.shift();
      const current = path[path.length - 1];
      
      if (current === targetId) {
        return path;
      }
      
      const neighbors = this.graph.get(current) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push([...path, neighbor]);
        }
      }
    }
    
    return []; // No path found
  }
  
  /**
   * Selects a module and calculates path
   */
  selectModule(mesh) {
    if (!mesh) {
      this.selectedModule = null;
      this.pathToSelected = [];
      return;
    }
    
    this.selectedModule = mesh;
    const moduleId = this.getModuleId(mesh);
    this.pathToSelected = this.findPath(moduleId);
  }
  
  handleClick(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    
    const modules = this.simulationManager.modules;
    
    for (const mod of modules) {
      if (!mod.mesh) continue;
      
      const pos = this.get2DPosition(mod.mesh, cx, cy);
      const dist = Math.hypot(x - pos.x, y - pos.y);
      
      const isHub = mod.mesh.metadata?.isHub;
      const hitRadius = isHub ? this.hubSize : this.hexSize;
      
      if (dist < hitRadius) {
        if (isHub) {
          this.zoomIn();
        }
        
        if (this.sceneManager.handleModuleClick) {
          this.sceneManager.handleModuleClick(mod.mesh);
        }
        
        this.selectModule(mod.mesh);
        return;
      }
    }
    
    this.selectModule(null);
  }
  
  handleWheel(event) {
    event.preventDefault();
    
    if (event.deltaY < 0) {
      this.zoomIn();
    } else {
      this.zoomOut();
    }
  }
  
  zoomIn() {
    if (this.currentZoomIndex < this.zoomLevels.length - 1) {
      this.currentZoomIndex++;
      this.targetScale = this.zoomLevels[this.currentZoomIndex];
    }
  }
  
  zoomOut() {
    if (this.currentZoomIndex > 0) {
      this.currentZoomIndex--;
      this.targetScale = this.zoomLevels[this.currentZoomIndex];
    }
  }
  
  /**
   * Convierte posición 3D a coordenadas 2D del canvas
   */
  get2DPosition(mesh, cx, cy) {
    const pos3d = mesh.position;
    
    // Proyección simple XZ -> 2D con offset de cámara
    const x = cx + (pos3d.x - this.cameraOffset.x) * this.scale;
    const y = cy + (pos3d.z - this.cameraOffset.y) * this.scale;
    
    return { x, y };
  }
  
  /**
   * Calcula el centro de la estación (hub central)
   */
  calculateStationCenter() {
    const modules = this.simulationManager.modules;
    if (!modules || modules.length === 0) return { x: 0, y: 0 };
    
    // El hub central es el primer módulo
    const centralHub = modules[0];
    if (centralHub && centralHub.mesh) {
      return {
        x: centralHub.mesh.position.x,
        y: centralHub.mesh.position.z
      };
    }
    
    return { x: 0, y: 0 };
  }
  
  /**
   * Dibuja una línea entre dos módulos
   */
  drawLine(meshA, meshB, cx, cy, color, dashed = false) {
    const posA = this.get2DPosition(meshA, cx, cy);
    const posB = this.get2DPosition(meshB, cx, cy);
    
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    
    if (dashed) {
      this.ctx.setLineDash([5, 5]);
    } else {
      this.ctx.setLineDash([]);
    }
    
    this.ctx.beginPath();
    this.ctx.moveTo(posA.x, posA.y);
    this.ctx.lineTo(posB.x, posB.y);
    this.ctx.stroke();
    
    this.ctx.setLineDash([]);
  }
  
  /**
   * Verifica si un módulo está acoplado (basado en progreso 100%)
   */
  isModuleDocked(mesh) {
    if (!mesh) return false;
    const moduleId = mesh.uniqueId || mesh.id;
    // El módulo está acoplado SOLO si completó el 100% de progreso
    return this.dockedModules.has(moduleId);
  }
  
  /**
   * Dibuja un hexágono
   */
  drawHex(x, y, radius, color, filled = false) {
    this.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = i * Math.PI / 3;
      const hx = x + radius * Math.cos(angle);
      const hy = y + radius * Math.sin(angle);
      if (i === 0) {
        this.ctx.moveTo(hx, hy);
      } else {
        this.ctx.lineTo(hx, hy);
      }
    }
    this.ctx.closePath();
    
    if (filled) {
      this.ctx.fillStyle = color;
      this.ctx.fill();
    }
    
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }
  
  render() {
    if (!this.canvas || !this.ctx) return;
    
    this.ctx.fillStyle = this.colors.bg;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    
    // Update virtual agents
    this.updateVirtualAgents();
    
    // Update camera offset (center on hub)
    const center = this.calculateStationCenter();
    this.targetOffset.x = center.x;
    this.targetOffset.y = center.y;
    
    // Smooth camera and zoom animation
    const lerp = 0.1;
    this.cameraOffset.x += (this.targetOffset.x - this.cameraOffset.x) * lerp;
    this.cameraOffset.y += (this.targetOffset.y - this.cameraOffset.y) * lerp;
    this.scale += (this.targetScale - this.scale) * lerp;
    
    // Reconstruir grafo
    this.buildGraph();
    
    const modules = this.simulationManager.modules;
    if (!modules || modules.length === 0) return;
    
    const centralHub = modules[0];
    if (!centralHub || !centralHub.mesh) return;
    
    // 1. Dibujar conexiones hub-módulo (radiales desde el centro)
    modules.forEach((mod, idx) => {
      if (idx === 0 || !mod.mesh) return; // Saltar el hub mismo
      
      const dist = BABYLON.Vector3.Distance(centralHub.mesh.position, mod.mesh.position);
      
      // Solo dibujar si está cerca del hub
      if (dist < 3.0) {
        const isModuleDocked = this.isModuleDocked(mod.mesh);
        
        if (isModuleDocked) {
          // Módulo acoplado: línea verde sólida
          this.drawLine(centralHub.mesh, mod.mesh, cx, cy, this.colors.connection, false);
        } else {
          // Módulo no acoplado: línea gris cortada
          this.drawLine(centralHub.mesh, mod.mesh, cx, cy, this.colors.dashedConnection, true);
        }
      }
    });
    
    // 2. Draw modules
    modules.forEach(mod => {
      if (!mod.mesh) return;
      
      const pos = this.get2DPosition(mod.mesh, cx, cy);
      const isHub = mod.mesh.metadata?.isHub;
      const isSelected = this.selectedModule === mod.mesh;
      const isDocked = this.isModuleDocked(mod.mesh);
      
      let color;
      if (isHub) {
        color = this.colors.hub;
      } else {
        // Modules: gray if not docked, blue if docked
        color = isDocked ? this.colors.module : this.colors.approaching;
      }
      
      let size = isHub ? this.hubSize : this.hexSize;
      
      if (isSelected) {
        color = this.colors.selected;
        // Draw pulsing ring
        this.ctx.strokeStyle = this.colors.selected;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, size + 4, 0, Math.PI * 2);
        this.ctx.stroke();
      }
      
      this.drawHex(pos.x, pos.y, size, color, false);
      
      // Draw center point
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, 2, 0, Math.PI * 2);
      this.ctx.fill();
    });
    
    // 3.5 Draw virtual agents in approach
    this.virtualAgents.forEach(agent => {
      const x = cx + (agent.pos.x - this.cameraOffset.x) * this.scale;
      const y = cy + (agent.pos.y - this.cameraOffset.y) * this.scale;
      
      // Draw moving hexagon
      const color = agent.isHub ? this.colors.hub : this.colors.approaching;
      const size = agent.isHub ? this.hubSize : this.hexSize;
      
      this.drawHex(x, y, size, color, false);
      
      // Draw movement trail
      const vx = agent.vel.x * this.scale * 5;
      const vy = agent.vel.y * this.scale * 5;
      
      if (Math.hypot(vx, vy) > 1) {
        this.ctx.strokeStyle = color + "44";
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x - vx, y - vy);
        this.ctx.stroke();
      }
    });
    
    // 4. Draw text information
    this.ctx.fillStyle = "#00ffff";
    this.ctx.font = "10px 'JetBrains Mono', monospace";
    this.ctx.fillText(`NODES: ${modules.length}`, 8, 15);
    this.ctx.fillText(`LINKS: ${this.countConnections()}`, 8, 28);
    this.ctx.fillText(`ZOOM: ${this.scale.toFixed(0)}x`, 8, 41);
    this.ctx.fillText(`EN ROUTE: ${this.virtualAgents.length}`, 8, 54);
    
    if (this.selectedModule) {
      const name = this.selectedModule.metadata?.parentModule?.name || "Module";
      this.ctx.fillText(`SEL: ${name}`, 8, 67);
    }
    
    // Instructions
    this.ctx.fillStyle = "#64748b";
    this.ctx.font = "9px 'JetBrains Mono', monospace";
    this.ctx.fillText(`Click HUB: Zoom | Wheel: ±Zoom`, 8, this.canvas.height - 8);
  }
  
  /**
   * Counts total number of connections
   */
  countConnections() {
    let total = 0;
    this.graph.forEach(neighbors => {
      total += neighbors.length;
    });
    return Math.floor(total / 2); // Each connection counted twice
  }
  
  /**
   * Inicia el loop de renderizado
   */
  startRenderLoop() {
    const loop = () => {
      this.render();
      requestAnimationFrame(loop);
    };
    loop();
  }
}
