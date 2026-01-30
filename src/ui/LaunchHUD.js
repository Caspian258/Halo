export class LaunchHUD {
  constructor() {
    // Crear el contenedor si no existe
    this.container = document.createElement('div');
    this.container.id = 'launch-hud';
    document.body.appendChild(this.container);
    
    // Estilos iniciales (Oculto)
    this.container.style.display = 'none';
  }

  show(module, destination) {
    this.module = module;
    this.destination = destination;
    this.container.style.display = 'flex'; // Flex para horizontal
    this.startTime = Date.now();
    
    // Resetear animación visual
    this.container.classList.remove('fade-in');
    void this.container.offsetWidth; // Trigger reflow
    this.container.classList.add('fade-in');
  }

  update() {
    if (!this.module || this.container.style.display === 'none') return;

    const currentPos = this.module.mesh.position;
    const distance = BABYLON.Vector3.Distance(currentPos, this.destination);
    
    // Velocidad simulada (basada en cambio de distancia o fake)
    const velocity = (distance * 1.5).toFixed(0); 
    
    // ETA simulado
    const eta = (distance / 5).toFixed(1);

    // HTML Estructurado Horizontalmente
    this.container.innerHTML = `
      <div class="hud-item">
        <span class="hud-label">TARGET DISTANCE</span>
        <span class="hud-value">${distance.toFixed(1)} <small>m</small></span>
      </div>
      <div class="hud-separator"></div>
      <div class="hud-item">
        <span class="hud-label">VELOCITY</span>
        <span class="hud-value">${velocity} <small>m/s</small></span>
      </div>
      <div class="hud-separator"></div>
      <div class="hud-item">
        <span class="hud-label">T-MINUS (ETA)</span>
        <span class="hud-value text-warning">${eta} <small>s</small></span>
      </div>
      <div class="hud-separator"></div>
      <div class="hud-item status-blink">
        <span class="hud-label">STATUS</span>
        <span class="hud-value text-success">APPROACHING</span>
      </div>
    `;

    // Auto-ocultar si llegó (Distancia < 0.2)
    if (distance < 0.2) {
      this.hide();
    }
  }

  hide() {
    this.container.style.display = 'none';
    this.module = null;
  }
}
