export class FXManager {
  constructor(scene) {
    if (!scene) {
      throw new Error("FXManager requiere una instancia de BABYLON.Scene.");
    }
    this.scene = scene;
  }

  createDockingEffect(position) {
    if (!position) {
      console.warn("FXManager.createDockingEffect: posición inválida.");
      return;
    }

    // Crear sistema de partículas
    const particleSystem = new BABYLON.ParticleSystem("dockingParticles", 50, this.scene);

    // Textura de flare del CDN de Babylon
    particleSystem.particleTexture = new BABYLON.Texture(
      "https://www.babylonjs.com/assets/Flare.png",
      this.scene
    );

    // Configuración de emisión
    particleSystem.emitter = position.clone();
    particleSystem.minEmitBox = new BABYLON.Vector3(-0.2, -0.2, -0.2);
    particleSystem.maxEmitBox = new BABYLON.Vector3(0.2, 0.2, 0.2);

    // Tiempo de vida de las partículas
    particleSystem.minLifeTime = 0.5;
    particleSystem.maxLifeTime = 1.0;

    // Tamaño de las partículas
    particleSystem.minSize = 0.1;
    particleSystem.maxSize = 0.3;

    // Colores: Blanco → Amarillo → Naranja transparente
    particleSystem.color1 = new BABYLON.Color4(1.0, 1.0, 1.0, 1.0); // Blanco
    particleSystem.color2 = new BABYLON.Color4(1.0, 1.0, 0.0, 1.0); // Amarillo
    particleSystem.colorDead = new BABYLON.Color4(1.0, 0.5, 0.0, 0.0); // Naranja transparente

    // Gravedad para que las partículas caigan ligeramente
    particleSystem.gravity = new BABYLON.Vector3(0, -0.5, 0);

    // Dirección y velocidad de emisión
    particleSystem.direction1 = new BABYLON.Vector3(-1, 1, -1);
    particleSystem.direction2 = new BABYLON.Vector3(1, 1, 1);
    particleSystem.minEmitPower = 1;
    particleSystem.maxEmitPower = 3;
    particleSystem.updateSpeed = 0.01;

    // Emisión manual (una sola explosión)
    particleSystem.manualEmitCount = 0;
    particleSystem.emitRate = 0;

    // Auto-limpieza cuando termine
    particleSystem.disposeOnStop = true;

    // Iniciar y disparar la explosión
    particleSystem.start();
    particleSystem.manualEmitCount = 50;

    // Detener después de que todas las partículas mueran
    setTimeout(() => {
      particleSystem.stop();
    }, 1500);
  }
}
