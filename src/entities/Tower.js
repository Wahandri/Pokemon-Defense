// ─── Tower Entity (Team Rocket theme) ─────────────────────────────────────────
// All 6 trainers: Grunt♀, Grunt♂, Jessie, James, Meowth, Giovanni
// Each _drawTurret() renders a stylised TR trainer using Canvas 2D.

import { TOWER_CONFIG, applyMod } from '../data/balance.js';
import { dist } from '../utils/math.js';
import {
    DartProjectile, CannonProjectile, IceProjectile,
    SniperProjectile, LaserProjectile, MortarShell
} from './Projectile.js';

export const TOWER_DEFS = TOWER_CONFIG;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function drawR(ctx, x, y, size, fill = '#cc0000') {
    // Classic "R" letterform
    ctx.font = `bold ${size}px monospace`;
    ctx.fillStyle = fill;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('R', x, y);
}

// ─── Base Tower ───────────────────────────────────────────────────────────────

export class Tower {
    constructor(type, col, row, cellSize) {
        const def = TOWER_CONFIG[type];
        if (!def) throw new Error(`Unknown tower type: ${type}`);
        this.type = type; this.label = def.label; this.emoji = def.emoji;
        this.col = col; this.row = row; this.cellSize = cellSize;
        this.x = col * cellSize + cellSize / 2;
        this.y = row * cellSize + cellSize / 2;
        // Stats
        this.range = def.range;
        this.fireRate = def.fireRate;
        this.damage = def.damage;
        this.projSpeed = def.projSpeed;
        this.areaRadius = def.areaRadius ?? 0;
        this.pierceCount = def.pierceCount ?? 1;
        this.slowAmount = def.slowAmount ?? 0.38;
        this.slowDuration = def.slowDuration ?? 2200;
        // Visual
        this.color = def.color; this.glowColor = def.glowColor; this.bgColor = def.bgColor;
        // Upgrades
        this.upgradeLevel = 0; this._upgradeDefs = def.upgrades;
        this.baseCost = def.cost; this.totalCost = def.cost;
        // Firing
        this._fireCooldown = 0; this._fireInterval = 1000 / this.fireRate;
        this.angle = 0; this.selected = false; this.dead = false; this._shootAnim = 0;
    }

    getAvailableUpgrades() {
        if (this.upgradeLevel >= this._upgradeDefs.length) return [];
        return this._upgradeDefs[this.upgradeLevel];
    }

    previewUpgrade(opt) {
        const out = {};
        for (const [s, m] of Object.entries(opt.mods)) out[s] = applyMod(this[s] ?? 0, m);
        return out;
    }

    applyUpgrade(key) {
        const upg = this.getAvailableUpgrades().find(u => u.key === key);
        if (!upg) return { ok: false, cost: 0 };
        for (const [s, m] of Object.entries(upg.mods)) this[s] = applyMod(this[s] ?? 0, m);
        this.totalCost += upg.cost; this.upgradeLevel++;
        this._fireInterval = 1000 / this.fireRate;
        return { ok: true, cost: upg.cost };
    }

    getSellValue() { return Math.floor(this.totalCost * 0.6); }

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

    update(dt, enemies, addProj) {
        this._fireCooldown -= dt;
        if (this._shootAnim > 0) this._shootAnim -= dt;
        if (this._fireCooldown <= 0) {
            this._shoot(enemies, addProj);
            this._fireCooldown = this._fireInterval;
        }
    }

    _shoot(enemies, addProj) { }

