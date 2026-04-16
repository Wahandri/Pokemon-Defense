// ─── Play Scene ────────────────────────────────────────────────────────────────
// Main gameplay scene: Pokémon towers (backpack), wild enemy Pokémon,
// pokéball drag-capture, type effectiveness, procedural rounds.

import { CANVAS_W, CANVAS_H, CELL, COLS, ROWS } from '../utils/constants.js';
import { pixelToGrid, gridToPixel } from '../utils/math.js';
import { PathSystem } from '../systems/PathSystem.js';
import { WaveSystem } from '../systems/WaveSystem.js';
import { Collision } from '../systems/Collision.js';
import { createEnemy } from '../entities/Enemy.js';
import { createPokemonTower } from '../entities/PokemonTower.js';
import { spawnDeathParticles, spawnCaptureEffect, Particle, FloatingText } from '../entities/Particle.js';
import { MysteryGiftItem } from '../entities/MysteryGiftItem.js';
import { MAP1 } from '../data/maps.js';
import { XP_WEAKEN_TIER_MULT, EVOLUTION_CHAIN, STARTER_TOWER_CONFIG, coinsForWave } from '../data/balance.js';
import { ABILITIES } from '../data/abilities.js';
import { getSpriteUrl } from '../data/pokemon.js';
import { ImageCache } from '../utils/ImageCache.js';

export class ScenePlay {
    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {UI}            ui
     * @param {TrainerSystem} trainerSystem
     * @param {Function}      onGameOver   callback()
     * @param {object}        [zoneConfig]  - if set, uses zone encounters + roundRules
     * @param {Function}      [onExit]      - called when player exits zone
     */
    constructor(ctx, ui, trainerSystem, onGameOver, zoneConfig = null, onExit = null) {
        this.ctx = ctx;
        this.ui = ui;
        this.onGameOver = onGameOver;
        this.trainer = trainerSystem;
        this.zoneConfig = zoneConfig; // KantoZone | null
        this.onExit = onExit;

        this.debug = false;

        // ── Map / Path ────────────────────────────────────────────────────────
        this.map = MAP1;
        this.pathSystem = new PathSystem(zoneConfig?.waypoints ?? MAP1.waypoints);

        // ── Grid ──────────────────────────────────────────────────────────────
        this.occupiedCells = new Set();  // 'col_row' strings

        // ── Entities ──────────────────────────────────────────────────────────
        this.towers = [];
        this.enemies = [];
        this.projectiles = [];
        this.particles = [];
        this.mysteryGiftItems = [];   // floating collectible MysteryGiftItems

        // ── Wave system ───────────────────────────────────────────────────────
        this._roundSpawned = 0;
        this._roundWeakened = 0;
        this._roundCaptured = 0;
        this._roundEscaped = 0;
        this._roundXpGained = 0;
        this._roundPokeballsGained = 0;
        this.waveSystem = new WaveSystem(
            (type, waveNum, forcePokemon, wildLevel) => this._spawnEnemy(type, waveNum, forcePokemon, wildLevel),
            (waveNum, escaped) => this._onWaveClear(waveNum, escaped)
        );

        // ── Input state ───────────────────────────────────────────────────────
        this.selectedSlotId = null;   // backpack slot selected for placement
        this.selectedTower = null;    // placed PokemonTower (click to select)
        this.ghostCol = -1;
        this.ghostRow = -1;
        this.ghostValid = false;

        // Pokéball drag state (managed by Game.js, queried here)
        this._pokeballDragging = false;
        this._pokeballDragX = 0;
        this._pokeballDragY = 0;

        // ── Pre-render ────────────────────────────────────────────────────────
        if (zoneConfig?.bgColor) {
            this._zoneBgColor = zoneConfig.bgColor;
        }
        this._buildBackground();

        // ── UI Bindings ───────────────────────────────────────────────────────
        this._bindUI();

        // Initial HUD
        this._updateHUD();
    }

    // ─── Background Pre-render ────────────────────────────────────────────────

    // ─── Zone type detection helpers ─────────────────────────────────────────

    _getZoneTheme() {
        const bg = this._zoneBgColor ?? '#1c3320';
        const id = this.zoneConfig?.id ?? '';
        if (id.includes('cave') || id === 'mt_moon' || id === 'rock_tunnel') return 'cave';
        if (id.includes('gym'))       return 'gym';
        if (id === 'seafoam')         return 'ice';
        if (id === 'victory_road')    return 'dark';
        if (id === 'viridian_forest') return 'forest';
        // Use bgColor hue to guess
        if (bg.startsWith('#0c0c') || bg.startsWith('#0a0c')) return 'cave';
        if (bg.startsWith('#0a1a') && bg.endsWith('2e'))      return 'water';
        return 'grass';
    }

