// ─── Play Scene ────────────────────────────────────────────────────────────────
// Main gameplay scene: towers, enemies, projectiles, waves, input handling.

import { CANVAS_W, CANVAS_H, CELL, COLS, ROWS } from '../utils/constants.js';
import { pixelToGrid } from '../utils/math.js';
import { PathSystem } from '../systems/PathSystem.js';
import { WaveSystem } from '../systems/WaveSystem.js';
import { Collision } from '../systems/Collision.js';
import { createEnemy } from '../entities/Enemy.js';
import { createTower, TOWER_DEFS } from '../entities/Tower.js';
import { spawnDeathParticles, spawnCaptureEffect, spawnLegendaryCaptureEffect } from '../entities/Particle.js';
import { MAP1 } from '../data/maps.js';
import { START_MONEY, START_LIVES, calcWaveBonus } from '../data/balance.js';

export class ScenePlay {
    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {UI}    ui
     * @param {Function} onGameOver   callback(waveSurvived)
     * @param {Function} onVictory    callback(score)
     */
    constructor(ctx, ui, onGameOver) {
        this.ctx = ctx;
        this.ui = ui;
        this.onGameOver = onGameOver;

        // ── State ─────────────────────────────────────────────────────────────
        this.money = START_MONEY;
        this.lives = START_LIVES;
        this.debug = false;

        // ── Map / Path ────────────────────────────────────────────────────────
        this.map = MAP1;
        this.pathSystem = new PathSystem(MAP1.waypoints);

        // ── Grid ──────────────────────────────────────────────────────────────
        // Set of "col_row" keys occupied by towers
        this.occupiedCells = new Set();

        // ── Entities ──────────────────────────────────────────────────────────
        this.towers = [];
        this.enemies = [];
        this.projectiles = [];
        this.particles = [];
        this._pendingWaveBonus = 0;

        // ── Pokédex ───────────────────────────────────────────────────────────
        // Map<pokemonId, { name, type, count, color }>
        this.pokedex = new Map();

        // ── Wave system ───────────────────────────────────────────────────────
        this.waveSystem = new WaveSystem(
            (type, waveNum) => this._spawnEnemy(type, waveNum),
            (waveNum) => this._onWaveClear(waveNum)
        );

        // ── Input state ───────────────────────────────────────────────────────
        this.selectedTowerType = null;  // type key or null
        this.selectedTower = null;  // placed Tower instance (for info panel)
        this.ghostCol = -1;
        this.ghostRow = -1;
        this.ghostValid = false;

        // ── Pre-render: build background and path into off-screen canvas ──────
        this._buildBackground();

        // ── UI Bindings ───────────────────────────────────────────────────────
        this._bindUI();

        // Update HUD immediately
        this._updateHUD();
    }

    // ─── Background Pre-render ────────────────────────────────────────────────

