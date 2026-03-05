# README-IA — Team Rocket Defense
> **Documento de contexto para agentes de código**
> Última actualización: 2026-03-05 | Stack: Vanilla JS (ES Modules) + Canvas 2D

---

## 1. Resumen del Proyecto

**Team Rocket Defense** es un videojuego Tower Defense de temática Pokémon que corre en el navegador sin ningún framework ni build step. El jugador controla al Team Rocket: coloca agentes (torres) que lanzan Pokéballs para capturar Pokémon (enemigos) antes de que escapen por el camino.

- **Servidor de desarrollo**: `python3 -m http.server 8181 --directory .` → abre en `http://localhost:8181`
- **No hay bundler** (webpack, vite, etc.) — ES modules nativos cargados directamente desde `index.html`
- **No hay dependencias npm** — cero `node_modules`
- **Todo el arte** es canvas 2D puro + sprites de PokeAPI CDN (no hay archivos de imagen locales)

---

## 2. Árbol de Ficheros

```
DefenseGame/
├── index.html                  ← UI completa (HTML + CSS + <script type="module">)
├── README-IA.md                ← Este documento
└── src/
    ├── main.js                 ← Entry point (bootstraps Game)
    ├── data/
    │   ├── balance.js          ← ÚNICA FUENTE DE VERDAD de todas las stats
    │   ├── pokemon.js          ← Pools de Pokémon por tier + URLs de sprites
    │   ├── waves.js            ← Definición de 25 oleadas predefinidas
    │   └── maps.js             ← Waypoints del mapa (píxeles absolutos)
    ├── entities/
    │   ├── Enemy.js            ← Clase Enemy (Pokémon) + createEnemy()
    │   ├── Tower.js            ← 6 clases de torres TR + createTower()
    │   ├── Projectile.js       ← 6 variantes de Pokéball + Projectile base
    │   └── Particle.js         ← Sistema de partículas + efectos de captura
    ├── game/
    │   ├── Game.js             ← Máquina de estados + main loop rAF
    │   └── ScenePlay.js        ← Escena de juego (lógica principal)
    ├── systems/
    │   ├── PathSystem.js       ← Waypoints → posición, celdas bloqueadas
    │   ├── WaveSystem.js       ← Spawner de oleadas (predefinidas + procedurales)
    │   └── Collision.js        ← Detección de colisiones proyectil↔enemigo
    └── utils/
        ├── constants.js        ← CANVAS_W/H, CELL, COLS, ROWS, enums
        ├── math.js             ← dist, lerp, clamp, pixelToGrid, etc.
        ├── storage.js          ← localStorage: bestScore, lastSpeed
        └── ImageCache.js       ← Cache de imágenes async (Promise-based)
```

---

## 3. Arquitectura General

### Flujo de arranque

```
index.html
  └─ <script type="module" src="src/main.js">
       └─ new Game()
            ├─ Canvas setup (960×540)
            ├─ new UI()              ← agarra todos los DOM ids
            ├─ _bindInput()          ← keyboard + mouse en canvas
            ├─ showMenu()
            └─ requestAnimationFrame → _loop()
                   ├─ dt = (timestamp - lastTime) * speed   (cap 100ms)
                   ├─ scene.update(dt)    [si PLAYING]
                   └─ _render()
```

### Máquina de estados (`Game.state`)

```
MENU → [click INICIAR] → PLAYING → [vidas <= 0] → GAME_OVER → [click] → PLAYING
                                 ↕ (P / btn-pause)
                               PAUSED
```

### Loop de juego (`ScenePlay.update(dt)`)

```
1. WaveSystem.update(dt)       → spawna enemigos según timers
2. enemies[].update(dt)        → avanza por el path; si reached → quita vida
3. towers[].update(dt, ...)    → detecta target, emite proyectiles
4. projectiles[].update(dt)    → mueve proyectiles
5. Collision.check(projs, enemies)  → onHit → enemy.takeDamage()
6. Loop de recompensas         → si dead && captured → money++, Pokédex++
7. particles[].update(dt)
8. Limpieza de arrays (filter dead)
9. Wave-clear bonus            → si !isRunning && enemies.length === 0
10. _updateHUD()
11. Chequeo de game over
```

---

