# Fábrica Espacial Modular (Digital Twin) — Babylon.js

Proyecto inicial para Hackathon: un Digital Twin WebGL de una fábrica espacial modular usando Babylon.js.

## Estructura

- src/core: Engine, loop principal y SceneManager
- src/modules: lógica de módulos de fábrica (Grafeno, Polímeros, etc.)
- src/simulation: acople, estado global y trayectorias (placeholders)
- src/ui: UI superpuesta (HUD/controles)
- src/localization: JSON de idiomas (EN/ES/FR)
- assets: recursos (vacío por ahora)

## Cómo probar (rápido)

Abre `index.html` con un servidor estático (recomendado).

Ejemplos:

- Python: `python3 -m http.server 5173`
- Node: `npx serve .`

Luego visita: `http://localhost:5173`

Por ahora solo verás el canvas a pantalla completa y un `console.log("Init")`.