    _buildBackground() {
        this._bgCanvas = document.createElement('canvas');
        this._bgCanvas.width  = CANVAS_W;
        this._bgCanvas.height = CANVAS_H;
        const bCtx = this._bgCanvas.getContext('2d');

        const theme = this._getZoneTheme();

        // ── Tile palette by zone theme ──
        const THEMES = {
            grass:  { base: '#78b040', dark: '#588030', light: '#98d060', border: '#487028' },
            forest: { base: '#3a7828', dark: '#286018', light: '#50a038', border: '#1e4818' },
            cave:   { base: '#302820', dark: '#201808', light: '#483828', border: '#180e04' },
            dark:   { base: '#281820', dark: '#180c10', light: '#382030', border: '#100808' },
            gym:    { base: '#404860', dark: '#282e40', light: '#5860a0', border: '#1e2030' },
            water:  { base: '#3858a8', dark: '#204880', light: '#5878c8', border: '#182e60' },
            ice:    { base: '#a8c8e8', dark: '#88a8c8', light: '#c8e0f8', border: '#6890b0' },
        };
        const pal = THEMES[theme] ?? THEMES.grass;

        // ── 1. Tiled base (2-colour checkerboard like GBA) ──
        const T = 16; // tile size in pixels
        for (let ty = 0; ty < CANVAS_H; ty += T) {
            for (let tx = 0; tx < CANVAS_W; tx += T) {
                const even = ((tx / T) + (ty / T)) % 2 === 0;
                bCtx.fillStyle = even ? pal.base : pal.dark;
                bCtx.fillRect(tx, ty, T, T);
            }
        }

        // ── 2. Sub-tile detail pixels (grass blades / rock lines) ──
        if (theme === 'grass' || theme === 'forest') {
            bCtx.fillStyle = pal.light;
            for (let i = 0; i < 300; i++) {
                const seed = i * 1847 + 31;
                const sx = (seed % CANVAS_W);
                const sy = ((seed * 13) % CANVAS_H);
                bCtx.fillRect(sx, sy, 2, 4);
                bCtx.fillRect(sx + 1, sy - 1, 1, 2);
            }
        } else if (theme === 'cave' || theme === 'dark') {
            // Rock crack lines
            bCtx.strokeStyle = pal.border;
            bCtx.lineWidth = 1;
            for (let i = 0; i < 18; i++) {
                const seed = i * 2137 + 77;
                const sx = (seed % (CANVAS_W - 60)) + 20;
                const sy = ((seed * 11) % (CANVAS_H - 60)) + 20;
                bCtx.beginPath();
                bCtx.moveTo(sx, sy);
                bCtx.lineTo(sx + (seed % 30) - 15, sy + (seed % 20) + 5);
                bCtx.stroke();
            }
        } else if (theme === 'gym') {
            // Floor tile grid lines
            bCtx.strokeStyle = 'rgba(255,255,255,0.06)';
            bCtx.lineWidth = 1;
            for (let gx = 0; gx < CANVAS_W; gx += 32) {
                bCtx.beginPath(); bCtx.moveTo(gx, 0); bCtx.lineTo(gx, CANVAS_H); bCtx.stroke();
            }
            for (let gy = 0; gy < CANVAS_H; gy += 32) {
                bCtx.beginPath(); bCtx.moveTo(0, gy); bCtx.lineTo(CANVAS_W, gy); bCtx.stroke();
            }
        } else if (theme === 'ice') {
            // Ice shimmer
            bCtx.fillStyle = 'rgba(255,255,255,0.25)';
            for (let i = 0; i < 60; i++) {
                const seed = i * 1031 + 7;
                const ix = (seed % (CANVAS_W - 12)) + 6;
                const iy = ((seed * 17) % (CANVAS_H - 12)) + 6;
                bCtx.fillRect(ix, iy, 4, 1);
                bCtx.fillRect(ix + 1, iy - 1, 2, 1);
            }
        }

        // ── 3. GBA-style trees (round blob trees) ──
        if (theme === 'grass' || theme === 'forest') {
            const treePositions = [
                [1,1],[2,1],[27,1],[28,1], [1,13],[2,13],[27,13],[28,13],
                [13,1],[14,1],[15,1],       [13,13],[14,13],[15,13],
                [7,6],[8,6],[21,7],[22,7],
                [5,12],[24,4],[18,11],[9,2],
                [3,4],[25,10],[11,4],[20,2],
            ];
            const treeColA = theme === 'forest' ? '#1e4a12' : '#2a5a1a';
            const treeColB = theme === 'forest' ? '#2a6418' : '#3a7028';
            const treeColC = theme === 'forest' ? '#3a7a22' : '#488030';

            for (const [tc, tr] of treePositions) {
                if (this.pathSystem.isCellBlocked(tc, tr)) continue;
                const tx = tc * CELL + CELL / 2;
                const ty = tr * CELL + CELL / 2;
                const sz = 14 + ((tc * 3 + tr * 7) % 6);

                // Shadow
                bCtx.fillStyle = 'rgba(0,0,0,0.3)';
                bCtx.beginPath();
                bCtx.ellipse(tx + 3, ty + sz - 2, sz * 0.7, sz * 0.22, 0, 0, Math.PI * 2);
                bCtx.fill();

                // Tree crown — 3 overlapping circles for GBA look
                for (const [ox, oy, r, col] of [
                    [-4, 2, sz * 0.7, treeColA],
                    [4,  2, sz * 0.7, treeColA],
                    [0, -2, sz * 0.85, treeColB],
                    [-2,-4, sz * 0.55, treeColC],
                ]) {
                    bCtx.fillStyle = col;
                    bCtx.beginPath();
                    bCtx.arc(tx + ox, ty + oy, r, 0, Math.PI * 2);
                    bCtx.fill();
                }
                // Highlight dot
                bCtx.fillStyle = 'rgba(255,255,255,0.15)';
                bCtx.beginPath();
                bCtx.arc(tx - sz * 0.25, ty - sz * 0.3, sz * 0.22, 0, Math.PI * 2);
                bCtx.fill();
            }
        }

        // ── 4. Draw path (road) on top of terrain ──
        this.pathSystem.draw(bCtx, false);
    }