## 4. Constantes Globales (`utils/constants.js`)

| Constante | Valor | Descripción |
|---|---|---|
| `CANVAS_W` | `960` | Ancho del canvas en px |
| `CANVAS_H` | `540` | Alto del canvas en px |
| `CELL` | `32` | Tamaño de celda de grid en px |
| `COLS` | `30` | `CANVAS_W / CELL` |
| `ROWS` | `16` | `CANVAS_H / CELL` |
| `PATH_WIDTH` | `52` | Anchura del camino en px |

**Enums relevantes:**
```js
ENEMY_TYPE = { RED:'red', BLUE:'blue', GREEN:'green', T4:'t4', BOSS:'boss' }
TOWER_TYPE  = { DART:'dart', CANNON:'cannon', ICE:'ice', SNIPER:'sniper', LASER:'laser', MORTAR:'mortar' }
STATE       = { MENU, PLAYING, PAUSED, GAME_OVER }
```

---

## 5. Sistema de Camino (`PathSystem`)

El mapa usa **waypoints en coordenadas de píxel** (no de grid). El sistema:

1. **Precalcula** las longitudes de cada segmento y la longitud total del path.
2. Convierte un valor escalar `progress ∈ [0, totalLength]` en `{x, y, angle}` mediante interpolación lineal segmento a segmento.
3. **Rasteriza** el path sobre el grid: marca celdas como `blockedCells` para impedir colocar torres encima del camino.

### Waypoints de MAP1 ("Cañada Verde")

```
(0,100) → (200,100) → (200,260) → (480,260) → (480,100) → (720,100) → (720,420) → (480,420) → (480,540-exit)
```
El camino tiene forma de **S invertida** con entrada por el borde izquierdo y salida por el borde inferior.

### Movimiento de enemigos

```js
// En Enemy.update(dt):
this.speed = this.baseSpeed * this._slowAmount;      // 1.0 = velocidad normal
this.progress += this.speed * (dt / 1000);           // progreso en px/s
const pos = pathSystem.getPositionAt(this.progress);
this.x = pos.x;  this.y = pos.y;
```

Cuando `this.progress >= pathSystem.totalLength` → el enemigo llegó: `reached = dead = true`.

---

## 6. Matemática de Escalado (la curva exponencial)

### HP de enemigos

```
HP(wave) = max(1, round(HP_base × HP_SCALE^(wave - 1)))
```

- `HP_SCALE = 1.18` → **+18% de vida por oleada**
- Referencia numérica (tipo `red`, HP_base=10):

| Oleada | HP calc | HP real |
|---|---|---|
| 1 | 10 × 1.18⁰ = 10 | 10 |
| 5 | 10 × 1.18⁴ ≈ 19.4 | 19 |
| 10 | 10 × 1.18⁹ ≈ 44.2 | 44 |
| 15 | 10 × 1.18¹⁴ ≈ 100.7 | 101 |
| 20 | 10 × 1.18¹⁹ ≈ 229.4 | 229 |
| 25 | 10 × 1.18²⁴ ≈ 522.4 | 522 |

> ⚠️ Un `HP_SCALE` entre **1.10–1.25** es el rango razonable. Por encima de 1.30 los enemigos se vuelven imposibles de matar después de la oleada 20 sin upgrades.

### Recompensa de captura

```
reward(wave) = max(reward_base, round(HP(wave) × REWARD_FACTOR))
```

- `REWARD_FACTOR = 0.28` → la recompensa escala con la dificultad del enemigo
- Esto mantiene el balance automáticamente: cuanto más duro el Pokémon, más dinero da.

### Bonus de oleada completada

```
waveBonus(wave) = WAVE_BONUS_BASE + wave × WAVE_BONUS_PER_WAVE
     = 15 + wave × 6
```

| Oleada | Bonus |
|---|---|
| 1 | $21 |
| 5 | $45 |
| 10 | $75 |
| 20 | $135 |

### Slow de Jessie

```
efectiveSpeed = baseSpeed × slowAmount
// donde slowAmount ∈ (0,1). Default = 0.38 → el Pokémon va al 38% de velocidad.
// Upgrades reducen slowAmount: min permitido = 0.05 (5% = casi parado)
```

### Oleadas procedurales (wave > 25)

