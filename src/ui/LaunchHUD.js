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
    this.lastPosition = module.mesh.position.clone();
    this.lastUpdateTime = Date.now();
    
    // Resetear animación visual
    this.container.classList.remove('fade-in');
    void this.container.offsetWidth; // Trigger reflow
    this.container.classList.add('fade-in');
  }

  update() {
    if (!this.module || this.container.style.display === 'none') return;

    const currentPos = this.module.mesh.position;
    const currentTime = Date.now();
    const deltaTime = (currentTime - this.lastUpdateTime) / 1000; // segundos
    
    // Distancia al destino desde el HUB
    const distance = BABYLON.Vector3.Distance(currentPos, this.destination);
    
    // Calcular velocidad real (cambio de posición / tiempo)
    let velocity = 0;
    if (deltaTime > 0 && this.lastPosition) {
      const displacement = BABYLON.Vector3.Distance(currentPos, this.lastPosition);
      velocity = displacement / deltaTime; // m/s
    }
    
    // ETA estimado (tiempo para llegar)
    let eta = velocity > 0.1 ? (distance / velocity) : 0;
    
    // Actualizar valores para el siguiente frame
    this.lastPosition = currentPos.clone();
    this.lastUpdateTime = currentTime;

    // HTML Estructurado Horizontalmente
    this.container.innerHTML = `
      <div class="hud-item">
        <span class="hud-label">HUB DISTANCE</span>
        <span class="hud-value">${distance.toFixed(2)} <small>m</small></span>
      </div>
      <div class="hud-separator"></div>
      <div class="hud-item">
        <span class="hud-label">VELOCITY</span>
        <span class="hud-value">${velocity.toFixed(2)} <small>m/s</small></span>
      </div>
      <div class="hud-separator"></div>
      <div class="hud-item">
        <span class="hud-label">CONNECTION TIME</span>
        <span class="hud-value text-warning">${eta.toFixed(1)} <small>s</small></span>
      </div>
      <div class="hud-separator"></div>
      <div class="hud-item status-blink">
        <span class="hud-label">STATUS</span>
        <span class="hud-value text-success">DOCKING</span>
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