    // ─── UI Event Bindings ────────────────────────────────────────────────────

    _bindUI() {
        const { ui } = this;
        ui.btnStartWave?.addEventListener('click', () => this._startWave());

        ui.bindBackpackSelect((slotId) => this._selectBackpackSlot(slotId));

        ui.bindPickupHandler(() => {
            if (this.selectedTower) this._pickupTower(this.selectedTower);
        });

        // Evolucionar button
        ui.bindEvolveHandler(() => {
            if (!this.selectedTower) return;
            const result = this.trainer.evolveSlot(this.selectedTower.slotId);
            if (result.ok) {
                this._applyEvolution(this.selectedTower, result);
            } else if (result.reason === 'needMoreXP') {
                this.ui.showMessage('❌ XP insuficiente para evolucionar', 1800);
            }
        });

        ui.bindSpecialHandler((slotIdx) => this._useSpecialFromSlot(slotIdx));

        ui.bindAttackHandler?.((slotId, attackIdx) => {
            const tower = this.towers.find(t => t.slotId === slotId);
            const slot = this.trainer.getSlot(slotId);
            if (!tower || !slot) return;
            slot.currentAttackIdx = attackIdx;
            tower.setAttackIdx(attackIdx, slot.pokemonType, slot.level ?? 1);
            this.ui.showTowerInfoPokemon(tower, slot, this.trainer);
        });
    }

    _useSpecialFromSlot(slotIdx) {
        const tower = this.towers[slotIdx];
        if (!tower || !tower.specialKey) return;
        if (!tower.isSpecialReady()) {
            this.ui.showMessage('⏳ Habilidad en cooldown', 800);
            return;
        }
        const ability = ABILITIES[tower.specialKey];
        if (!ability?.execute) return;
        ability.execute({
            tower,
            enemies: this.enemies,
            allTowers: this.towers,
            addParticle: (x, y, color = '#fff', n = 6) => {
                for (let i = 0; i < n; i++) {
                    const a = Math.random() * Math.PI * 2;
                    const s = 50 + Math.random() * 120;
                    this.particles.push(new Particle(x, y, Math.cos(a) * s, Math.sin(a) * s, color, 500 + Math.random() * 350, 2));
                }
            },
        });
        tower.triggerSpecial();
    }

    // ─── Wave Control ─────────────────────────────────────────────────────────

    _startWave() {
        if (this.waveSystem.isRunning) return;
        // Reset per-round trackers
        this._roundSpawned = 0;
        this._roundWeakened = 0;
        this._roundCaptured = 0;
        this._roundEscaped = 0;
        this._roundXpGained = 0;
        this._roundPokeballsGained = 0;
        this.waveSystem.startNextWave();
        this.ui.showMessage(`🌊 ¡Ronda ${this.waveSystem.waveNumber} comenzando!`);
        // Cancel pending placement + deselect tower (can't touch during wave)
        this.selectedSlotId = null;
        this._deselectTower();
        // Rebuild backpack UI so all buttons get disabled
        this.ui.rebuildBackpackUI(this.trainer.backpack, null, true);
        this._updateHUD();
    }

