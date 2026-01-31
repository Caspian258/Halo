export class BaseModule {
  /**
   * @param {BABYLON.Scene} scene
   * @param {BABYLON.Vector3} position
   */
  constructor(scene, position = new BABYLON.Vector3(0, 0, 0)) {
    if (!scene) {
      throw new Error("BaseModule requiere una escena válida.");
    }

    this.scene = scene;
    this.position = position;

    this.id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `module-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

    this.name = "BaseModule";

    this.stats = {
      energy: 0,
      production: 0,
      status: "idle",
    };

    this.status = "NOMINAL";
    this.isDocked = false;
    this.resourcesGenerated = 0;
    this.originalEmissive = null;
    this.faultBlinkInterval = null;

    // Telemetría en tiempo real
    this.temperature = 50; // Grados Celsius
    this.cpuLoad = 25; // Porcentaje
    this.efficiency = 95.0; // OEE (Overall Equipment Effectiveness) %
    this.powerDraw = 12.5; // kW (Consumo eléctrico)

    this.mesh = this.createMesh();
    if (this.mesh) {
      this.mesh.position = this.position.clone();
    }
  }

  createMesh() {
    // 1. Cuerpo Principal (Hexágono)
    const body = BABYLON.MeshBuilder.CreateCylinder("moduleBody", {
      diameter: 3,
      height: 0.7,
      tessellation: 6
    }, this.scene);
    
    // Rotación para alineación Flat-Topped (cara con cara)
    body.rotation.y = Math.PI / 6; // 30 grados

    // 2. Anillo Separador (Junta mecánica oscura)
    const ring = BABYLON.MeshBuilder.CreateCylinder("moduleSeparator", {
      diameter: 3.1,        // Sobresale ligeramente
      height: 0.05,         // Muy fino
      tessellation: 6
    }, this.scene);
    ring.parent = body;
    ring.position.y = 0.35; // Justo en la unión

    // Material del anillo: Negro mate
    const ringMat = new BABYLON.StandardMaterial("ringMat", this.scene);
    ringMat.diffuseColor = BABYLON.Color3.FromHexString("#111111");
    ringMat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05); // Casi mate
    ringMat.specularPower = 16;
    ring.material = ringMat;

    // 3. Cúpula Superior (Cono truncado hexagonal)
    const cap = BABYLON.MeshBuilder.CreateCylinder("moduleCap", {
      diameterTop: 1.5,     // Más estrecho arriba
      diameterBottom: 3,    // Igual que el cuerpo abajo
      height: 0.35,
      tessellation: 6
    }, this.scene);
    cap.parent = body;
    cap.position.y = 0.55; // (0.35 base + 0.05 anillo + 0.175 mitad cap)
    
    // 4. Tren de Aterrizaje (6 patas mecánicas en las esquinas del hexágono)
    const legMat = new BABYLON.StandardMaterial("legMat", this.scene);
    legMat.diffuseColor = new BABYLON.Color3(1, 1, 1); // Blanco puro
    legMat.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5); // Brillo metálico
    legMat.specularPower = 32;

    for (let i = 0; i < 6; i++) {
      const angle = (i * 60) * (Math.PI / 180); // 0°, 60°, 120°, 180°, 240°, 300°
      const radius = 1.3; // Distancia desde el centro a las esquinas del hexágono
      
      const leg = BABYLON.MeshBuilder.CreateCylinder(`moduleLeg${i}`, {
        diameter: 0.2,
        height: 0.4,
        tessellation: 8
      }, this.scene);
      
      leg.parent = body;
      leg.position.x = Math.cos(angle) * radius;
      leg.position.z = Math.sin(angle) * radius;
      leg.position.y = -0.55; // Debajo del cuerpo (0.7/2 + 0.4/2)
      leg.material = legMat;
      leg.metadata = { parentModule: this };
    }
    
    // 5. Material Base (Gris metálico por defecto)
    const mat = new BABYLON.StandardMaterial("baseMat", this.scene);
    mat.diffuseColor = this.color || new BABYLON.Color3(0.5, 0.5, 0.5);
    mat.specularColor = new BABYLON.Color3(0.2, 0.2, 0.2); // Mate
    
    body.material = mat;
    cap.material = mat; // La cúpula hereda el material

    // 6. Metadata para interacción (Click)
    body.metadata = { parentModule: this };
    ring.metadata = { parentModule: this }; // El anillo también es clickeable
    cap.metadata = { parentModule: this }; // La tapa también

    this.mesh = body;
    return body; // Retornamos el padre
  }

  updateColor(hexString) {
    if (!this.mesh?.material) return;
    
    const color = BABYLON.Color3.FromHexString(hexString);
    this.mesh.material.diffuseColor = color;
    
    // Emissive más oscuro (20% del color base para efecto sutil)
    this.mesh.material.emissiveColor = color.scale(0.2);
  }

  activate() {
    this.isDocked = true;

    this.productionInterval = setInterval(() => {
      this.resourcesGenerated += 1;
    }, 1000);
  }

  setDestination(targetPosition, onLandingComplete) {
    if (!this.mesh) return;
    
    // Animación suave de descenso
    const descentDuration = 120; // frames (~2 segundos a 60fps)
    let frame = 0;
    const startPos = this.mesh.position.clone();
    
    const animateDescend = () => {
      frame++;
      const progress = frame / descentDuration;
      
      // Easing suave (ease-out)
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      this.mesh.position = BABYLON.Vector3.Lerp(startPos, targetPosition, easeProgress);
      
      if (frame < descentDuration) {
        requestAnimationFrame(animateDescend);
      } else {
        // Aterrizaje completado
        this.mesh.position = targetPosition.clone();
        this.isDocked = true;
        
        // Call callback if it exists
        if (onLandingComplete) {
          onLandingComplete();
        }
      }
    };
    
    animateDescend();
  }

  triggerFault() {
    if (this.status === "CRITICAL") return; // Already in fault

    this.status = "CRITICAL";
    
    // Random fault types
    const faultTypes = [
      { name: "CRITICAL VOLTAGE", icon: "fa-bolt", color: "#fbbf24" },
      { name: "HIGH TEMPERATURE", icon: "fa-temperature-high", color: "#ef4444" },
      { name: "ABNORMAL PRESSURE", icon: "fa-gauge-high", color: "#f97316" },
      { name: "COMMUNICATION FAILURE", icon: "fa-wifi", color: "#06b6d4" },
      { name: "PROCESSOR ERROR", icon: "fa-microchip", color: "#a855f7" },
      { name: "DAMAGED SENSOR", icon: "fa-circle-exclamation", color: "#ef4444" }
    ];
    
    // Select random fault type
    this.currentFault = faultTypes[Math.floor(Math.random() * faultTypes.length)];
    
    // Create floating icon above module
    this.createFaultIcon();

    // Save original emissive color
    if (this.mesh?.material) {
      this.originalEmissive = this.mesh.material.emissiveColor.clone();

      // Cambiar a rojo brillante
      const criticalColor = BABYLON.Color3.FromHexString("#ef4444");

      // Animación de parpadeo
      let intensity = 1.0;
      let direction = -1;

      this.faultBlinkInterval = setInterval(() => {
        intensity += direction * 0.1;
        if (intensity <= 0.3 || intensity >= 1.0) {
          direction *= -1;
        }
        this.mesh.material.emissiveColor = criticalColor.scale(intensity);
      }, 100);
    }
  }
  
  createFaultIcon() {
    if (!this.mesh || !this.currentFault) return;
    
    // Create HTML element for floating icon
    const icon = document.createElement('div');
    icon.className = 'fault-icon';
    icon.innerHTML = `
      <div style="
        position: fixed;
        z-index: 1000;
        pointer-events: none;
        animation: float 2s ease-in-out infinite;
      ">
        <div style="
          background: ${this.currentFault.color};
          color: white;
          padding: 8px 12px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          border: 2px solid white;
        ">
          <i class="fa-solid ${this.currentFault.icon}" style="font-size: 14px;"></i>
          <span>${this.currentFault.name}</span>
        </div>
      </div>
    `;
    
    document.body.appendChild(icon);
    this.faultIconElement = icon;
    
    // Add CSS animation if it doesn't exist
    if (!document.getElementById('fault-animation-style')) {
      const style = document.createElement('style');
      style.id = 'fault-animation-style';
      style.textContent = `
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
      `;
      document.head.appendChild(style);
    }
    
    // Update icon position every frame
    this.updateFaultIconPosition();
  }
  
  updateFaultIconPosition() {
    if (!this.faultIconElement || !this.mesh || !this.scene) return;
    
    const updatePosition = () => {
      if (!this.faultIconElement || this.status !== "CRITICAL") return;
      
      // Get 3D position of module
      const position = this.mesh.position.clone();
      position.y += 2; // Offset above module
      
      // Convert to screen coordinates
      const engine = this.scene.getEngine();
      const camera = this.scene.activeCamera;
      
      if (camera && engine) {
        const worldMatrix = BABYLON.Matrix.Identity();
        const transformMatrix = camera.getViewMatrix().multiply(camera.getProjectionMatrix());
        const viewport = camera.viewport.toGlobal(
          engine.getRenderWidth(),
          engine.getRenderHeight()
        );
        
        const screenPos = BABYLON.Vector3.Project(
          position,
          worldMatrix,
          transformMatrix,
          viewport
        );
        
        // Update HTML element position
        const iconDiv = this.faultIconElement.firstElementChild;
        if (iconDiv && screenPos.z > 0 && screenPos.z < 1) {
          iconDiv.style.left = `${screenPos.x}px`;
          iconDiv.style.top = `${screenPos.y}px`;
          iconDiv.style.transform = 'translate(-50%, -100%)';
        }
      }
      
      requestAnimationFrame(updatePosition);
    };
    
    updatePosition();
  }

  repair() {
    if (this.status !== "CRITICAL") return false;

    this.status = "NOMINAL";

    // Stop blink animation
    if (this.faultBlinkInterval) {
      clearInterval(this.faultBlinkInterval);
      this.faultBlinkInterval = null;
    }

    // Restore original emissive color
    if (this.mesh?.material && this.originalEmissive) {
      this.mesh.material.emissiveColor = this.originalEmissive.clone();
    }
    
    // Remove fault icon
    if (this.faultIconElement) {
      this.faultIconElement.remove();
      this.faultIconElement = null;
    }
    
    this.currentFault = null;

    return true;
  }

  update() {
    // Simular variación natural de telemetría con fluctuación muy lenta y suave
    if (this.status === "CRITICAL") {
      // En estado crítico: Temperatura sube rápido hasta 150°C
      if (this.temperature < 150) this.temperature += 0.5;
      this.cpuLoad = 99.9;
      
      // Eficiencia cae drásticamente
      if (this.efficiency > 10) this.efficiency -= 1.5;
      
      // Consumo se dispara
      if (this.powerDraw < 45) this.powerDraw += 0.8;
      
    } else if (this.status === "NOMINAL") {
      // Temperatura oscila suavemente alrededor de 50°C
      // Factor de 0.05 para cambio imperceptible frame a frame, visible con el tiempo
      this.temperature += (Math.random() - 0.5) * 0.05;

      // Mantener en rango realista (45-55°C)
      if (this.temperature < 45) this.temperature += 0.1;
      if (this.temperature > 55) this.temperature -= 0.1;

      // CPU oscila lento
      this.cpuLoad += (Math.random() - 0.5) * 0.1;
      if (this.cpuLoad < 10) this.cpuLoad += 0.5;
      if (this.cpuLoad > 40) this.cpuLoad -= 0.5;
      
      // Eficiencia (OEE) oscila sutilmente alrededor de 95%
      this.efficiency += (Math.random() - 0.5) * 0.02;
      if (this.efficiency < 92) this.efficiency += 0.05;
      if (this.efficiency > 98) this.efficiency -= 0.05;
      
      // Consumo eléctrico oscila sutilmente
      this.powerDraw += (Math.random() - 0.5) * 0.05;
      if (this.powerDraw < 10) this.powerDraw += 0.1;
      if (this.powerDraw > 15) this.powerDraw -= 0.1;
    }
  }
}