    _buildBackground() {
        this._bgCanvas = document.createElement('canvas');
        this._bgCanvas.width = CANVAS_W;
        this._bgCanvas.height = CANVAS_H;
        const bCtx = this._bgCanvas.getContext('2d');

        // ── Grass base: deep green fill ──────────────────────────────────────
        bCtx.fillStyle = '#1c3320';
        bCtx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // ── Subtle tile texture ───────────────────────────────────────────────
        for (let c = 0; c < COLS; c++) {
            for (let r = 0; r < ROWS; r++) {
                // Checkerboard variation
                const shade = (c + r) % 2 === 0 ? 0 : 1;
                bCtx.fillStyle = shade ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.02)';
                bCtx.fillRect(c * CELL, r * CELL, CELL, CELL);

                // Random grass tufts (deterministic using seed)
                const seed = ((c * 37 + r * 13) % 10);
                if (seed === 3 || seed === 7) {
                    const gx = c * CELL + CELL / 2 + (((c * 7 + r * 3) % 10) - 5);
                    const gy = r * CELL + CELL / 2 + (((c * 3 + r * 11) % 10) - 5);
                    // Tuft blades
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

        // ── Decorative trees (circles with radial gradient) ───────────────────
        const treePositions = [
            [3, 2], [26, 2], [28, 13], [2, 12], [14, 2], [14, 13],
            [8, 7], [22, 8], [6, 13], [25, 5], [19, 12], [10, 3],
        ];
        for (const [tc, tr] of treePositions) {
            const tx = tc * CELL + CELL / 2;
            const ty = tr * CELL + CELL / 2;
            // Check not on path
            if (this.pathSystem.isCellBlocked(tc, tr)) continue;

            const tr1 = 12 + ((tc + tr) % 4) * 2;
            const grad = bCtx.createRadialGradient(tx - 3, ty - 3, 2, tx, ty, tr1);
            grad.addColorStop(0, '#4a8a3a');
            grad.addColorStop(0.6, '#2d6e24');
            grad.addColorStop(1, '#1a4018');

            bCtx.beginPath();
            bCtx.arc(tx, ty, tr1, 0, Math.PI * 2);
            bCtx.fillStyle = grad;
            bCtx.fill();
            // Shadow
            bCtx.beginPath();
            bCtx.ellipse(tx + 4, ty + tr1 - 4, tr1 * 0.6, tr1 * 0.25, 0.3, 0, Math.PI * 2);
            bCtx.fillStyle = 'rgba(0,0,0,0.25)';
            bCtx.fill();
            // Highlight
            bCtx.beginPath();
            bCtx.arc(tx - 4, ty - 4, tr1 * 0.35, 0, Math.PI * 2);
            bCtx.fillStyle = 'rgba(100,200,80,0.25)';
            bCtx.fill();
        }

        // ── Small rocks ───────────────────────────────────────────────────────
        const rocks = [[5, 5], [20, 6], [7, 10], [23, 11], [11, 14]];
        for (const [rc, rr] of rocks) {
            if (this.pathSystem.isCellBlocked(rc, rr)) continue;
            const rx = rc * CELL + CELL / 2;
            const ry = rr * CELL + CELL / 2;
            const rRad = 5 + (rc % 3);
            const rg = bCtx.createRadialGradient(rx - 2, ry - 2, 1, rx, ry, rRad);
            rg.addColorStop(0, '#aab0a8');
            rg.addColorStop(1, '#5a5e58');
            bCtx.beginPath();
            bCtx.ellipse(rx, ry, rRad, rRad * 0.7, 0.2, 0, Math.PI * 2);
            bCtx.fillStyle = rg;
            bCtx.fill();
        }

        // ── Draw path on top ──────────────────────────────────────────────────
        this.pathSystem.draw(bCtx, false);
    }

    // ─── UI Event Bindings ────────────────────────────────────────────────────

    _bindUI() {
        const { ui } = this;
        ui.btnStartWave.addEventListener('click', () => this._startWave());

        // Tower selector buttons (event delegation approach — no re-bind)
        const towerKeys = ['dart', 'cannon', 'ice', 'sniper', 'laser', 'mortar'];
        for (const key of towerKeys) {
            const btn = document.getElementById(`tower-btn-${key}`);
            if (btn) btn.addEventListener('click', () => this._selectTowerType(key));
        }
        // Sell button handled in UI via event delegation — no bind needed here
    }

    // ─── Wave Control ─────────────────────────────────────────────────────────

    _startWave() {
        if (this.waveSystem.isRunning) return;
        const ok = this.waveSystem.startNextWave();
        if (!ok) return;
        this.ui.showMessage(`⚔️ ¡Oleada ${this.waveSystem.waveNumber} comenzando!`);
        this._updateHUD();
    }

    _spawnEnemy(type, waveNum = 1) {
        const enemy = createEnemy(type, this.pathSystem, waveNum);
        const pos = this.pathSystem.getPositionAt(0);
        enemy.x = pos.x; enemy.y = pos.y;
        this.enemies.push(enemy);
        this._updateHUD();
    }

    _onWaveClear(waveNum) {
        // Award wave-clear bonus once all spawning is done
        const bonus = calcWaveBonus(waveNum);
        this._pendingWaveBonus = bonus; // applied when last enemy dies
    }

    // ─── Tower Type Selection ─────────────────────────────────────────────────

    _selectTowerType(type) {
        if (this.selectedTowerType === type) {
            // Deselect
            this.selectedTowerType = null;
            this.ui.clearTowerSelection();
        } else {
            const cost = TOWER_DEFS[type].cost;
            if (this.money < cost) {
                this.ui.showMessage('💸 Dinero insuficiente');
                return;
            }
            this.selectedTowerType = type;
            // Deselect any placed tower
            this._deselectTower();
        }
        this.ui.updateTowerSelector(this.selectedTowerType, this.money);
    }

    // ─── Placed Tower Selection ───────────────────────────────────────────────

    _selectTower(tower) {
        // Deselect previous
        if (this.selectedTower) this.selectedTower.selected = false;
        this.selectedTower = tower;
        if (tower) {
            tower.selected = true;
            // Show UI panel
            this.ui.showTowerInfo(
                tower,
                this.money,
                (key) => this._upgradeSelectedTower(key),
                () => this._sellSelectedTower()
            );
        } else {
            this.ui.hideTowerInfo();
        }
    }

    _deselectTower() {
        if (this.selectedTower) this.selectedTower.selected = false;
        this.selectedTower = null;
        this.ui.hideTowerInfo();
    }

    // ─── Tower Upgrade ────────────────────────────────────────────────────────

    _upgradeSelectedTower(key) {
        const tower = this.selectedTower;
        if (!tower) return;

        const available = tower.getAvailableUpgrades();
        const upgrade = available.find(u => u.key === key);
        if (!upgrade) return;
        if (this.money < upgrade.cost) {
            this.ui.showMessage('💸 Dinero insuficiente');
            return;
        }

        const result = tower.applyUpgrade(key);
        if (result.ok) {
            this.money -= result.cost;
            this.ui.showMessage(`✅ Mejora [${key}] aplicada!`);
            // Refresh UI panel
            this.ui.showTowerInfo(
                tower, this.money,
                (k) => this._upgradeSelectedTower(k),
                () => this._sellSelectedTower()
            );
            this._updateHUD();
        }
    }

    // ─── Sell Tower ───────────────────────────────────────────────────────────

    _sellSelectedTower() {
        const tower = this.selectedTower;
        if (!tower) return;
        const sellVal = tower.getSellValue();
        this.money += sellVal;

        // Remove from tower list
        this.towers = this.towers.filter(t => t !== tower);
        // Free occupied cell
        this.occupiedCells.delete(`${tower.col}_${tower.row}`);

        this._deselectTower();
        this.ui.showMessage(`💰 Torre vendida por $${sellVal}`);
        this._updateHUD();
    }

    // ─── Tower Placement ──────────────────────────────────────────────────────

    /**
     * Returns true if (col, row) can accept a new tower.
     */
    _isCellOpen(col, row) {
        if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
        if (this.pathSystem.isCellBlocked(col, row)) return false;
        if (this.occupiedCells.has(`${col}_${row}`)) return false;
        return true;
    }

    _placeTower(col, row) {
        const type = this.selectedTowerType;
        if (!type) return;

        const cost = TOWER_DEFS[type].cost;
        if (this.money < cost) {
            this.ui.showMessage('💸 Dinero insuficiente');
            return;
        }
        if (!this._isCellOpen(col, row)) {
            this.ui.showMessage('🚫 No puedes construir aquí');
            return;
        }

        const tower = createTower(type, col, row, CELL);
        this.towers.push(tower);
        this.occupiedCells.add(`${col}_${row}`);
        this.money -= cost;

        // Deselect type (stay in placement mode for quick placement)
        // but notify if out of money
        if (this.money < TOWER_DEFS[type].cost) {
            this.selectedTowerType = null;
            this.ui.clearTowerSelection();
            this.ui.showMessage('💸 Sin fondos para más torres');
        }

        this._updateHUD();
    }

    // ─── Mouse Handling ───────────────────────────────────────────────────────

    onMouseMove(x, y) {
        const { col, row } = pixelToGrid(x, y, CELL);
        this.ghostCol = col;
        this.ghostRow = row;
        this.ghostValid = this._isCellOpen(col, row);
    }

    onClick(x, y) {
        const { col, row } = pixelToGrid(x, y, CELL);

        // If holding a tower type → place it
        if (this.selectedTowerType) {
            this._placeTower(col, row);
            return;
        }

        // Check click on a tower (select it)
        const clicked = this.towers.find(t => t.col === col && t.row === row);
        if (clicked) {
            if (this.selectedTower === clicked) {
                this._deselectTower();
            } else {
                this._selectTower(clicked);
            }
            return;
        }

        // Click on empty space: deselect tower
        this._deselectTower();
    }

    onKeyDown(key) {
        switch (key) {
            case '1': this._selectTowerType('dart'); break;
            case '2': this._selectTowerType('cannon'); break;
            case '3': this._selectTowerType('ice'); break;
            case '4': this._selectTowerType('sniper'); break;
            case '5': this._selectTowerType('laser'); break;
            case '6': this._selectTowerType('mortar'); break;
            case 'Escape':
                this.selectedTowerType = null;
                this.ui.clearTowerSelection();
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
        this.ui.updateHUD({
            money: this.money,
            lives: this.lives,
            wave: ws.waveNumber,
            enemies: this.enemies.filter(e => !e.dead).length,
            totalWaves: '∞',
        });
        this.ui.setStartWaveButton({
            waveNum: ws.nextWaveNum,
            enabled: !ws.isRunning,
            running: ws.isRunning,
            allDone: false,
        });
        this.ui.updateTowerSelector(this.selectedTowerType, this.money);

        // ── KEY FIX: Only update affordability, NOT rebuild panel every frame ──
        // showTowerInfo is called only on selection/upgrade change (in _selectTower,
        // _upgradeSelectedTower). refreshUpgradeAffordability just en/disables btns.
        if (this.selectedTower) {
            this.ui.refreshUpgradeAffordability(this.money, this.selectedTower);
        }
    }

    // ─── Update Loop ──────────────────────────────────────────────────────────

    update(dt) {
        // Wave system
        this.waveSystem.update(dt);

        // Enemies
        for (const enemy of this.enemies) {
            if (enemy.dead) continue;
            enemy.update(dt);

            // Reached end
            if (enemy.reached) {
                this.lives -= enemy.damage;
                if (this.lives < 0) this.lives = 0;
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

        // Collision detection
        Collision.check(this.projectiles, this.enemies);

        // Reward / capture for killed enemies
        for (const enemy of this.enemies) {
            if (enemy.dead && !enemy._rewarded) {
                enemy._rewarded = true;
                if (!enemy.reached && enemy.captured) {
                    this.money += enemy.reward;
                    // Capture FX
                    const fx = enemy.type === 'boss'
                        ? spawnLegendaryCaptureEffect(enemy.x, enemy.y)
                        : spawnCaptureEffect(enemy.x, enemy.y, enemy.color);
                    this.particles.push(...fx);
                    // Register in Pokédex
                    const pid = enemy.pokemonId;
                    if (this.pokedex.has(pid)) {
                        this.pokedex.get(pid).count++;
                    } else {
                        this.pokedex.set(pid, {
                            name: enemy.pokemonName,
                            type: enemy.type,
                            color: enemy.color,
                            count: 1,
                        });
                    }
                    // Toast
                    const isBoss = enemy.type === 'boss';
                    this.ui.showMessage(
                        isBoss ? `🌟 ¡${enemy.pokemonName} LEGENDARIO capturado! +$${enemy.reward}`
                            : `✅ ¡${enemy.pokemonName} capturado! +$${enemy.reward}`,
                        isBoss ? 3500 : 1200
                    );
                    this.ui.updatePokedex(this.pokedex);
                }
            }
        }

        // Particles
        for (const p of this.particles) p.update(dt);

        // Cleanup dead entities
        this.enemies = this.enemies.filter(e => !e.dead);
        this.projectiles = this.projectiles.filter(p => !p.dead);
        this.particles = this.particles.filter(p => !p.dead);

        // Wave-clear bonus: awarded once spawning ends AND no enemies remain
        if (this._pendingWaveBonus > 0 && !this.waveSystem.isRunning && this.enemies.length === 0) {
            this.money += this._pendingWaveBonus;
            this.ui.showMessage(`🎉 ¡Oleada completada! +$${this._pendingWaveBonus}`);
            this._pendingWaveBonus = 0;
        }

        // Update HUD every frame to keep counts current
        this._updateHUD();

        // ── Game Over check ─────────────────────────────────────────────────
        if (this.lives <= 0) {
            this.onGameOver(this.waveSystem.waveNumber);
            return;
        }

        // No victory condition — waves are infinite. Survive as long as possible.
    }

    // ─── Render ───────────────────────────────────────────────────────────────

    render() {
        const { ctx } = this;

        // 1. Background (pre-rendered)
        ctx.drawImage(this._bgCanvas, 0, 0);

        // 2. Grid overlay (when placing)
        if (this.selectedTowerType) {
            this._drawGrid(ctx);
        }

        // 3. Ghost tower
        if (this.selectedTowerType && this.ghostCol >= 0) {
            this._drawGhost(ctx);
        }

        // 4. Path on top of grid (always visible)
        this.pathSystem.draw(ctx, this.debug);

        // 5. Towers
        for (const tower of this.towers) tower.draw(ctx, this.debug);

        // 6. Projectiles
        for (const proj of this.projectiles) proj.draw(ctx);

        // 7. Enemies
        for (const enemy of this.enemies) enemy.draw(ctx, this.debug);

        // 8. Particles
        for (const p of this.particles) p.draw(ctx);

        // 9. Debug overlay
        if (this.debug) this._drawDebugOverlay(ctx);
    }

    _drawGrid(ctx) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 0.5;
        for (let c = 0; c < COLS; c++) {
            for (let r = 0; r < ROWS; r++) {
                ctx.strokeRect(c * CELL, r * CELL, CELL, CELL);
            }
        }
        ctx.restore();
    }

    _drawGhost(ctx) {
        const { ghostCol, ghostRow, ghostValid, selectedTowerType } = this;
        if (ghostCol < 0 || ghostCol >= COLS || ghostRow < 0 || ghostRow >= ROWS) return;

        const x = ghostCol * CELL;
        const y = ghostRow * CELL;

        ctx.save();
        ctx.fillStyle = ghostValid ? 'rgba(63,185,80,0.25)' : 'rgba(248,81,73,0.25)';
        ctx.strokeStyle = ghostValid ? 'rgba(63,185,80,0.8)' : 'rgba(248,81,73,0.8)';
        ctx.lineWidth = 1.5;
        ctx.fillRect(x, y, CELL, CELL);
        ctx.strokeRect(x, y, CELL, CELL);

        // Ghost range ring
        const def = TOWER_DEFS[selectedTowerType];
        const cx = ghostCol * CELL + CELL / 2;
        const cy = ghostRow * CELL + CELL / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, def.range, 0, Math.PI * 2);
        ctx.strokeStyle = ghostValid ? 'rgba(63,185,80,0.4)' : 'rgba(248,81,73,0.3)';
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Emoji ghost
        ctx.globalAlpha = 0.7;
        ctx.font = `${Math.floor(CELL * 0.55)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.fillText(def.emoji, cx, cy + 1);

        ctx.restore();
    }

    _drawDebugOverlay(ctx) {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(4, 4, 200, 80);
        ctx.fillStyle = '#0f0';
        ctx.font = '11px monospace';
        ctx.fillText(`Enemies:     ${this.enemies.length}`, 10, 20);
        ctx.fillText(`Projectiles: ${this.projectiles.length}`, 10, 35);
        ctx.fillText(`Particles:   ${this.particles.length}`, 10, 50);
        ctx.fillText(`Towers:      ${this.towers.length}`, 10, 65);
        ctx.restore();
    }

    reset() {
        this.money = START_MONEY;
        this.lives = START_LIVES;
        this.towers = [];
        this.enemies = [];
        this.projectiles = [];
        this.particles = [];
        this._pendingWaveBonus = 0;
        this.occupiedCells.clear();
        this.waveSystem.reset();
        this.selectedTowerType = null;
        this.selectedTower = null;
        this.ui.clearTowerSelection();
        this.ui.hideTowerInfo();
        this._deselectTower();
        this._buildBackground();
        this._updateHUD();
    }
}