    draw(ctx, debug = false) {
        const r = this.cellSize / 2 - 2;
        const fa = Math.max(0, this._shootAnim / 80);
        ctx.save(); ctx.translate(this.x, this.y);

        // Range ring
        if (this.selected || debug) {
            ctx.beginPath(); ctx.arc(0, 0, this.range, 0, Math.PI * 2);
            ctx.strokeStyle = debug ? 'rgba(255,80,80,0.5)' : `rgba(${this._rgb()},0.22)`;
            ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
            ctx.fillStyle = `rgba(${this._rgb()},0.05)`; ctx.fill();
        }
        if (this.selected) {
            ctx.beginPath(); ctx.arc(0, 0, r + 5, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2; ctx.stroke();
        }

        // Dark TR base platform
        const bg = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 1, 0, 0, r);
        bg.addColorStop(0, '#2a0000'); bg.addColorStop(0.7, '#1a0000'); bg.addColorStop(1, '#0d0000');
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = bg; ctx.fill();
        ctx.strokeStyle = '#440000'; ctx.lineWidth = 2; ctx.stroke();
        // TR red border ring
        ctx.beginPath(); ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(204,0,0,${0.3 + fa * 0.5})`; ctx.lineWidth = 1.5; ctx.stroke();

        // Shoot glow
        if (fa > 0) {
            ctx.shadowColor = this.glowColor; ctx.shadowBlur = 18 * fa;
            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${this._rgb()},${fa * 0.9})`; ctx.lineWidth = 3 * fa; ctx.stroke();
            ctx.shadowBlur = 0;
        }

        this._drawTurret(ctx, r, fa);

        // Upgrade pips (gold stars)
        ctx.shadowBlur = 0;
        for (let i = 0; i < this.upgradeLevel; i++) {
            ctx.shadowColor = '#e3b341'; ctx.shadowBlur = 4;
            ctx.beginPath(); ctx.arc(-5 + i * 6, r - 4, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = '#e3b341'; ctx.fill();
        }
        ctx.restore();
    }

    _rgb() {
        const c = this.color.replace('#', '');
        return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)].join(',');
    }

    _drawTurret(ctx, r, flash) { }
}

// ─── Grunt ♀ (dart) ───────────────────────────────────────────────────────────

export class DartTower extends Tower {
    constructor(col, row, cell) { super('dart', col, row, cell); }
    _shoot(enemies, addProj) {
        const t = this._findTarget(enemies); if (!t) return;
        this.angle = Math.atan2(t.y - this.y, t.x - this.x); this._shootAnim = 80;
        addProj(new DartProjectile({ x: this.x, y: this.y, target: t, damage: this.damage, speed: this.projSpeed }));
    }
    _drawTurret(ctx, r, flash) {
        ctx.save(); ctx.rotate(this.angle);
        // Body: dark uniform + R logo
        const g = ctx.createRadialGradient(-2, -2, 1, 0, 0, r * 0.5);
        g.addColorStop(0, '#330000'); g.addColorStop(1, '#1a0000');
        ctx.beginPath(); ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = '#cc0000'; ctx.lineWidth = 1.5; ctx.stroke();
        drawR(ctx, 0, 0, r * 0.45, '#cc0000');
        // Arm extending (barrel direction)
        ctx.fillStyle = flash > 0 ? `rgba(255,100,100,${flash})` : '#880000';
        ctx.shadowColor = '#cc0000'; ctx.shadowBlur = flash * 10;
        ctx.beginPath(); ctx.roundRect(r * 0.45, -r * 0.12, r * 0.65, r * 0.24, 2); ctx.fill();
        // Pokéball at end of arm
        _drawPokeball(ctx, r * 1.1, 0, r * 0.2, flash);
        ctx.restore();
    }
}

// ─── Grunt ♂ (cannon) ─────────────────────────────────────────────────────────

export class CannonTower extends Tower {
    constructor(col, row, cell) { super('cannon', col, row, cell); this._recoil = 0; }
    update(dt, enemies, addProj) { if (this._recoil > 0) this._recoil = Math.max(0, this._recoil - dt * 0.005); super.update(dt, enemies, addProj); }
    _shoot(enemies, addProj) {
        const t = this._findTarget(enemies); if (!t) return;
        this.angle = Math.atan2(t.y - this.y, t.x - this.x); this._shootAnim = 120; this._recoil = 1;
        addProj(new CannonProjectile({ x: this.x, y: this.y, target: t, damage: this.damage, speed: this.projSpeed, areaRadius: this.areaRadius }));
    }
    _drawTurret(ctx, r, flash) {
        ctx.save(); ctx.rotate(this.angle);
        const g = ctx.createRadialGradient(-2, -2, 1, 0, 0, r * 0.55);
        g.addColorStop(0, '#441100'); g.addColorStop(1, '#220800');
        ctx.beginPath(); ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = '#cc3300'; ctx.lineWidth = 2; ctx.stroke();
        drawR(ctx, 0, 0, r * 0.5, '#ff4400');
        const off = -this._recoil * 8, bL = r * 1.15 + off, bW = r * 0.42;
        ctx.fillStyle = '#1a0800';
        ctx.beginPath(); ctx.roundRect(off, -bW / 2, bL, bW, 3); ctx.fill();
        ctx.strokeStyle = '#cc3300'; ctx.lineWidth = 1.5; ctx.strokeRect(off, -bW / 2, bL, bW);
        _drawPokeball(ctx, bL + off, 0, bW * 0.55, flash);
        ctx.restore();
    }
}