```js
extra = waveNum - 25
base  = floor(12 + extra * 2.8 + (extra * 0.07)²)
delay = max(180, 580 - extra * 7)   // ms entre spawns
```

El cuadrado `(extra * 0.07)²` añade aceleración cuadrática al conteo de enemigos, haciendo que las oleadas tardías sean exponencialmente más densas.

---

## 7. Tiers de Pokémon (Enemigos)

| Key | Tier | Label | HP base | Speed | Daño | Reward base | Radio |
|---|---|---|---|---|---|---|---|
| `red` | 1 | Común ★ | 10 | 92 | 1 | $3 | 18px |
| `blue` | 2 | Poco Común ★★ | 28 | 65 | 1 | $7 | 20px |
| `green` | 3 | Raro ★★★ | 60 | 112 | 2 | $14 | 20px |
| `t4` | 4 | Épico ★★★★ | 200 | 55 | 3 | $50 | 22px |
| `boss` | 5 | Legendario ★★★★★ | 1500 | 45 | 5 | $400 | 28px |

> `speed` está en px/s. Con path de ~1800px de largo, un T1 tarda ~19s en cruzar; un boss ~40s.

### Sprite loading

```js
// En Enemy constructor:
this._spriteUrl = getSpriteUrl(this.pokemonId);
// → https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{id}.png
ImageCache.load(url).then(img => { this._img = img; });
```

Si el CDN no responde (`img.onerror`), `_img = null` y se dibuja un **círculo de fallback** con el `#id` del Pokémon.

---

## 8. Torres (Team Rocket Trainers)

### Tabla de torres

| Key | Trainer | Tipo | Costo | Damage | Range | FireRate | Especial |
|---|---|---|---|---|---|---|---|
| `dart` | Grunt ♀ | Single target | $100 | 10 | 130px | 1.2/s | — |
| `cannon` | Grunt ♂ | AoE | $175 | 55 | 120px | 0.35/s | área Ø120px |
| `ice` | Jessie | Slow | $120 | 5 | 110px | 0.65/s | slow 38%, 2.2s |
| `sniper` | James | Long-range | $250 | 80 | 320px | 0.45/s | — |
| `laser` | Meowth | Pierce | $300 | 8 | 180px | 4.0/s | penetra ×3 |
| `mortar` | Giovanni | AoE arco | $400 | 140 | 350px | 0.22/s | área Ø180px, sin LOS |

### Targeting

Todas las torres usan **"primero el más avanzado"** (`Find max progress in range`):

```js
_findTarget(enemies) {
    let best = null, bestProg = -1;
    for (const e of enemies) {
        if (e.dead) continue;
        if (dist(this.x, this.y, e.x, e.y) <= this.range && e.progress > bestProg) {
            best = e; bestProg = e.progress;
        }
    }
    return best;
}
```

### Sistema de upgrades (`applyMod`)

```js
// balance.js — mod puede tener: mul, add, min, max
function applyMod(value, mod) {
    if (mod.mul !== undefined) v *= mod.mul;   // multiplicar
    if (mod.add !== undefined) v += mod.add;   // sumar
    if (mod.min !== undefined) v = max(min, v); // clamp inferior
    if (mod.max !== undefined) v = min(max, v); // clamp superior
}
// Ejemplo: slow upgrade { add: -0.12, min: 0.12 }
// → slowAmount = max(0.38 - 0.12, 0.12) = 0.26
```

Cada torre tiene 2 niveles de upgrades. Cada nivel ofrece 2 opciones (A/B), el jugador elige 1.

### Sell value

```js
getSellValue() = floor(totalCost × 0.6)  // 60% de reembolso
```

---

## 9. Proyectiles (Pokéballs)

| Clase | Torre | Pokéball | Comportamiento |
|---|---|---|---|
| `DartProjectile` | Grunt ♀ | Standard (roja/blanca) | Homing, single hit |
| `CannonProjectile` | Grunt ♂ | Heavy Ball (roja oscura/gris) | Arco + AoE splash en impacto |
| `IceProjectile` | Jessie | Dive Ball (azul/celeste) | Homing + aplica slow al impactar |
| `SniperProjectile` | James | Master Ball-ish (púrpura) | Velocidad lineal + trail visual |
| `LaserProjectile` | Meowth | Quick Ball (amarillo/negro) | Velocidad lineal + pierce N enemigos |
| `MortarShell` | Giovanni | Beast Ball (teal/oscuro) | Arco hacia punto fijo + AoE splash |

