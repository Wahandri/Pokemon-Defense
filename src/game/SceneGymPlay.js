// ─── SceneGymPlay ─────────────────────────────────────────────────────────────
// Gym battle scene. Fixed waves (no RNG), no pokéball capture, auto-defeat
// weakened enemies. Win = all waves cleared → award badge.

import { CANVAS_W, CANVAS_H, CELL, COLS, ROWS } from '../utils/constants.js';
import { pixelToGrid } from '../utils/math.js';
import { PathSystem } from '../systems/PathSystem.js';
import { Collision } from '../systems/Collision.js';
import { createEnemy } from '../entities/Enemy.js';
import { createPokemonTower } from '../entities/PokemonTower.js';
import { spawnDeathParticles, Particle } from '../entities/Particle.js';
import { MAP1 } from '../data/maps.js';
import { STARTER_TOWER_CONFIG } from '../data/balance.js';

export class SceneGymPlay {
    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {import('../ui/UI.js').UI} ui
     * @param {import('../systems/TrainerSystem.js').TrainerSystem} trainer
     * @param {import('../data/kanto_zones.js').KantoZone} gymZone
     * @param {Function} onWin   - (gymZone) => void
     * @param {Function} onExit  - () => void (back to zone select)
     */
    constructor(ctx, ui, trainer, gymZone, onWin, onExit) {
        this.ctx = ctx;
        this.ui = ui;
        this.trainer = trainer;
        this.gym = gymZone;
        this.onWin = onWin;
        this.onExit = onExit;

        this.debug = false;

        this.pathSystem = new PathSystem(MAP1.waypoints);
        this.occupiedCells = new Set();

        this.towers = [];
        this.enemies = [];
        this.projectiles = [];
        this.particles = [];

        // Gym wave state
        this._gymWaveIdx = 0;  // current wave index (0-based)
        this._gymSpawning = false;
        this._gymDone = false;
        this._gymRunning = false;
        this._gymVictory = false;
        this._waveDelay = 0;

        this.selectedSlotId = null;
        this.selectedTower = null;
        this.ghostCol = -1;
        this.ghostRow = -1;
        this.ghostValid = false;

        this._pokeballDragging = false;
        this._pokeballDragX = 0;
        this._pokeballDragY = 0;

        this._buildBackground();
        this._bindUI();
        this._updateHUD();
    }

    // ─── Background ──────────────────────────────────────────────────────────

