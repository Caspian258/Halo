# 📊 Digital Twin Navigation Graph - Visualizador 2D

## 🎯 Descripción

Sistema de visualización topológica 2D basado en el algoritmo matemático **"Edge-Connected Modular Orbital Assembly"**. 

Muestra la estructura de la estación espacial en tiempo real con:
- Representación de nodos (Hubs y Módulos)
- Conexiones entre módulos
- Pathfinding automático
- Sincronización bidireccional 3D ↔ 2D

---

## 📍 Ubicación en UI

**Panel lateral izquierdo** (`#sidebar`), debajo del botón "SIMULAR FALLA"

```
┌─────────────────────────┐
│ [Módulos de lanzamiento]│
│ [SIMULAR FALLA]         │
│ ┌─────────────────────┐ │
│ │ TOPOLOGÍA DE RED    │ │ ← NUEVO
│ │ [Canvas 2D 250x250] │ │
│ └─────────────────────┘ │
└─────────────────────────┘
```

---

## 🎨 Elementos Visuales

| Elemento | Color | Descripción |
|----------|-------|-------------|
| 🟡 Hexágono Grande | `#ffd54f` | Hub Central / Nodos HUB |
| 🔵 Hexágono Pequeño | `#42a5f5` | Módulos regulares |
| 🟢 Líneas | `#4caf50` | Conexiones activas |
| 💚 Líneas Brillantes | `#00ff41` | Ruta al módulo seleccionado |
| 🔴 Anillo Pulsante | `#ff00ff` | Módulo actualmente seleccionado |

---

## 🔧 Funcionalidades Implementadas

### 1️⃣ **Construcción Automática del Grafo**
```javascript
buildGraph() {
  // Lee SimulationManager.modules
  // Construye Map<moduleId, [connectedIds]>
  // Detecta conexiones por proximidad (< 3.0 unidades)
}
```

### 2️⃣ **Pathfinding (BFS)**
```javascript
findPath(targetId) {
  // Algoritmo de búsqueda en anchura
  // Desde Hub Central (0,0) hasta módulo objetivo
  // Retorna array de IDs formando la ruta
}
```

### 3️⃣ **Sincronización Bidireccional**

**3D → 2D:**
- Clic en módulo 3D → Se ilumina en canvas 2D
- Se dibuja ruta desde hub central

**2D → 3D:**
- Clic en hexágono 2D → Selecciona módulo en escena 3D
- Abre panel inspector con datos del módulo

### 4️⃣ **Información en Tiempo Real**
```
NODOS: 12
ENLACES: 11
SEL: Grafeno
```

---

## 🔗 Integración con el Sistema

### Archivos Modificados/Creados:

1. **`src/ui/GraphVisualizer.js`** ✨ NUEVO
   - Clase principal del visualizador
   - Renderizado 2D con Canvas API
   - Algoritmos de pathfinding

2. **`index.html`**
   - Agregado `<canvas id="graph-canvas">` en sidebar
   - Header con icono de diagrama

3. **`style.css`**
   - Estilos para `#graph-container`
   - Border cian (`#06b6d4`)
   - Cursor crosshair

4. **`src/main.js`**
   - Import de `GraphVisualizer`
   - Instanciación y conexión con SceneManager

5. **`src/core/SceneManager.js`**
   - Método `handleModuleClick(mesh)` para sincronización
   - Integración con `graphVisualizer.selectModule()`

---

## 📐 Algoritmo Matemático Base

**Inspirado en:** "Edge-Connected HUB–HEX Orbital Assembly" (PDF adjunto)

### Adaptaciones Realizadas:

| Original (Simulación Física) | Implementado (Digital Twin) |
|------------------------------|----------------------------|
| HCW equations (`propagate()`) | ❌ No usado (usa datos reales de Babylon.js) |
| `assign()` puerto libre | ✅ Adaptado con `findFreeSlot()` |
| Estructura de grafo (Map) | ✅ Implementado exactamente igual |
| `draw()` hexágonos | ✅ Implementado con Canvas 2D |
| Conexiones por física | ✅ Conexiones por proximidad 3D |

### Código Clave Adaptado:

```javascript
// Original del PDF:
function hex(x,y,r,c){
  ctx.beginPath();
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3;
    ctx.lineTo(x+r*Math.cos(a),y+r*Math.sin(a));
  }
  ctx.closePath();
  ctx.strokeStyle=c;
  ctx.stroke();
}

// Implementado en GraphVisualizer.js:
drawHex(x, y, radius, color, filled) {
  this.ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = i * Math.PI / 3;
    const hx = x + radius * Math.cos(angle);
    const hy = y + radius * Math.sin(angle);
    if (i === 0) this.ctx.moveTo(hx, hy);
    else this.ctx.lineTo(hx, hy);
  }
  this.ctx.closePath();
  // ... fill/stroke logic
}
```

---

## 🚀 Uso

### Lanzar Módulos:
1. Clic en cualquier botón del sidebar (Grafeno, ZBLAN, etc.)
2. El módulo aparece en 3D **Y** en el canvas 2D automáticamente

### Seleccionar Módulo:
- **Opción A:** Clic en módulo 3D → Se destaca en 2D
- **Opción B:** Clic en hexágono 2D → Se selecciona en 3D

### Ver Ruta de Conexión:
- Al seleccionar cualquier módulo, se dibuja en **verde brillante** la ruta desde el Hub Central

### Deseleccionar:
- Clic en espacio vacío (3D o 2D)

---

## 🧮 Parámetros de Configuración

```javascript
// En GraphVisualizer constructor:
this.scale = 35;        // Escala de zoom
this.hexSize = 12;      // Radio módulos
this.hubSize = 16;      // Radio hubs
```

**Distancia de conexión:**
```javascript
// En buildGraph():
if (dist < 3.0) {  // Umbral de conectividad
  // Agregar enlace al grafo
}
```

---

## 🎓 Conceptos Matemáticos Aplicados

1. **Teoría de Grafos:**
   - Representación como grafo no dirigido
   - Map<Integer, List<Integer>>

2. **Búsqueda en Anchura (BFS):**
   - Encuentra camino más corto
   - Complejidad: O(V + E)

3. **Proyección 3D → 2D:**
   ```javascript
   x2d = cx + pos3d.x * scale
   y2d = cy + pos3d.z * scale
   ```
   (Proyección ortogonal del plano XZ)

4. **Detección de Colisiones 2D:**
   ```javascript
   dist = sqrt((x - mx)² + (y - my)²)
   if (dist < radius) → HIT
   ```

---

## ⚡ Rendimiento

- **Renderizado:** ~60 FPS (requestAnimationFrame)
- **Reconstrucción de grafo:** Cada frame (O(n²) comparaciones)
- **Pathfinding:** Solo cuando se selecciona un módulo (BFS)

**Optimización futura:**
- Cachear grafo (solo reconstruir cuando cambia topología)
- Spatial hashing para detección de conexiones

---

## 🐛 Debugging

```javascript
// Agregar en console para inspeccionar:
console.log(graphVisualizer.graph);
console.log(graphVisualizer.pathToSelected);
console.log(graphVisualizer.selectedModule);
```

---

## 📚 Referencias

- **Algoritmo base:** "Edge-Connected HUB–HEX Orbital Assembly" (PDF)
- **Canvas API:** MDN Web Docs - Canvas 2D
- **Pathfinding:** Breadth-First Search (BFS)
- **Babylon.js:** Vector3.Distance() para proximidad

---

**✅ Sistema completamente funcional y sincronizado**
