# Entrenador Pokémon: Atrápalos a todos — README-IA

> **Fecha de refactor:** 2026-03-06  
> **Engine:** Vanilla JS ES Modules + Canvas 2D (sin bundler, sin npm)  
> **Servidor:** `python3 -m http.server 8181 --directory .`

---

## Concepto del juego

Eres un Entrenador Pokémon en la región de Kanto. Pokémon silvestres recorren la ruta. Tu objetivo es **debilitarlos** con tus Pokémon aliados colocados como torres, y luego **capturarlos** con Pokébolas arrastradas. El objetivo final es completar la **Pokédex de la Gen 1** (151 Pokémon).

No hay vidas, no hay dinero. Solo XP, Pokébolas y la Pokédex.

---

## Sistemas principales

### TrainerSystem (`src/systems/TrainerSystem.js`)
- `level` — nivel del entrenador  
- `xp / xpToNext` — experiencia acumulada y umbral de subida  
- `pokeballs` — conteo de Pokébolas disponibles (se usan en captura)  
- `rareCandy` — recurso funcional (drop en rondas + uso para evolucionar)  
- `pokedex` — `Map<id, {name, count}>` de Pokémon capturados  
- `backpack` — array de slots `{id, pokemonId, name, pokemonType, placed}` — Pokémon disponibles para colocar como torres  

### WaveSystem (`src/systems/WaveSystem.js`)
- **Completamente procedural** — sin tabla de oleadas fija.
- Ronda 1 → 1 Pokémon; Ronda 2 → 2; escala suavemente hasta ~15 máx.  
- Desbloqueo de tiers por ronda: Tier1 desde R1, Tier2 desde R3, Tier3 desde R6, Tier4 desde R10.  
- **Bonus perfecto:** si ningún Pokémon escapa al final de la ronda → `+1 Pokébola`.  
- Rastrea `_escapedThisRound` — incrementado por `ScenePlay` cuando un enemigo llega al final.

### Sistema de captura (`ScenePlay.throwPokeball`)
1. El jugador hace **mousedown sobre el canvas** cuando hay Pokémon debilitados.
2. Arrastra la Pokébola (se dibuja como cursor en canvas).
3. Al soltar **mouseup** → se busca el Pokémon debilitado más cercano (radio 45px).
4. Si hay objetivo: `pokeballs--`, `enemy.capture()`, se registra en Pokédex, se añade a la mochila, se otorga XP.
5. Si no hay objetivo: la Pokébola se consume con mensaje de fallo.

### Mochila vs Pokédex
| Concepto | Descripción |
|----------|-------------|
| **Pokédex** | Registro histórico de capturados (1 entrada por especie) — 0/151 |
| **Mochila** | Pokémon activos disponibles como torres — 1 por slot |

Un Pokémon capturado se añade **a la mochila** con un slot propio, y puede colocarse en el mapa como torre.

### Torres = Pokémon (`src/entities/PokemonTower.js`)
- Solo pueden colocarse/recogerse cuando la ronda **NO está en curso**.
- Click derecho o botón "Recuperar" en panel → devuelve el Pokémon a la mochila.
- Cada torre tiene `pokemonType` (fuego / agua / planta / ...) para efect. de tipos.
- Cada torre tiene `specialKey` + `specialCooldownMs` desde `src/data/pokemon_tower_config.js`.

### Sprites locales (offline runtime)
- Carpeta de sprites: `src/data/sprites/gen1/{id}.png`.
- Índice generado: `src/data/sprites/gen1/index.json`.
- El runtime usa solo `getSpriteUrl(id) => src/data/sprites/gen1/${id}.png`.
- Script de build: `python3 tools/build_sprites_gen1.py`
  - Descarga sprites Gen1 (151)
  - Re-encode opcional con Pillow a 80×80 PNG optimizado
  - Escribe `index.json`

### Habilidades especiales compartidas (20)
- Catálogo en `src/data/abilities.js` con 20 keys reutilizables:
  `AOE_BLAST, BURN_DOT, POISON_DOT, FREEZE_STUN, PSY_STUN, KNOCKBACK, CHAIN_LIGHTNING, SLOW_FIELD, ARMOR_SHRED, HEAL_TOWER, MULTI_SHOT, PIERCE_SHOT, SNIPE_MARK, CONFUSE_WANDER, ROOT_STOP, WAVE_PUSH, METEOR_RAIN, SHIELD_SELF, SPEED_BUFF, CAPTURE_NET`.
- UI: 6 slots de especiales (panel de controles), con icono, emoji de habilidad y overlay de cooldown.
- Al click: si está listo, ejecuta la habilidad del Pokémon torre correspondiente.

### Rare Candy
- Item flotante por ronda perfecta y cada 5 rondas (zonas).
- Click sobre item para recoger `+1`.
- Botón “Rare Candy” en panel de torre para evolucionar en `ScenePlay`.
- También disponible en `ScenePC` (party y box), con botón 🍬 por Pokémon si puede evolucionar.