    _buildBackground() {
        this._bgCanvas = document.createElement('canvas');
        this._bgCanvas.width = CANVAS_W;
        this._bgCanvas.height = CANVAS_H;
        const bCtx = this._bgCanvas.getContext('2d');
        bCtx.fillStyle = this.gym.bgColor ?? '#18140c';
        bCtx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        for (let c = 0; c < COLS; c++) {
            for (let r = 0; r < ROWS; r++) {
                bCtx.fillStyle = (c + r) % 2 === 0 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.03)';
                bCtx.fillRect(c * CELL, r * CELL, CELL, CELL);
            }
        }
        bCtx.fillStyle = 'rgba(220,180,60,0.08)';
        for (let i = 0; i < CANVAS_W; i += 64) {
            bCtx.fillRect(i, 0, 2, CANVAS_H);
            bCtx.fillRect(0, i, CANVAS_W, 2);
        }
        this.pathSystem.draw(bCtx, false);
    }

    // ─── UI Bindings ─────────────────────────────────────────────────────────

    _bindUI() {
        const { ui } = this;
        if (ui.btnStartWave) {
            this._startWaveListener = () => this._startNextGymWave();
            ui.btnStartWave.addEventListener('click', this._startWaveListener);
        }

        ui.bindBackpackSelect?.((slotId) => this._selectPartySlot(slotId));
        ui.bindPickupHandler?.(() => { if (this.selectedTower) this._pickupTower(this.selectedTower); });
        ui.bindEvolveHandler?.(() => {
            if (!this.selectedTower) return;
            const result = this.trainer.evolveSlot(this.selectedTower.slotId);
            if (result.ok) this._applyEvolution(this.selectedTower, result);
        });
    }

    // ─── Gym Wave Logic ───────────────────────────────────────────────────────

    _startNextGymWave() {
        if (this._gymRunning || this._gymVictory) return;
        if (this._gymWaveIdx >= this.gym.waves.length) return;

        this._gymRunning = true;
        this.selectedSlotId = null;
        this._deselectTower();
        this.ui.rebuildBackpackUI?.(this.trainer.party, null, true);

        const wave = this.gym.waves[this._gymWaveIdx];
        let spawnDelay = 0;
        for (const spec of wave) {
            setTimeout(() => this._spawnGymEnemy(spec), spawnDelay);
            spawnDelay += 1200;
        }
        this.ui.showMessage(`⚔️ Oleada ${this._gymWaveIdx + 1}/${this.gym.waves.length} — ¡Derrota a ${this.gym.leader}!`, 2500);
        this._updateHUD();
    }

    _spawnGymEnemy(spec) {
        const enemy = createEnemy(spec.tier, this.pathSystem, 3, { id: spec.speciesId, name: spec.name });
        enemy.pokemonType = spec.pokemonType;
        const pos = this.pathSystem.getPositionAt(0);
        enemy.x = pos.x; enemy.y = pos.y;
        this.enemies.push(enemy);
    }

    // ─── Tower Management ─────────────────────────────────────────────────────

    _selectPartySlot(slotId) {
        if (this._gymRunning) { this.ui.showMessage('⚠️ No puedes mover torres durante el combate'); return; }
        this.selectedSlotId = this.selectedSlotId === slotId ? null : slotId;
        if (this.selectedSlotId) this._deselectTower();
        this.ui.rebuildBackpackUI?.(this.trainer.party, this.selectedSlotId, false);
    }

    _placeTower(col, row) {
        if (this._gymRunning) return;
        const slotId = this.selectedSlotId;
        if (!slotId) return;
        if (!this._isCellOpen(col, row)) { this.ui.showMessage('❌ No puedes colocar aquí'); return; }
        const slot = this.trainer.getSlot(slotId);
        if (!slot || slot.placed) return;
        const tower = createPokemonTower(slot, col, row, CELL);
        this.towers.push(tower);
        this.occupiedCells.add(`${col}_${row}`);
        this.trainer.markPlaced(slotId);
        this.selectedSlotId = null;
        this.ui.rebuildBackpackUI?.(this.trainer.party, null, false);
        this._updateHUD();
    }

    _pickupTower(tower) {
        if (this._gymRunning) { this.ui.showMessage('⚠️ No puedes mover torres durante el combate'); return; }
        this.towers = this.towers.filter(t => t !== tower);
        this.occupiedCells.delete(`${tower.col}_${tower.row}`);
        this.trainer.markReturned(tower.slotId);
        this._deselectTower();
        this.ui.rebuildBackpackUI?.(this.trainer.party, null, false);
        this._updateHUD();
    }

    _selectTower(tower) {
        if (this.selectedTower) this.selectedTower.selected = false;
        this.selectedTower = tower;
        if (tower) {
            tower.selected = true;
            const slot = this.trainer.getSlot(tower.slotId);
            this.ui.showTowerInfoPokemon?.(tower, slot, this.trainer);
        } else { this.ui.hideTowerInfo?.(); }
    }

    _deselectTower() {
        if (this.selectedTower) this.selectedTower.selected = false;
        this.selectedTower = null;
        this.ui.hideTowerInfo?.();
    }

    _isCellOpen(col, row) {
        if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
        if (this.pathSystem.isCellBlocked(col, row)) return false;
        if (this.occupiedCells.has(`${col}_${row}`)) return false;
        return true;
    }

    // ─── Input ───────────────────────────────────────────────────────────────

    onMouseMove(x, y) {
        if (this.selectedSlotId) {
            const { col, row } = pixelToGrid(x, y, CELL);
            this.ghostCol = col; this.ghostRow = row;
            this.ghostValid = this._isCellOpen(col, row);
        } else { this.ghostCol = -1; this.ghostRow = -1; }
    }

    onClick(x, y) {
        const { col, row } = pixelToGrid(x, y, CELL);
        if (this.selectedSlotId) { this._placeTower(col, row); return; }
        const clicked = this.towers.find(t => t.col === col && t.row === row);
        if (clicked) {
            if (this.selectedTower === clicked) this._deselectTower();
            else this._selectTower(clicked);
            return;
        }
        this._deselectTower();
    }

    onRightClick(x, y) {
        if (this.selectedSlotId) {
            this.selectedSlotId = null;
            this.ui.rebuildBackpackUI?.(this.trainer.party, null, false);
            return;
        }
        const { col, row } = pixelToGrid(x, y, CELL);
        const tower = this.towers.find(t => t.col === col && t.row === row);
        if (tower) this._pickupTower(tower);
    }

    onKeyDown(key) {
        if (key === 'Escape') this._deselectTower();
    }

    // ─── HUD ─────────────────────────────────────────────────────────────────

    _updateHUD() {
        const t = this.trainer;
        this.ui.updateHUD?.({
            level: t.level, xp: t.xp, xpToNext: t.xpToNext,
            pokeballs: t.pokeballs, rareCandy: t.rareCandy,
            wave: `${this._gymWaveIdx + 1}/${this.gym.waves.length}`,
            enemies: this.enemies.filter(e => !e.dead).length,
            zone: this.gym.name,
            badges: t.badgeCount,
        });
        if (this.ui.setStartWaveButton) {
            const allDone = this._gymWaveIdx >= this.gym.waves.length;
            this.ui.setStartWaveButton({
                waveNum: this._gymWaveIdx + 1,
                enabled: !this._gymRunning && !allDone && !this._gymVictory,
                running: this._gymRunning,
                label: allDone ? '¡Completado!' : `⚔️ Oleada ${this._gymWaveIdx + 1}`,
            });
        }
    }

    // ─── Evolution ───────────────────────────────────────────────────────────

    _applyEvolution(tower, { newName, newId }) {
        const { EVOLUTION_CHAIN } = await import('../data/balance.js').catch(() => ({ EVOLUTION_CHAIN: {} }));
        tower.pokemonName = newName;
        tower.pokemonId = newId;
        const img = new Image();
        img.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${newId}.png`;
        img.onload = () => { tower._img = img; };
        this.ui.showMessage?.(`🌟 ¡${newName} ha evolucionado!`, 3000);
        const slot = this.trainer.getSlot(tower.slotId);
        this.ui.showTowerInfoPokemon?.(tower, slot, this.trainer);
        this.ui.rebuildBackpackUI?.(this.trainer.party, null, this._gymRunning);
        this._updateHUD();
    }

    // ─── Update ──────────────────────────────────────────────────────────────

    update(dt) {
        // Towers shoot
        for (const tower of this.towers) {
            tower.update(dt, this.enemies, proj => this.projectiles.push(proj));
        }

        // Projectiles
        for (const proj of this.projectiles) { if (!proj.dead) proj.update(dt); }

        // Collision
        Collision.check(this.projectiles, this.enemies);

        // Enemies
        for (const enemy of this.enemies) {
            if (enemy.dead) continue;
            enemy.update(dt);

            // GYM MODE: auto-defeat weakened enemies (no capture)
            if (enemy.weakened && !enemy._gymDefeated) {
                enemy._gymDefeated = true;
                enemy.capture(); // makes dead=true
                this.particles.push(...spawnDeathParticles(enemy.x, enemy.y, enemy.color));
                const xp = { red: 8, blue: 18, green: 40, t4: 80 }[enemy.type] ?? 8;
                this.trainer.addXP(xp);
                this.ui.showMessage?.(`💥 ¡${enemy.pokemonName} derrotado! +${xp} XP`, 1500);
            }

            if (enemy.reached && !enemy._rewarded) {
                enemy._rewarded = true;
                this.ui.showMessage?.(`💨 ${enemy.pokemonName} escapó…`, 1100);
            }
        }

        this.particles.forEach(p => p.update(dt));

        // Cleanup
        this.enemies = this.enemies.filter(e => !e.dead);
        this.projectiles = this.projectiles.filter(p => !p.dead);
        this.particles = this.particles.filter(p => !p.dead);

        // Check if current wave is done
        if (this._gymRunning && this.enemies.length === 0) {
            this._gymRunning = false;
            this._gymWaveIdx++;

            if (this._gymWaveIdx >= this.gym.waves.length) {
                this._gymVictory = true;
                this._onGymVictory();
            } else {
                this.ui.showMessage?.(`✅ Oleada ${this._gymWaveIdx} completada`, 2000);
                this.ui.rebuildBackpackUI?.(this.trainer.party, null, false);
            }
            this._updateHUD();
        }
    }

    _onGymVictory() {
        this.trainer.addBadge(this.gym.badgeId);
        const xpBonus = 120;
        this.trainer.addXP(xpBonus);
        this.ui.showMessage?.(`🏅 ¡Obtuviste la ${this.gym.badgeName}! +${xpBonus} XP`, 5000);
        this._updateHUD();
        setTimeout(() => this.onWin?.(this.gym), 4000);
    }

    // ─── Render ──────────────────────────────────────────────────────────────

    render() {
        const { ctx } = this;
        ctx.drawImage(this._bgCanvas, 0, 0);

        // Grid overlay when placing
        if (this.selectedSlotId) this._drawGrid(ctx);

        // Ghost
        if (this.selectedSlotId && this.ghostCol >= 0) this._drawGhost(ctx);

        this.pathSystem.draw(ctx, this.debug);

        for (const tower of this.towers) tower.draw(ctx, this.debug);
        for (const proj of this.projectiles) proj.draw(ctx);
        for (const enemy of this.enemies) enemy.draw(ctx, this.debug);
        for (const p of this.particles) p.draw(ctx);

        // Gym header
        this._drawGymHeader(ctx);

        // Victory banner
        if (this._gymVictory) this._drawVictoryBanner(ctx);
    }

    _drawGymHeader(ctx) {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, 0, CANVAS_W, 32);
        ctx.fillStyle = '#f0c040';
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`⚔️ Gimnasio Roca — ${this.gym.leader}`, CANVAS_W / 2, 20);
        ctx.restore();
    }

    _drawVictoryBanner(ctx) {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(CANVAS_W / 2 - 200, CANVAS_H / 2 - 50, 400, 100);
        ctx.strokeStyle = '#f0c040';
        ctx.lineWidth = 2;
        ctx.strokeRect(CANVAS_W / 2 - 200, CANVAS_H / 2 - 50, 400, 100);
        ctx.fillStyle = '#f0c040';
        ctx.font = 'bold 22px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`🏅 ¡${this.gym.badgeName} obtenida!`, CANVAS_W / 2, CANVAS_H / 2 - 10);
        ctx.font = '13px Inter, sans-serif';
        ctx.fillStyle = '#fff';
        ctx.fillText('¡Victoria! Volviendo…', CANVAS_W / 2, CANVAS_H / 2 + 18);
        ctx.restore();
    }

    _drawGrid(ctx) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 0.5;
        for (let c = 0; c < COLS; c++) {
            for (let r = 0; r < ROWS; r++) {
                if (!this.pathSystem.isCellBlocked(c, r)) {
                    ctx.strokeRect(c * CELL, r * CELL, CELL, CELL);
                }
            }
        }
        ctx.restore();
    }

    _drawGhost(ctx) {
        const { ghostCol: gc, ghostRow: gr, ghostValid: gv } = this;
        if (gc < 0) return;
        const cx = gc * CELL + CELL / 2, cy = gr * CELL + CELL / 2;
        let range = 110;
        if (this.selectedSlotId) {
            const slot = this.trainer.getSlot(this.selectedSlotId);
            if (slot?.starterKey && STARTER_TOWER_CONFIG[slot.starterKey]) {
                range = STARTER_TOWER_CONFIG[slot.starterKey].range;
            }
        }
        ctx.save();
        ctx.beginPath(); ctx.arc(cx, cy, range, 0, Math.PI * 2);
        ctx.fillStyle = gv ? 'rgba(63,185,80,0.07)' : 'rgba(248,81,73,0.06)';
        ctx.fill();
        ctx.strokeStyle = gv ? 'rgba(63,185,80,0.45)' : 'rgba(248,81,73,0.45)';
        ctx.lineWidth = 1.3; ctx.setLineDash([6, 4]); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = gv ? 'rgba(63,185,80,0.22)' : 'rgba(248,81,73,0.22)';
        ctx.strokeStyle = gv ? 'rgba(63,185,80,0.9)' : 'rgba(248,81,73,0.9)';
        ctx.lineWidth = 1.5;
        ctx.fillRect(gc * CELL, gr * CELL, CELL, CELL);
        ctx.strokeRect(gc * CELL, gr * CELL, CELL, CELL);
        ctx.restore();
    }

    destroy() {
        if (this._startWaveListener && this.ui.btnStartWave) {
            this.ui.btnStartWave.removeEventListener('click', this._startWaveListener);
        }
    }
}