// ─── Jessie (ice) ─────────────────────────────────────────────────────────────

export class IceTower extends Tower {
    constructor(col, row, cell) { super('ice', col, row, cell); this._hairAngle = 0; }
    update(dt, enemies, addProj) { this._hairAngle += dt * 0.0012; super.update(dt, enemies, addProj); }
    _shoot(enemies, addProj) {
        const t = this._findTarget(enemies); if (!t) return;
        this.angle = Math.atan2(t.y - this.y, t.x - this.x); this._shootAnim = 80;
        addProj(new IceProjectile({ x: this.x, y: this.y, target: t, damage: this.damage, speed: this.projSpeed, slowAmount: this.slowAmount, slowDuration: this.slowDuration }));
    }
    _drawTurret(ctx, r, flash) {
        ctx.save();
        // Jessie: white uniform, tall magenta hair
        const g = ctx.createRadialGradient(0, -r * 0.1, 1, 0, 0, r * 0.5);
        g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#d0d0e0');
        ctx.beginPath(); ctx.arc(0, r * 0.1, r * 0.45, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = '#880044'; ctx.lineWidth = 1.5; ctx.stroke();
        drawR(ctx, 0, r * 0.1, r * 0.38, '#cc0000');
        // Tall magenta hair (iconic updo)
        ctx.save(); ctx.rotate(Math.sin(this._hairAngle) * 0.08);
        ctx.fillStyle = '#cc44cc';
        ctx.beginPath();
        ctx.ellipse(0, -r * 0.6, r * 0.18, r * 0.5, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.strokeStyle = '#880088'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = '#dd66dd';
        ctx.beginPath(); ctx.ellipse(0, -r * 0.95, r * 0.12, r * 0.2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        // Ice ball
        if (flash > 0) {
            ctx.shadowColor = '#a5d8ff'; ctx.shadowBlur = 18 * flash;
            _drawPokeballIce(ctx, Math.cos(this.angle) * r * 0.8, Math.sin(this.angle) * r * 0.8, r * 0.24, flash);
        }
        ctx.restore();
    }
}

// ─── James (sniper) ───────────────────────────────────────────────────────────

export class SniperTower extends Tower {
    constructor(col, row, cell) { super('sniper', col, row, cell); }
    _shoot(enemies, addProj) {
        const t = this._findTarget(enemies); if (!t) return;
        this.angle = Math.atan2(t.y - this.y, t.x - this.x); this._shootAnim = 100;
        addProj(new SniperProjectile({ x: this.x, y: this.y, target: t, damage: this.damage, speed: this.projSpeed }));
    }
    _drawTurret(ctx, r, flash) {
        ctx.save(); ctx.rotate(this.angle);
        // James: white uniform, blue wavy hair
        const g = ctx.createRadialGradient(0, 0, 1, 0, 0, r * 0.48);
        g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#d8e0f0');
        ctx.beginPath(); ctx.arc(0, 0, r * 0.48, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = '#4477cc'; ctx.lineWidth = 2; ctx.stroke();
        // Blue hair
        ctx.fillStyle = '#5588ff';
        ctx.beginPath(); ctx.arc(-r * 0.05, -r * 0.55, r * 0.32, Math.PI, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(-r * 0.2, -r * 0.52, r * 0.15, Math.PI, Math.PI * 2); ctx.fill();
        drawR(ctx, 0, 0, r * 0.4, '#cc0000');
        // Long barrel
        const bL = r * 1.6, bW = r * 0.18;
        ctx.fillStyle = '#223355';
        ctx.beginPath(); ctx.roundRect(r * 0.4, -bW / 2, bL, bW, 2); ctx.fill();
        // Scope
        ctx.beginPath(); ctx.arc(r * 0.95, 0, r * 0.17, 0, Math.PI * 2);
        ctx.fillStyle = '#c8dcff'; ctx.fill(); ctx.strokeStyle = '#4477cc'; ctx.lineWidth = 1.5; ctx.stroke();
        if (flash > 0) {
            ctx.shadowColor = '#6ab0ff'; ctx.shadowBlur = 20 * flash;
            _drawPokeball(ctx, bL + r * 0.4, 0, r * 0.22, flash);
        }
        ctx.restore();
    }
}

// ─── Meowth (laser) ───────────────────────────────────────────────────────────

export class LaserTower extends Tower {
    constructor(col, row, cell) { super('laser', col, row, cell); this._coinPulse = 0; }
    update(dt, enemies, addProj) { this._coinPulse = (this._coinPulse + dt * 0.004) % Math.PI; super.update(dt, enemies, addProj); }
    _shoot(enemies, addProj) {
        const t = this._findTarget(enemies); if (!t) return;
        this.angle = Math.atan2(t.y - this.y, t.x - this.x); this._shootAnim = 50;
        addProj(new LaserProjectile({ x: this.x, y: this.y, target: t, damage: this.damage, speed: this.projSpeed, pierceCount: this.pierceCount }));
    }
    _drawTurret(ctx, r, flash) {
        ctx.save();
        // Meowth: cream body, cat ears, gold coin
        const g = ctx.createRadialGradient(-r * 0.1, -r * 0.1, 1, 0, 0, r * 0.5);
        g.addColorStop(0, '#fff8d0'); g.addColorStop(1, '#c8a060');
        ctx.beginPath(); ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = '#a08040'; ctx.lineWidth = 1.5; ctx.stroke();
        // Cat ears
        for (const sx of [-1, 1]) {
            ctx.fillStyle = '#c8a060';
            ctx.beginPath(); ctx.moveTo(sx * r * 0.2, -r * 0.45); ctx.lineTo(sx * r * 0.42, -r * 0.8); ctx.lineTo(sx * r * 0.08, -r * 0.7); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#ffaaaa'; ctx.globalAlpha = 0.6;
            ctx.beginPath(); ctx.moveTo(sx * r * 0.22, -r * 0.50); ctx.lineTo(sx * r * 0.37, -r * 0.73); ctx.lineTo(sx * r * 0.12, -r * 0.66); ctx.closePath(); ctx.fill();
            ctx.globalAlpha = 1;
        }
        // Gold coin
        const coinR = r * 0.2 * (1 + Math.sin(this._coinPulse) * 0.15);
        ctx.beginPath(); ctx.arc(0, -r * 0.05, coinR, 0, Math.PI * 2);
        ctx.fillStyle = '#ffd700'; ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 6 + flash * 12; ctx.fill();
        ctx.strokeStyle = '#c8a000'; ctx.lineWidth = 1.5; ctx.stroke();
        // Pay Day claw direction
        ctx.save(); ctx.rotate(this.angle);
        ctx.strokeStyle = flash > 0 ? `rgba(255,200,0,${flash * 0.9})` : 'rgba(200,160,64,0.6)';
        ctx.lineWidth = 2; ctx.shadowColor = '#ffd700'; ctx.shadowBlur = flash * 10;
        for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(r * 0.4, i * r * 0.15); ctx.lineTo(r * 1.1, i * r * 0.2); ctx.stroke(); }
        ctx.restore();
        ctx.restore();
    }
}

// ─── Giovanni (mortar) ────────────────────────────────────────────────────────

export class MortarTower extends Tower {
    constructor(col, row, cell) { super('mortar', col, row, cell); this._bobAngle = 0; }
    update(dt, enemies, addProj) { this._bobAngle += dt * 0.0008; super.update(dt, enemies, addProj); }
    _shoot(enemies, addProj) {
        const t = this._findTarget(enemies); if (!t) return;
        this._shootAnim = 200;
        addProj(new MortarShell({ x: this.x, y: this.y, tx: t.x, ty: t.y, damage: this.damage, speed: this.projSpeed, areaRadius: this.areaRadius }));
    }
    _drawTurret(ctx, r, flash) {
        ctx.save();
        // Giovanni: dark business suit
        const g = ctx.createRadialGradient(-2, -2, 1, 0, 0, r * 0.55);
        g.addColorStop(0, '#444444'); g.addColorStop(1, '#111111');
        ctx.beginPath(); ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = '#888888'; ctx.lineWidth = 2; ctx.stroke();
        drawR(ctx, 0, 0, r * 0.5, '#cc0000');
        // Persian (cat head) silhouette
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(-r * 0.2, -r * 0.4, r * 0.22, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#cccccc'; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = '#cc0000';
        ctx.beginPath(); ctx.arc(-r * 0.15, -r * 0.4, r * 0.07, 0, Math.PI * 2); ctx.fill();
        // Heavy mortar tube (upward angle)
        ctx.save(); ctx.rotate(this.angle - Math.PI / 4 + Math.sin(this._bobAngle) * 0.05);
        const bW = r * 0.5, bL = r * 0.8;
        ctx.fillStyle = '#222';
        ctx.beginPath(); ctx.roundRect(0, -bW / 2, bL, bW, 4); ctx.fill();
        ctx.strokeStyle = '#666'; ctx.lineWidth = 2; ctx.strokeRect(0, -bW / 2, bL, bW);
        if (flash > 0) { ctx.shadowColor = '#ff8844'; ctx.shadowBlur = 28 * flash; ctx.fillStyle = `rgba(255,140,60,${flash})`; ctx.beginPath(); ctx.arc(bL, 0, bW * 0.8, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
        ctx.restore();
    }
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function _drawPokeball(ctx, x, y, r, flash = 0) {
    ctx.save(); ctx.translate(x, y);
    // Top red half
    ctx.beginPath(); ctx.arc(0, 0, r, Math.PI, 0);
    ctx.fillStyle = flash > 0 ? `rgba(255,${Math.floor(100 - flash * 80)},${Math.floor(100 - flash * 80)},1)` : '#f04040';
    ctx.fill();
    // Bottom white half
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI);
    ctx.fillStyle = '#ffffff'; ctx.fill();
    // Stripe
    ctx.strokeStyle = '#222'; ctx.lineWidth = r * 0.15;
    ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.stroke();
    // Center button
    ctx.beginPath(); ctx.arc(0, 0, r * 0.32, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.strokeStyle = '#222'; ctx.lineWidth = r * 0.10; ctx.stroke();
    if (flash > 0) {
        ctx.beginPath(); ctx.arc(0, 0, r * 0.18, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,220,200,${flash})`; ctx.fill();
    }
    ctx.restore();
}

function _drawPokeballIce(ctx, x, y, r, flash = 0) {
    ctx.save(); ctx.translate(x, y);
    ctx.beginPath(); ctx.arc(0, 0, r, Math.PI, 0);
    ctx.fillStyle = '#80c8ff'; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI);
    ctx.fillStyle = '#e8f8ff'; ctx.fill();
    ctx.strokeStyle = '#4488cc'; ctx.lineWidth = r * 0.15;
    ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.32, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#4488cc'; ctx.lineWidth = r * 0.10; ctx.stroke();
    ctx.restore();
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createTower(type, col, row, cellSize) {
    switch (type) {
        case 'dart': return new DartTower(col, row, cellSize);
        case 'cannon': return new CannonTower(col, row, cellSize);
        case 'ice': return new IceTower(col, row, cellSize);
        case 'sniper': return new SniperTower(col, row, cellSize);
        case 'laser': return new LaserTower(col, row, cellSize);
        case 'mortar': return new MortarTower(col, row, cellSize);
        default: throw new Error(`Unknown tower type: ${type}`);
    }
}