    _spawnEnemy(type, waveNum = 1, forcePokemon = null, wildLevel = null) {
        // Zone mode: pick encounter from zone's encounter pool
        if (this.zoneConfig?.encounters?.length) {
            const pool = this.zoneConfig.encounters;
            const enc = pool[Math.floor(Math.random() * pool.length)];
            type = enc.tier;  // use encounter's tier for HP scaling
            forcePokemon = { id: enc.speciesId, name: enc.name };
        }
        const enemy = createEnemy(type, this.pathSystem, waveNum, forcePokemon, wildLevel ?? undefined);
        if (this.zoneConfig?.encounters?.length) {
            // Re-assign pokemonType from encounter data so type effectiveness works
            const pool = this.zoneConfig.encounters;
            const enc = pool.find(e => e.speciesId === (forcePokemon?.id)) ?? pool[0];
            enemy.pokemonType = enc.pokemonType;
        }
        const pos = this.pathSystem.getPositionAt(0);
        enemy.x = pos.x; enemy.y = pos.y;
        this.enemies.push(enemy);
        this._roundSpawned++;
        this._updateHUD();
    }

    _onWaveClear(waveNum, _escaped) {
        const captureRate = this._roundSpawned > 0 ? this._roundCaptured / this._roundSpawned : 0;
        const goodRound = captureRate >= 0.5;

        // Apply doubleXP flag reset after wave
        this.trainer.doubleXPNextWave = false;

        // Coin reward
        const coins = coinsForWave(waveNum, goodRound);
        this.trainer.addCoins(coins);
        this._roundCoinsGained = coins;

        if (goodRound) {
            this.trainer.addPokeball(1);
            this._roundPokeballsGained++;
            this.ui.showMessage(`🎉 ¡Buena ronda! +1 Pokébola · +${coins} 💰`, 3000);
        } else {
            this.ui.showMessage(`✅ Ronda ${waveNum} completada · +${coins} 💰`, 2200);
        }

        // Mystery gift every 3 waves
        if (waveNum > 0 && waveNum % 3 === 0) {
            this.mysteryGiftItems.push(new MysteryGiftItem());
            this.ui.showMessage('🎁 ¡Regalo misterioso en el mapa!', 2500);
        }

        this.ui.showRoundClear({
            captured: this._roundCaptured,
            escaped: this._roundEscaped,
            xpGained: this._roundXpGained,
            pokeballsGained: this._roundPokeballsGained,
            coinsGained: this._roundCoinsGained ?? 0,
        });

        if (waveNum >= 10) {
            this.trainer.returnAllToBackpack();
            this.ui.rebuildBackpackUI(this.trainer.backpack, null, false);
            this.ui.showMessage('🏁 ¡Zona completada! Volviendo al mapa…', 2600);
            this._updateHUD();
            setTimeout(() => this.onExit?.(), 2000);
            return;
        }

        this._updateHUD();
        this.ui.rebuildBackpackUI(this.trainer.backpack, null, false);
    }

    // ─── Backpack / Tower Placement ───────────────────────────────────────────

    _selectBackpackSlot(slotId) {
        if (this.waveSystem.isRunning) {
            this.ui.showMessage('⚠️ No puedes mover torres durante la ronda');
            return;
        }
        if (this.selectedSlotId === slotId) {
            this.selectedSlotId = null;
        } else {
            this.selectedSlotId = slotId;
            this._deselectTower();
        }
        this.ui.rebuildBackpackUI(this.trainer.backpack, this.selectedSlotId, false);
    }

    _placeTower(col, row) {
        if (this.waveSystem.isRunning) return;
        const slotId = this.selectedSlotId;
        if (!slotId) return;
        if (!this._isCellOpen(col, row)) {
            this.ui.showMessage('🚫 No puedes colocar aquí');
            return;
        }
        const slot = this.trainer.backpack.find(s => s.id === slotId);
        if (!slot || slot.placed) return;

        const tower = createPokemonTower(slot, col, row, CELL);
        this.towers.push(tower);
        this.occupiedCells.add(`${col}_${row}`);
        this.trainer.markPlaced(slotId);

        this.selectedSlotId = null;
        this.ui.rebuildBackpackUI(this.trainer.backpack, null, this.waveSystem.isRunning);
        this.ui.showMessage(`✅ ${slot.name} desplegado`);
        this._updateHUD();
    }

    _pickupTower(tower) {
        if (this.waveSystem.isRunning) {
            this.ui.showMessage('⚠️ No puedes mover torres durante la ronda');
            return;
        }
        this.towers = this.towers.filter(t => t !== tower);
        this.occupiedCells.delete(`${tower.col}_${tower.row}`);
        this.trainer.markReturned(tower.slotId);
        this._deselectTower();
        this.ui.showMessage(`📦 ${tower.pokemonName} regresó a la mochila`);
        this.ui.rebuildBackpackUI(this.trainer.backpack, null, false);
        this._updateHUD();
    }