Todos los proyectiles giran (`this._rot += dt * factor`) mientras vuelan, dando efecto de Pokéball real.

---

## 10. Sistema de Colisiones

Detección por **distancia euclidiana²** (sin raíz cuadrada cuando es posible):

```js
if (dx*dx + dy*dy < (proj.radius + enemy.radius)²) → hit
```

- Proyectiles de pierce (`LaserProjectile`, `CannonProjectile`) guardan `_hitEnemies: Set` para no impactar dos veces al mismo enemigo.
- `onHit(enemy, allEnemies)` recibe todos los enemigos para permitir AoE sin un segundo pass.

---

## 11. Sistema de Partículas

Tres funciones generadoras:

| Función | Uso | Partículas |
|---|---|---|
| `spawnDeathParticles(x,y,color,count)` | Muerte genérica | Círculos con gravedad |
| `spawnCaptureEffect(x,y,pokemonColor)` | Captura normal | Pokéballs rojas + estrellas gold + polvo del color del Pokémon |
| `spawnLegendaryCaptureEffect(x,y)` | Boss capturado | 3 anillos × 16 partículas (gold, blanco, naranja) |

Física de partículas:
```js
update(dt):
    x += vx * (dt/1000)
    y += vy * (dt/1000)
    vy += 120 * (dt/1000)   // gravedad constante
    life -= dt
    // tamaño y opacidad decaen con life/maxLife
```

---

## 12. Pokédex

`ScenePlay` mantiene `this.pokedex = new Map<pokemonId, {name, type, color, count}>`.

Al capturar un enemigo:
```js
if (pokedex.has(pid)) {
    pokedex.get(pid).count++;
} else {
    pokedex.set(pid, { name, type, color, count: 1 });
}
ui.updatePokedex(pokedex);          // actualiza el grid del DOM
ui.showMessage("¡Pokémon capturado!");
```

`UI.updatePokedex()` reconstruye el grid completo con `<img>` tags usando `getSpriteUrl(id)`.

---

## 13. UI — IDs del DOM

Todos los elementos UI importantes tienen IDs explícitos. La clase `UI` los agarra en el constructor:

| ID | Descripción |
|---|---|
| `val-money`, `val-lives`, `val-wave`, `val-enemies` | Displays del HUD |
| `btn-start-wave` | Botón "Lanzar Operación N" |
| `btn-pause`, `btn-reset` | Controles |
| `btn-speed1`, `btn-speed2`, `btn-speed4` | Multiplicadores de velocidad |
| `tower-btn-{dart,cannon,ice,sniper,laser,mortar}` | Botones de selección de torre |
| `tower-info` | Panel de info de torre seleccionada (toggle `visible`) |
| `tower-info-icon`, `tower-info-name`, `tower-info-level` | Header del panel |
| `tower-stats` | Grid de stats (innerHTML reconstruido) |
| `upgrade-btns` | Contenedor de botones de upgrade |
| `btn-sell` | Botón de vender torre |
| `pokedex-grid` | Grid de imágenes del Pokédex |
| `pokedex-count` | Counter "N capturados" |
| `menu-overlay` | Overlay de menú principal / game over |
| `paused-banner` | Banner "PAUSADO" |
| `msg` | Toast de mensajes (class `show` para mostrar) |
| `game-canvas` | Canvas principal |

---

## 14. Persistencia (`storage.js`)

```js
localStorage key: 'towerDefense_v1'
Datos guardados: { bestScore: number, highestWave: number, lastSpeed: 1|2|4 }
```

Se guarda automáticamente al cambiar la velocidad o al terminar la partida.

---

## 15. Cómo Añadir Contenido

### Añadir un nuevo Pokémon a un tier existente

En `src/data/pokemon.js`:
```js
red: [
    { id: 129, name: 'Magikarp' },
    { id: 25, name: 'Pikachu' },  // ← añadir aquí
]
```

### Añadir una nueva oleada

