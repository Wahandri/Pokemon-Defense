# 🏰 Tower Defense

Un juego Tower Defense para navegador estilo Bloons TD, construido con HTML + CSS + ES Modules. Sin dependencias, sin build.

---

## 🚀 Cómo ejecutar

### Opción A — Servidor local (recomendado, evita problemas con ES Modules)
```bash
# Python 3
python3 -m http.server 8080
# Luego abre: http://localhost:8080

# O con npx
npx serve .
```

### Opción B — Abre directamente
En **Firefox** puedes abrir `index.html` directamente (permite ES Modules locales).  
En **Chrome/Edge** necesitas un servidor local por restricciones de CORS.

---

## 🎮 Controles

| Acción                  | Control                        |
|-------------------------|-------------------------------|
| Colocar torre           | Seleccionar tipo → Click en mapa |
| Seleccionar torre       | Click en torre colocada        |
| Deseleccionar           | `Esc` o click derecho          |
| Seleccionar Dart Tower  | `1`                            |
| Seleccionar Tack Tower  | `2`                            |
| Seleccionar Ice Tower   | `3`                            |
| Pausa / Reanudar        | `P` o botón Pausa              |
| Reiniciar               | `R` o botón Reset              |
| Toggle Debug            | `D` (hitboxes, rangos, WPs)    |
| Iniciar oleada          | Botón "Iniciar Oleada"         |
| Velocidad ×2            | Botón ⚡ ×2                    |

---

## 🗂️ Estructura del proyecto

```
DefenseGame/
├── index.html              # Entry point, HTML + CSS
└── src/
    ├── main.js             # Bootstrap
    ├── game/
    │   ├── Game.js         # Estado, loop, input
    │   └── ScenePlay.js    # Escena principal de juego
    ├── entities/
    │   ├── Enemy.js        # Clase Enemy + defs Red/Blue/Green
    │   ├── Tower.js        # Clase Tower + Dart/Tack/Ice + upgrades
    │   ├── Projectile.js   # Dart/Tack/Ice proyectiles
    │   └── Particle.js     # Sistema de partículas de muerte
    ├── systems/
    │   ├── PathSystem.js   # Waypoints, posición en camino, celdas bloqueadas
    │   ├── WaveSystem.js   # Spawning de oleadas
    │   └── Collision.js    # Detección de colisión proyectil-enemigo
    ├── ui/
    │   └── UI.js           # Actualización del DOM (HUD, paneles, toasts)
    ├── data/
    │   ├── maps.js         # Definición del mapa (waypoints)
    │   └── waves.js        # 10 oleadas con grupos y delays
    └── utils/
        ├── constants.js    # Constantes globales (CELL, CANVAS_W, etc.)
        ├── math.js         # dist, angle, lerp, clamp, pixelToGrid…
        └── storage.js      # localStorage: guardar/leer bestScore
```

---

## 🏗️ Cómo extender el juego

### Añadir un nuevo enemigo

1. Abre `src/utils/constants.js` y añade la clave al enum `ENEMY_TYPE`.
2. Abre `src/entities/Enemy.js` y añade la definición en `ENEMY_DEFS`:
```js
[ENEMY_TYPE.BOSS]: {
  label: 'Boss', hp: 600, speed: 40, reward: 50,
  color: '#a371f7', glowColor: '#c490f5', radius: 20, damage: 3,
},
```
3. Úsalo en una oleada de `src/data/waves.js`.

---

### Añadir una nueva torre

1. Añade la clave en `TOWER_TYPE` en `constants.js`.
2. En `src/entities/Tower.js`, añade la definición en `TOWER_DEFS` con sus upgrades.
3. Crea una subclase de `Tower` con su lógica `_shoot()`.
4. Añádela al switch del `createTower()` factory.
5. Añade el botón HTML en `index.html` (torres) y enlázalo en `ScenePlay._bindUI()`.

---

### Añadir una nueva oleada

Abre `src/data/waves.js` y añade un nuevo array al final del array `WAVES`:
```js
// Wave 11 - Horda especial
[
  { type: ENEMY_TYPE.BOSS, count: 3, delay: 3000 },
  { type: ENEMY_TYPE.GREEN, count: 15, delay: 400 },
],
```

---

### Añadir un nuevo mapa

1. Abre `src/data/maps.js` y añade un nuevo objeto con `waypoints`.
2. Impórtalo y úsalo en `ScenePlay.js`.

---

## 💾 Persistencia (localStorage)

El juego guarda automáticamente:
- **bestScore**: mejor oleada sobrevivida
- **lastSpeed**: preferencia de velocidad (×1 / ×2)

Clave: `towerDefense_v1` — puedes borrarla en DevTools para resetear.

---

## 🎯 Torres

| Torre      | Coste | Descripción                                 |
|------------|-------|---------------------------------------------|
| 🏹 Dart    | $100  | Disparo homing al objetivo más adelantado   |
| ⭐ Tack    | $150  | Ráfaga radial, alto burst en área pequeña   |
| ❄️ Ice     | $120  | Aplica slow al objetivo; sin mucho daño     |

Cada torre tiene **2 niveles de mejora** con camino A (daño) o B (alcance/cadencia).

## 👾 Enemigos

| Enemigo | Vida | Velocidad | Recompensa |
|---------|------|-----------|------------|
| 🔴 Red  | 40   | 90 px/s   | $5         |
| 🔵 Blue | 100  | 60 px/s   | $10        |
| 🟢 Green| 160  | 110 px/s  | $20        |