    _isCellOpen(col, row) {
        if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
        if (this.pathSystem.isCellBlocked(col, row)) return false;
        if (this.occupiedCells.has(`${col}_${row}`)) return false;
        return true;
    }

    // ─── Tower Selection ──────────────────────────────────────────────────────

    _selectTower(tower) {
        if (this.selectedTower) this.selectedTower.selected = false;
        this.selectedTower = tower;
        if (tower) {
            tower.selected = true;
            const slot = this.trainer.getSlot(tower.slotId);
            this.ui.showTowerInfoPokemon(tower, slot, this.trainer);
        } else {
            this.ui.hideTowerInfo();
        }
    }

    _deselectTower() {
        if (this.selectedTower) this.selectedTower.selected = false;
        this.selectedTower = null;
        this.ui.hideTowerInfo();
    }

    // ─── Pokéball Throw ───────────────────────────────────────────────────────

    /** Called by Game.js when player releases drag over canvas */
    throwPokeball(x, y) {
        if (!this.waveSystem.isRunning && this.enemies.filter(e => !e.dead).length === 0) {
            this.ui.showMessage('❌ No hay Pokémon en pantalla');
            return;
        }

        // Find weakened enemy near click
        const target = Collision.findWeakened(this.enemies, x, y, 45);
        if (!target) {
            if (this.trainer.usePokebal()) {
                this.ui.showMessage('💨 ¡La Pokébola falló!', 1500);
            } else {
                this.ui.showMessage('❌ No tienes Pokébolas');
            }
            this._updateHUD();
            return;
        }

        const captured = this._tryCaptureEnemy(target);
        if (!captured) this.ui.showMessage('❌ No tienes Pokébolas');
        this._updateHUD();
    }

    _tryCaptureEnemy(enemy) {
        if (!this.trainer.usePokebal()) return false;
        this._captureEnemy(enemy);
        return true;
    }

    _captureEnemy(enemy) {
        enemy.capture();
        this.particles.push(...spawnCaptureEffect(enemy.x, enemy.y, enemy.color));

        // Pokédex + backpack
        this.trainer.registerPokedex(enemy.pokemonId, enemy.pokemonName);
        const captureResult = this.trainer.addCaptured(enemy, this.zoneConfig?.id ?? null);

        this._roundCaptured++;

        if (captureResult.sentToPC) this.ui.showMessage('📦 Equipo lleno — enviado al PC', 1800);
        this.ui.showMessage(`✅ ¡${enemy.pokemonName} capturado!`, 1800);
        this.ui.updatePokedex(this.trainer.pokedex);
        this.ui.rebuildBackpackUI(this.trainer.backpack, this.selectedSlotId, this.waveSystem.isRunning);
        this._updateHUD();
    }

    /** Update a living placed tower after evolution (sprite, stats, name) */
    _applyEvolution(tower, { newName, newId }) {
        // Look up bonus multipliers from the chain of the PREVIOUS pokemonId
        const evo = EVOLUTION_CHAIN[tower.pokemonId];

        tower.pokemonName = newName;
        tower.pokemonId = newId;

        // Apply stat boosts using the evo's bonus multipliers
        if (evo) {
            tower.damage *= evo.damageBonus ?? 1;
            tower.range *= evo.rangeBonus ?? 1;
            tower.fireRate *= evo.fireRateBonus ?? 1;
            tower._fireInterval = 1000 / tower.fireRate;
        }

        // Reload sprite
        const img = new Image();
        img.src = getSpriteUrl(newId);
        img.onload = () => { tower._img = img; };

        this.ui.showMessage(`🌟 ¡${newName} ha evolucionado! Dmg×${(evo?.damageBonus ?? 1).toFixed(1)}`, 3500);

        // Golden particle burst
        for (let i = 0; i < 22; i++) {
            const a = Math.random() * Math.PI * 2, s = 60 + Math.random() * 80;
            const colors = ['#ffd700', '#f0c040', '#ffffff', '#ffe680'];
            this.particles.push(new Particle(
                tower.x, tower.y,
                Math.cos(a) * s, Math.sin(a) * s - 40,
                colors[Math.floor(Math.random() * colors.length)],
                700 + Math.random() * 400, 3
            ));
        }

        // Refresh UI
        const slot = this.trainer.getSlot(tower.slotId);
        this.ui.showTowerInfoPokemon(tower, slot, this.trainer);
        this.ui.rebuildBackpackUI(this.trainer.backpack, this.selectedSlotId, this.waveSystem.isRunning);
        this.ui.updatePokedex(this.trainer.pokedex);
        this._updateHUD();
    }

