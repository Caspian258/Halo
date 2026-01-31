export class LaunchHUD {
  constructor() {
    // Create the container if it doesn't exist
    this.container = document.createElement('div');
    this.container.id = 'launch-hud';
    document.body.appendChild(this.container);
    
    // Initial styles (Hidden)
    this.container.style.display = 'none';
  }

  show(module, destination) {
    this.module = module;
    this.destination = destination;
    this.container.style.display = 'flex'; // Flex for horizontal
    this.startTime = Date.now();
    this.lastPosition = module.mesh.position.clone();
    this.lastUpdateTime = Date.now();
    
    // Reset visual animation
    this.container.classList.remove('fade-in');
    void this.container.offsetWidth; // Trigger reflow
    this.container.classList.add('fade-in');
  }

  update() {
    if (!this.module || this.container.style.display === 'none') return;

    const currentPos = this.module.mesh.position;
    const currentTime = Date.now();
    const deltaTime = (currentTime - this.lastUpdateTime) / 1000; // seconds
    
    // Distance to destination from the HUB
    const distance = BABYLON.Vector3.Distance(currentPos, this.destination);
    
    // Calculate real velocity (position change / time)
    let velocity = 0;
    if (deltaTime > 0 && this.lastPosition) {
      const displacement = BABYLON.Vector3.Distance(currentPos, this.lastPosition);
      velocity = displacement / deltaTime; // m/s
    }
    
    // Estimated ETA (time to arrive)
    let eta = velocity > 0.1 ? (distance / velocity) : 0;
    
    // Update values for the next frame
    this.lastPosition = currentPos.clone();
    this.lastUpdateTime = currentTime;

    // Structured HTML Horizontally
    this.container.innerHTML = `
      <div class="hud-item">
        <span class="hud-label">DISTANCE TO HUB</span>
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

    // Auto-hide if arrived (Distance < 0.2)
    if (distance < 0.2) {
      this.hide();
    }
  }

  hide() {
    this.container.style.display = 'none';
    this.module = null;
  }
}