### Efectividad de tipos (`src/data/balance.js → TYPE_CHART`)
| Atacante | Defensor | Multiplicador |
|----------|---------|--------------|
| Fuego    | Planta  | ×1.5 |
| Planta   | Agua    | ×1.5 |
| Agua     | Fuego   | ×1.5 |
| Agua     | Planta  | ×0.65 |
| Fuego    | Agua    | ×0.65 |
| Planta   | Fuego   | ×0.65 |
| Cualquier | Cualquier (neutro) | ×1.0 |

El multiplicador se aplica en `Collision.check()` antes de llamar a `takeDamage()`.

---

## Estado WEAKENED (debilitado)

Cuando el HP de un enemigo llega a 0, **NO muere** — entra en estado `weakened`:
- Velocidad reducida al 30%
- Aura amarilla pulsante + texto **"ATRÁPALO!"**
- Las torres ya no lo atacan
- Si llega al final del camino en estado debilitado → **escapa** (se conta como escape)
- Solo el jugador puede capturarlo con una Pokébola

---

## Economía del juego

| Recurso | Fuente | Uso |
|---------|--------|-----|
| Pokébolas | Inicio: 3; +1 por ronda perfecta; posible drop futuro | Captura Pokémon debilitados |
| XP | +10/20/40/80 por captura (según tier) | Subir nivel del entrenador |
| RareCandy | +1 cada 3 niveles, ronda perfecta, cada 5 rondas, item clicable | Evolucionar Pokémon con cadena disponible |

No hay dinero ni vidas. No hay penalización por escapes.

---

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/data/balance.js` | Eliminado dinero/vidas; añadido TYPE_CHART, STARTER_TOWER_CONFIG, XP_PER_TIER |
| `src/data/maps.js` | Camino extendido de 9 a 16 waypoints |
| `src/data/pokemon.js` | Solo Gen 1 (≤151); añadido POKEMON_TYPE map |
| `src/data/waves.js` | Sin cambios (ya no se importa) |
| `src/systems/TrainerSystem.js` | ✨ NUEVO — level/xp/pokéballs/backpack/pokédex |
| `src/systems/WaveSystem.js` | Reescrito — procedural, sin WAVES fijas, escape tracking |
| `src/systems/Collision.js` | Añadida efect. de tipos + findWeakened() |
| `src/entities/Enemy.js` | WEAKENED state, sprites más grandes, sin nombre flotante |
| `src/entities/PokemonTower.js` | ✨ NUEVO — torres son Pokémon |
| `src/entities/Projectile.js` | Añadido attackerType + _typeEffMult |
| `src/game/ScenePlay.js` | Reescrito — nueva economía, captura, rounds |
| `src/game/Game.js` | Reescrito — TrainerSystem, starter selection, pokéball drag |
| `src/ui/UI.js` | Reescrito — HUD nuevo, backpack dinámico |
| `index.html` | Reescrito — tema verde, HUD nuevo, starter selection, canvas responsive |

---

## Instrucciones de prueba (3 pasos)

### 1. Iniciar + Starter + Colocar torre
```
http://localhost:8181
```
- Elige un starter → "INICIAR AVENTURA"
- Haz clic en el starter en la **Mochila** (barra izquierda) para seleccionarlo
- Haz clic en el mapa (zona verde, fuera del camino) para colocarlo
- Verifica HUD: Level=1, XP=0/120, Pokébolas=3, RareCandy=0

### 2. Ronda, debilitar, capturar
- Haz clic en "LANZAR RONDA 1"
- La torre ataca a los Pokémon salvajes
- Cuando el HP llega a 0 → aura amarilla + "ATRÁPALO!"
- **Haz mousedown en el canvas** (o en el icono 🔴 del HUD) y **arrastra sobre el Pokémon debilitado**
- Al soltar → captura: Pokébolas-1, aparece en Pokédex y Mochila

### 3. Escapar + Bonus perfecto
- Si un Pokémon debilitado llega al final → Escapa sin penalización de vidas
- Si al terminar la ronda **capturaste todos** → mensaje "+1 Pokébola" automático
- Comprueba que el contador de Pokébolas aumenta

---

## Arquitectura

```
src/
├── data/
│   ├── balance.js      — stats, type chart, starter configs
│   ├── maps.js         — waypoints del camino (Gen 1 / Kanto)
│   ├── pokemon.js      — pools Gen 1, POKEMON_TYPE map
│   └── waves.js        — obsoleto (no se importa)
├── entities/
│   ├── Enemy.js        — Pokémon enemigos, WEAKENED state
│   ├── Particle.js     — efectos visuales captura
│   ├── PokemonTower.js — torres = Pokémon del entrenador
│   └── Projectile.js   — pokébolas con attackerType
├── game/
│   ├── Game.js         — init, loop, starter selection, drag
│   └── ScenePlay.js    — main scene, captura, rondas
├── systems/
│   ├── Collision.js    — hit detection + type multiplier
│   ├── PathSystem.js   — sin cambios
│   ├── TrainerSystem.js— ✨ NUEVO — todo el estado del entrenador
│   └── WaveSystem.js   — rondas procedurales
├── ui/
│   └── UI.js           — HUD, backpack dinámico, pokédex
└── utils/              — sin cambios
```