    // ─── Mouse Handling ───────────────────────────────────────────────────────

    onMouseMove(x, y) {
        if (this.selectedSlotId) {
            const { col, row } = pixelToGrid(x, y, CELL);
            this.ghostCol = col;
            this.ghostRow = row;
            this.ghostValid = this._isCellOpen(col, row);
        } else {
            this.ghostCol = -1;
            this.ghostRow = -1;
        }
    }

    onClick(x, y) {
        // Check mystery gift collectibles first
        for (const item of this.mysteryGiftItems) {
            if (!item.dead && item.contains(x, y)) {
                item.collect();
                const giftItem = item.item;
                this._applyMysteryItem(giftItem);
                return;
            }
        }

        if (this.waveSystem.isRunning) {
            const weakenedTarget = Collision.findWeakened(this.enemies, x, y, 28);
            if (weakenedTarget) {
                const captured = this._tryCaptureEnemy(weakenedTarget);
                if (!captured) this.ui.showMessage('❌ No tienes Pokébolas');
                this._updateHUD();
                return;
            }
        }

        const { col, row } = pixelToGrid(x, y, CELL);

        if (this.selectedSlotId) {
            this._placeTower(col, row);
            return;
        }

        const clicked = this.towers.find(t => t.col === col && t.row === row);
        if (clicked) {
            if (this.selectedTower === clicked) {
                this._deselectTower();
            } else {
                this._selectTower(clicked);
            }
            return;
        }

        this._deselectTower();
    }

    onRightClick(x, y) {
        if (this.selectedSlotId) {
            this.selectedSlotId = null;
            this.ui.rebuildBackpackUI(this.trainer.backpack, null, this.waveSystem.isRunning);
            return;
        }
        // Right click on tower → pick it up
        const { col, row } = pixelToGrid(x, y, CELL);
        const tower = this.towers.find(t => t.col === col && t.row === row);
        if (tower) this._pickupTower(tower);
    }

    onKeyDown(key) {
        switch (key) {
            case 'Escape':
                this.selectedSlotId = null;
                this.ui.rebuildBackpackUI(this.trainer.backpack, null, this.waveSystem.isRunning);
                this._deselectTower();
                break;
            case 'd':
            case 'D':
                this.debug = !this.debug;
                this.ui.showMessage(this.debug ? '🐛 Debug ON' : '🐛 Debug OFF', 1200);
                break;
        }
    }

    // ─── Mystery Gift ─────────────────────────────────────────────────────────

    _applyMysteryItem(giftItem) {
        const { itemType, emoji, effect, description, qty = 1 } = giftItem;
        switch (effect) {
            case 'pokeball':
                this.trainer.addPokeball(qty);
                this.ui.showMessage(`${emoji} ¡${itemType}! +${qty} Pokébola`, 2500);
                break;
            case 'inventory':
                this.trainer.addToInventory(itemType, 1);
                this.ui.showMessage(`${emoji} ¡${itemType}! Añadido a la mochila`, 2500);
                break;
            case 'doubleXP':
                this.trainer.doubleXPNextWave = true;
                this.ui.showMessage(`${emoji} ¡${description}`, 2500);
                break;
            case 'ppMax':
                this.trainer.addToInventory(itemType, 1);
                this.ui.showMessage(`${emoji} ¡PP Máx! Úsalo desde la mochila`, 2500);
                break;
            case 'sellable':
            case 'cosmetic':
            default:
                this.trainer.addToInventory(itemType, 1);
                this.ui.showMessage(`${emoji} ¡${itemType}! ${description}`, 2500);
                break;
        }
        this._updateHUD();
    }

    // ─── HUD Update ───────────────────────────────────────────────────────────

    _updateHUD() {
        const ws = this.waveSystem;
        const t = this.trainer;
        this.ui.updateHUD({
            pokeballs: t.pokeballs,
            coins: t.coins,
            wave: ws.waveNumber,
            enemies: this.enemies.filter(e => !e.dead).length,
            zone: this.zoneConfig?.name ?? '—',
            badges: t.badgeCount,
            captures: t.totalCaptures,
        });
        this.ui.setStartWaveButton({
            waveNum: ws.nextWaveNum,
            enabled: !ws.isRunning,
            running: ws.isRunning,
        });
        this.ui.updateSpecialSlots(this.towers, ABILITIES);
    }

    // ─── Update Loop ──────────────────────────────────────────────────────────