En `src/data/waves.js`:
```js
import { ENEMY_TYPE } from '../utils/constants.js';
const { RED, BLUE, GREEN, T4, BOSS } = ENEMY_TYPE;

// Formato: [{ type, count, delay(ms entre spawns) }, ...]
/* 26 */ [{ type: T4, count: 8, delay: 1200 }, { type: BOSS, count: 1, delay: 6000 }],
```

### Añadir una nueva torre

1. **`balance.js`** → Añadir entrada a `TOWER_CONFIG` con todas las stats + upgrades.
2. **`Tower.js`** → Crear clase que extiende `Tower`, implementar `_shoot()` y `_drawTurret()`.
3. **`Tower.js`** → Añadir `case 'miTorre'` en `createTower()`.
4. **`Projectile.js`** → Crear nuevo proyectil si hace falta, o reutilizar uno existente.
5. **`index.html`** → Añadir `<button class="tower-btn" id="tower-btn-miTorre">` en `#tower-buttons`.
6. **`ScenePlay.js`** → Añadir `'miTorre'` al array `towerKeys` en `_bindUI()`.
7. **`UI.js`** → Añadir `miTorre: document.getElementById('tower-btn-miTorre')` en `this.towerBtns`.

### Modificar la curva de dificultad

Solo editar `src/data/balance.js`:
```js
export const HP_SCALE = 1.18;       // < 1.10 = fácil, > 1.25 = muy difícil
export const REWARD_FACTOR = 0.28;  // ajusta si los jugadores acumulan mucho dinero
export const START_MONEY = 200;     // dinero inicial
export const START_LIVES = 20;      // vidas iniciales
```

### Añadir un nuevo mapa

1. **`maps.js`** → Crear nueva entrada con `{ name, waypoints[], bgColor, pathColor }`.
2. **`ScenePlay.js`** → Cambiar `this.map = MAP1` por la selección dinámica.
3. **`ScenePlay._buildBackground()`** → El fondo se genera proceduralmente, no necesita assets.

---

## 16. Patrones de Código Comunes

### Patrón delta-time (todos los valores son por segundo)

```js
// Velocidad en px/s, nunca en px/frame
this.x += vx * (dt / 1000);
```

### Patrón "limpiar muertos al final del frame"

```js
this.enemies     = this.enemies.filter(e => !e.dead);
this.projectiles = this.projectiles.filter(p => !p.dead);
this.particles   = this.particles.filter(p => !p.dead);
```
> **NUNCA** eliminar entidades dentro de los loops de update — puede causar skip de frames y bugs de colisión.

### Patrón de canvas save/restore

Toda función `draw()` hace `ctx.save()` al inicio y `ctx.restore()` al final para no contaminar el estado global del canvas.

### Key de celda ocupada

```js
// Formato: "col_row" como string
this.occupiedCells.add(`${col}_${row}`);
this.occupiedCells.has(`${col}_${row}`);
```

---

## 17. FAQ para Agentes IA

**¿Dónde están los CSS?** — Todo el CSS está en `<style>` dentro de `index.html` (líneas ~12-653). No hay archivos `.css` separados.

**¿Por qué no hay build step?** — Diseño intencional para máxima simplicidad. ES modules nativos en Chrome/Firefox/Safari. No compatibil con IE.

**¿Cómo funciona el speed ×4?** — `dt = (timestamp - lastTime) * this.speed`. El multiplicador escala el tiempo simulado, no el rAF.

**¿El Pokédex se persiste entre partidas?** — No. `this.pokedex` vive en `ScenePlay` y se reinicia con `reset()`. Solo `bestScore` y `lastSpeed` persisten en localStorage.

**¿Cómo se evita que las torres disparen sobre el camino?** — `PathSystem._computeBlockedCells()` genera un `Set` de strings `"col_row"` que `ScenePlay._isCellOpen()` consulta antes de colocar una torre.

**¿La IA de targeting evalúa línea de visión?** — No. Es range puro. Giovanni (mortar) puede disparar "sobre obstáculos" por diseño.

**¿Qué pasa si PokeAPI CDN está caído?** — `ImageCache` resuelve la Promise con `null` en `onerror`. `Enemy.draw()` detecta `this._img === null` y dibuja el círculo de fallback.
