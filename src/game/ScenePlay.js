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
import { RareCandyItem } from '../entities/RareCandyItem.js';
import { MAP1 } from '../data/maps.js';
import { XP_PER_TIER, EVOLUTION_CHAIN, STARTER_TOWER_CONFIG } from '../data/balance.js';
import { ABILITIES } from '../data/abilities.js';
import { getSpriteUrl } from '../data/pokemon.js';

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
        this.rareCandyItems = [];   // floating collectible RareCandyItems

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

    _buildBackground() {
        this._bgCanvas = document.createElement('canvas');
        this._bgCanvas.width = CANVAS_W;
        this._bgCanvas.height = CANVAS_H;
        const bCtx = this._bgCanvas.getContext('2d');

        // Grass base
        bCtx.fillStyle = this._zoneBgColor ?? '#1c3320';
        bCtx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // Subtle tile texture
        for (let c = 0; c < COLS; c++) {
            for (let r = 0; r < ROWS; r++) {
                const shade = (c + r) % 2 === 0 ? 0 : 1;
                bCtx.fillStyle = shade ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.02)';
                bCtx.fillRect(c * CELL, r * CELL, CELL, CELL);

                const seed = ((c * 37 + r * 13) % 10);
                if (seed === 3 || seed === 7) {
                    const gx = c * CELL + CELL / 2 + (((c * 7 + r * 3) % 10) - 5);
                    const gy = r * CELL + CELL / 2 + (((c * 3 + r * 11) % 10) - 5);
                    bCtx.save();
                    bCtx.strokeStyle = seed === 3 ? '#2a4a2a' : '#244024';
                    bCtx.lineWidth = 1;
                    for (let b = -1; b <= 1; b++) {
                        bCtx.beginPath();
                        bCtx.moveTo(gx + b * 3, gy + 5);
                        bCtx.lineTo(gx + b * 3 + b, gy - 5);
                        bCtx.stroke();
                    }
                    bCtx.restore();
                }
            }
        }

        // Decorative trees
        const treePositions = [
            [3, 2], [26, 2], [28, 13], [2, 12], [14, 2], [14, 13],
            [8, 7], [22, 8], [6, 13], [25, 5], [19, 12], [10, 3],
        ];
        for (const [tc, tr] of treePositions) {
            const tx = tc * CELL + CELL / 2;
            const ty = tr * CELL + CELL / 2;
            if (this.pathSystem.isCellBlocked(tc, tr)) continue;
            const tR = 12 + ((tc + tr) % 4) * 2;
            const grad = bCtx.createRadialGradient(tx - 3, ty - 3, 2, tx, ty, tR);
            grad.addColorStop(0, '#4a8a3a');
            grad.addColorStop(0.6, '#2d6e24');
            grad.addColorStop(1, '#1a4018');
            bCtx.beginPath(); bCtx.arc(tx, ty, tR, 0, Math.PI * 2);
            bCtx.fillStyle = grad; bCtx.fill();
            bCtx.beginPath(); bCtx.ellipse(tx + 4, ty + tR - 4, tR * 0.6, tR * 0.25, 0.3, 0, Math.PI * 2);
            bCtx.fillStyle = 'rgba(0,0,0,0.25)'; bCtx.fill();
        }

        // Path on top
        this.pathSystem.draw(bCtx, false);
    }

    // ─── UI Event Bindings ────────────────────────────────────────────────────

    _bindUI() {
        const { ui } = this;
        ui.btnStartWave.addEventListener('click', () => this._startWave());

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

        // Usar Rare Candy button
        ui.bindCandyHandler(() => {
            if (!this.selectedTower) return;
            if (this.trainer.rareCandy <= 0) {
                this.ui.showMessage('❌ No tienes Rare Candy', 1500);
                return;
            }
            const result = this.trainer.useRareCandyOnSlot(this.selectedTower.slotId);
            if (result.ok) {
                this._applyEvolution(this.selectedTower, result);
            } else if (result.reason === 'cantEvolve') {
                this.ui.showMessage(`${this.selectedTower.pokemonName} no puede evolucionar`, 1800);
            } else if (result.reason === 'noCandy') {
                this.ui.showMessage('❌ No tienes Rare Candy', 1500);
            }
        });

        ui.bindSpecialHandler((slotIdx) => this._useSpecialFromSlot(slotIdx));
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
        const allWeakened = this._roundSpawned > 0 && this._roundWeakened >= this._roundSpawned;
        if (!allWeakened) {
            this.ui.showMessage(`🔁 Ronda ${waveNum} se repite: derrota a todos`, 2500);
            this._roundSpawned = 0;
            this._roundWeakened = 0;
            this.waveSystem.restartCurrentWave();
            this._updateHUD();
            return;
        }

        this.trainer.addPokeball(1);
        this._roundPokeballsGained += 1;
        this.ui.showMessage('🎉 ¡Ronda perfecta! +1 Pokébola + RC 🔴', 3500);
        this.rareCandyItems.push(new RareCandyItem());

        if (waveNum > 0 && waveNum % 5 === 0) {
            this.rareCandyItems.push(new RareCandyItem());
            this.ui.showMessage('🍬 ¡Caramelo Raro disponible en el mapa!', 2500);
        }

        if (waveNum >= 10) {
            this.trainer.returnAllToBackpack();
            this.ui.rebuildBackpackUI(this.trainer.backpack, null, false);
            this.ui.showMessage('🏁 Superaste la ronda 10. Volviendo al menú...', 2600);
            this._updateHUD();
            this.onExit?.();
            return;
        }

        this.ui.showMessage(`✅ Ronda ${waveNum} completada`, 2200);
        this.ui.showRoundClear({
            captured: this._roundCaptured,
            escaped: this._roundEscaped,
            xpGained: this._roundXpGained,
            pokeballsGained: this._roundPokeballsGained,
        });
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

        const totalXP = XP_PER_TIER[enemy.type] ?? 12;
        this.trainer.addXP(totalXP);
        this._roundCaptured++;
        this._roundXpGained += totalXP;

        if (enemy.lastAttacker?.slotId) {
            const lvResult = this.trainer.addXPToSlot(enemy.lastAttacker.slotId, totalXP);
            // Refresh info panel if this tower is selected
            if (this.selectedTower?.slotId === enemy.lastAttacker.slotId) {
                const slot = this.trainer.getSlot(enemy.lastAttacker.slotId);
                this.ui.showTowerInfoPokemon(this.selectedTower, slot, this.trainer);
            }
            if (lvResult.leveledUp) {
                enemy.lastAttacker.triggerLevelUpFx?.();
                this.ui.showMessage(`⭐ ${enemy.lastAttacker.pokemonName} subió a Nv. ${lvResult.level}`, 2200);
            }
        }

        if (captureResult.sentToPC) this.ui.showMessage('📦 Pokemon sent to PC', 1800);
        this.ui.showMessage(`✅ ¡${enemy.pokemonName} capturado! +${totalXP} XP torre`, 1800);
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
        // Check RareCandy collectibles first
        for (const item of this.rareCandyItems) {
            if (!item.dead && item.contains(x, y)) {
                item.dead = true;
                this.trainer.rareCandy++;
                this.ui.showMessage('🍬 +1 Rare Candy recogido!', 2000);
                this._updateHUD();
                // Refresh tower panel if a tower is selected (button text updates)
                if (this.selectedTower) {
                    const slot = this.trainer.getSlot(this.selectedTower.slotId);
                    this.ui.showTowerInfoPokemon(this.selectedTower, slot, this.trainer);
                }
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

    // ─── HUD Update ───────────────────────────────────────────────────────────

    _updateHUD() {
        const ws = this.waveSystem;
        const t = this.trainer;
        this.ui.updateHUD({
            pokeballs: t.pokeballs,
            rareCandy: t.rareCandy,
            wave: ws.waveNumber,
            enemies: this.enemies.filter(e => !e.dead).length,
            zone: this.zoneConfig?.name ?? '—',
            badges: t.badgeCount,
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

            // Track newly weakened enemies for perfect-round bonus
            if (enemy.weakened && !enemy._weakenedCounted) {
                enemy._weakenedCounted = true;
                this._roundWeakened++;
            }

            if (enemy.reached && !enemy._rewarded) {
                enemy._rewarded = true;
                this.waveSystem.recordEscape();
                this._roundEscaped++;
                const penalty = this.trainer.onEnemyEscape(enemy);
                if (penalty.penalty === 'xp') this.ui.showMessage(`💨 ${enemy.pokemonName} escapó… -${penalty.amount} XP`, 1400);
                else if (penalty.penalty === 'pokeball') this.ui.showMessage(`💨 ${enemy.pokemonName} escapó… -1 Pokébola`, 1400);
                else this.ui.showMessage(`💨 ${enemy.pokemonName} escapó…`, 1100);
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
            const text = mult > 1 ? 'SUPER EFFECTIVE!' : 'NOT VERY EFFECTIVE';
            const color = mult > 1 ? '#ff7b72' : '#a5d8ff';
            this.particles.push(new FloatingText(enemy.x, enemy.y - enemy.radius - 12, text, color));
        });

        // Particles
        for (const p of this.particles) p.update(dt);

        // RareCandy items
        for (const item of this.rareCandyItems) item.update(dt);

        // Cleanup dead entities
        this.enemies = this.enemies.filter(e => !e.dead);
        this.projectiles = this.projectiles.filter(p => !p.dead);
        this.particles = this.particles.filter(p => !p.dead);
        this.rareCandyItems = this.rareCandyItems.filter(i => !i.dead);

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

        // 8. Rare Candy items (on top of map, below UI)
        for (const item of this.rareCandyItems) item.draw(ctx);

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

        // Get range from selected slot's config
        let towerRange = 110;
        if (this.selectedSlotId) {
            const slot = this.trainer.getSlot(this.selectedSlotId);
            if (slot?.starterKey && STARTER_TOWER_CONFIG[slot.starterKey]) {
                towerRange = STARTER_TOWER_CONFIG[slot.starterKey].range;
            }
        }

        ctx.save();

        // Range circle (behind the cell highlight)
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

        // Cell highlight
        ctx.fillStyle = ghostValid ? 'rgba(63,185,80,0.22)' : 'rgba(248,81,73,0.22)';
        ctx.strokeStyle = ghostValid ? 'rgba(63,185,80,0.9)' : 'rgba(248,81,73,0.9)';
        ctx.lineWidth = 1.5;
        ctx.fillRect(ghostCol * CELL, ghostRow * CELL, CELL, CELL);
        ctx.strokeRect(ghostCol * CELL, ghostRow * CELL, CELL, CELL);

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