    update(dt) {
        // Wave system (handles spawning)
        this.waveSystem.update(dt);

        // Enemies
        for (const enemy of this.enemies) {
            if (enemy.dead) continue;
            enemy.update(dt);

            // XP to last attacker when enemy is weakened
            if (enemy.weakened && !enemy._weakenedCounted) {
                enemy._weakenedCounted = true;
                this._roundWeakened++;

                if (enemy.lastAttacker?.slotId) {
                    const xp = Math.round((enemy.wildLevel ?? 1) * (XP_WEAKEN_TIER_MULT[enemy.type] ?? 1));
                    const result = this.trainer.addXPToSlot(enemy.lastAttacker.slotId, xp);
                    this._roundXpGained += xp;

                    if (result.leveledUp) {
                        enemy.lastAttacker.applyLevelBonus?.(result.newLevel);
                        enemy.lastAttacker.triggerLevelUpFx?.();
                        const msg = result.evolved
                            ? `🌟 ¡${result.newEvolution?.newName ?? enemy.lastAttacker.pokemonName} ha evolucionado!`
                            : `⭐ ${enemy.lastAttacker.pokemonName} ¡Nv.${result.newLevel}!`;
                        this.ui.showMessage(msg, 2500);
                        // Sync tower visual after evolution
                        if (result.evolved && result.newEvolution?.ok) {
                            this._applyEvolution(enemy.lastAttacker, result.newEvolution);
                        }
                        this.ui.rebuildBackpackUI(this.trainer.backpack, this.selectedSlotId, true);
                    }
                }
            }

            const towerHit = enemy.attackNearestTower?.(dt, this.towers);
            if (towerHit) {
                this.particles.push(new FloatingText(
                    towerHit.tower.x,
                    towerHit.tower.y - 24,
                    `-${Math.round(towerHit.damage)}`,
                    '#ff8a80'
                ));
                if (towerHit.didFaint) {
                    this.ui.showMessage(`🫥 ${towerHit.tower.pokemonName} debilitado`, 900);
                }
            }

            if (enemy.reached && !enemy._rewarded) {
                enemy._rewarded = true;
                this.waveSystem.recordEscape();
                this._roundEscaped++;
                this.ui.showMessage(`💨 ${enemy.pokemonName} escapó`, 1100);
                this._updateHUD();
            }
        }

        // Towers → shoot
        for (const tower of this.towers) {
            tower.update(dt, this.enemies, (proj) => this.projectiles.push(proj));
        }

        // Projectiles
        for (const proj of this.projectiles) {
            if (proj.dead) continue;
            proj.update(dt);
        }

        // Collision (also applies type mult)
        Collision.check(this.projectiles, this.enemies, (enemy, mult) => {
            const text = mult > 1 ? '¡SUPER EFECTIVO!' : 'Poco efectivo…';
            const color = mult > 1 ? '#ff7b72' : '#a5d8ff';
            this.particles.push(new FloatingText(enemy.x, enemy.y - enemy.radius - 14, text, color));
        });

        // Particles
        for (const p of this.particles) p.update(dt);

        // Mystery gift items
        for (const item of this.mysteryGiftItems) item.update(dt);

        // Cleanup dead entities
        this.enemies = this.enemies.filter(e => !e.dead);
        this.projectiles = this.projectiles.filter(p => !p.dead);
        this.particles = this.particles.filter(p => !p.dead);
        this.mysteryGiftItems = this.mysteryGiftItems.filter(i => !i.dead);

        // After spawning is done and all enemies gone → wave clear
        if (this.waveSystem._spawnDone && this.enemies.length === 0 && this.waveSystem.isRunning) {
            this.waveSystem.notifyAllEnemiesGone();
        }

        // Update HUD every frame
        this._updateHUD();
    }

    // ─── Render ───────────────────────────────────────────────────────────────

    render() {
        const { ctx } = this;

        // 1. Background
        ctx.drawImage(this._bgCanvas, 0, 0);

        // 2. Grid overlay (when placing)
        if (this.selectedSlotId) {
            this._drawGrid(ctx);
        }

        // 3. Ghost tower
        if (this.selectedSlotId && this.ghostCol >= 0) {
            this._drawGhost(ctx);
        }

        // 4. Path on top of grid
        this.pathSystem.draw(ctx, this.debug);

        // 5. Towers
        for (const tower of this.towers) tower.draw(ctx, this.debug);

        // 6. Projectiles
        for (const proj of this.projectiles) proj.draw(ctx);

        // 7. Enemies
        for (const enemy of this.enemies) enemy.draw(ctx, this.debug);

        // 8. Mystery gift items (on top of map, below UI)
        for (const item of this.mysteryGiftItems) item.draw(ctx);

        // 9. Particles
        for (const p of this.particles) p.draw(ctx);

        // 10. Pokéball drag cursor
        if (this._pokeballDragging) {
            this._drawPokeballCursor(ctx, this._pokeballDragX, this._pokeballDragY);
        }

        // 10. Debug overlay
        if (this.debug) this._drawDebugOverlay(ctx);
    }

    _drawGrid(ctx) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 0.5;
        for (let c = 0; c < COLS; c++) {
            for (let r = 0; r < ROWS; r++) {
                ctx.strokeRect(c * CELL, r * CELL, CELL, CELL);
            }
        }
        ctx.restore();
    }

    _drawGhost(ctx) {
        const { ghostCol, ghostRow, ghostValid } = this;
        if (ghostCol < 0 || ghostCol >= COLS || ghostRow < 0 || ghostRow >= ROWS) return;

        const cx = ghostCol * CELL + CELL / 2;
        const cy = ghostRow * CELL + CELL / 2;
        const r  = CELL / 2 - 2;

        // Get range + sprite from selected slot
        let towerRange = 110;
        let ghostImg   = null;

        if (this.selectedSlotId) {
            const slot = this.trainer.getSlot(this.selectedSlotId);
            if (slot?.starterKey && STARTER_TOWER_CONFIG[slot.starterKey]) {
                towerRange = STARTER_TOWER_CONFIG[slot.starterKey].range;
            }
            if (slot?.pokemonId) {
                ghostImg = ImageCache.get(getSpriteUrl(slot.pokemonId));
            }
        }

        ctx.save();

        // ── Range circle (behind everything) ──
        ctx.beginPath();
        ctx.arc(cx, cy, towerRange, 0, Math.PI * 2);
        ctx.fillStyle = ghostValid
            ? 'rgba(63,185,80,0.07)'
            : 'rgba(248,81,73,0.06)';
        ctx.fill();
        ctx.strokeStyle = ghostValid
            ? 'rgba(63,185,80,0.45)'
            : 'rgba(248,81,73,0.45)';
        ctx.lineWidth = 1.3;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // ── Cell tint ──
        ctx.fillStyle   = ghostValid ? 'rgba(63,185,80,0.18)' : 'rgba(248,81,73,0.18)';
        ctx.strokeStyle = ghostValid ? 'rgba(63,185,80,0.8)'  : 'rgba(248,81,73,0.8)';
        ctx.lineWidth   = 1.5;
        ctx.fillRect(ghostCol * CELL, ghostRow * CELL, CELL, CELL);
        ctx.strokeRect(ghostCol * CELL, ghostRow * CELL, CELL, CELL);

        // ── Pokémon sprite ghost (same size as placed tower) ──
        if (ghostImg) {
            const sz = r * 3.8;
            ctx.globalAlpha = 0.58;
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(ghostImg, cx - sz / 2, cy - sz / 2, sz, sz);
            ctx.globalAlpha = 1;
        } else {
            // Fallback: simple semi-transparent circle
            ctx.globalAlpha = 0.45;
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fillStyle = ghostValid ? '#3fb950' : '#f85149';
            ctx.fill();
            ctx.globalAlpha = 1;
        }

        ctx.restore();
    }


    _drawPokeballCursor(ctx, x, y) {
        ctx.save();
        ctx.globalAlpha = 0.85;
        const r = 14;
        ctx.beginPath(); ctx.arc(x, y, r, Math.PI, 0); ctx.fillStyle = '#f04040'; ctx.fill();
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI); ctx.fillStyle = '#fff'; ctx.fill();
        ctx.strokeStyle = '#222'; ctx.lineWidth = r * 0.12;
        ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, r * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
        ctx.restore();
    }

    _drawDebugOverlay(ctx) {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(4, 4, 220, 100);
        ctx.fillStyle = '#0f0';
        ctx.font = '11px monospace';
        ctx.fillText(`Enemies:     ${this.enemies.length}`, 10, 20);
        ctx.fillText(`Projectiles: ${this.projectiles.length}`, 10, 35);
        ctx.fillText(`Particles:   ${this.particles.length}`, 10, 50);
        ctx.fillText(`Towers:      ${this.towers.length}`, 10, 65);
        ctx.fillText(`Wave:        ${this.waveSystem.waveNumber} (running:${this.waveSystem.isRunning})`, 10, 80);
        ctx.restore();
    }

    // ─── Reset ────────────────────────────────────────────────────────────────

    reset(trainerSystem) {
        this.trainer = trainerSystem;
        this.towers = [];
        this.enemies = [];
        this.projectiles = [];
        this.particles = [];
        this.mysteryGiftItems = [];
        this.occupiedCells.clear();
        this.waveSystem.reset();
        this.trainer.returnAllToBackpack();
        this.selectedSlotId = null;
        this.selectedTower = null;
        this._deselectTower();
        this._buildBackground();
        this._updateHUD();
        this.ui.rebuildBackpackUI(this.trainer.backpack, null, false);
        this.ui.updatePokedex(this.trainer.pokedex);
    }
}
