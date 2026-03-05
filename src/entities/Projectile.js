// ─── Projectile System (Pokémon theme) ────────────────────────────────────────
// All projectiles are now Pokéball variants.

import { dist } from '../utils/math.js';

// ── Shared Pokéball draw helper ───────────────────────────────────────────────
function pokeball(ctx, x, y, r, topColor = '#f04040', bottomColor = '#fff', flash = 0) {
    ctx.save(); ctx.translate(x, y);
    ctx.beginPath(); ctx.arc(0, 0, r, Math.PI, 0); ctx.fillStyle = topColor; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI); ctx.fillStyle = bottomColor; ctx.fill();
    ctx.strokeStyle = '#222'; ctx.lineWidth = r * 0.14;
    ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.30, 0, Math.PI * 2);
    ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#333'; ctx.lineWidth = r * 0.10; ctx.stroke();
    if (flash > 0) {
        ctx.beginPath(); ctx.arc(0, 0, r * 0.16, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,240,220,${flash})`; ctx.fill();
    }
    ctx.restore();
}

// ─── Base Projectile ──────────────────────────────────────────────────────────

export class Projectile {
    constructor({ x, y, damage, speed, color = '#f04040' }) {
        this.x = x; this.y = y; this.vx = 0; this.vy = 0;
        this.damage = damage; this.speed = speed; this.color = color;
        this.dead = false; this.radius = 6;
        this.isAoe = false; this.areaRadius = 0;
        this.pierceCount = 0; this._pierced = 0;
        this._hitEnemies = new Set();
    }
    onHit(enemy, allEnemies) { enemy.takeDamage(this.damage); this.dead = true; }
    update(dt) { }
    draw(ctx) { }
}

// ─── Dart → Standard Pokéball ─────────────────────────────────────────────────

export class DartProjectile extends Projectile {
    constructor({ x, y, target, damage, speed }) {
        super({ x, y, damage, speed });
        this.target = target; this.radius = 6;
        this._rot = Math.random() * Math.PI * 2;
    }
    update(dt) {
        if (this.target.dead && !this.target.reached) { this.dead = true; return; }
        const dx = this.target.x - this.x, dy = this.target.y - this.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1, s = this.speed * (dt / 1000);
        this._rot += dt * 0.015;
        if (d <= s) { this.x = this.target.x; this.y = this.target.y; return; }
        this.x += (dx / d) * s; this.y += (dy / d) * s;
    }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this._rot);
        ctx.shadowColor = '#ff4040'; ctx.shadowBlur = 5;
        pokeball(ctx, 0, 0, this.radius, '#f04040', '#fff');
        ctx.restore();
    }
}

// ─── Cannon → Heavy Pokéball (arcing AoE) ─────────────────────────────────────

export class CannonProjectile extends Projectile {
    constructor({ x, y, target, damage, speed, areaRadius }) {
        super({ x, y, damage, speed }); this.isAoe = true; this.areaRadius = areaRadius;
        this.target = target; this.radius = 9;
        this._startX = x; this._startY = y; this._progress = 0;
        this._totalDist = dist(x, y, target.x, target.y); this._arcH = 45;
        this._rot = 0;
    }
    onHit(enemy, all) {
        for (const e of all) {
            if (!e.dead && dist(this.x, this.y, e.x, e.y) <= this.areaRadius) e.takeDamage(this.damage);
        }
        this.dead = true;
    }
    update(dt) {
        const tx = this._targetLastX ?? this.target.x, ty = this._targetLastY ?? this.target.y;
        if (!this.target.dead) { this._targetLastX = this.target.x; this._targetLastY = this.target.y; }
        this._progress = Math.min(1, this._progress + (this.speed * (dt / 1000)) / Math.max(1, this._totalDist));
        const t = this._progress;
        this.x = this._startX + (tx - this._startX) * t;
        this.y = this._startY + (ty - this._startY) * t - Math.sin(t * Math.PI) * this._arcH;
        this._rot += dt * 0.01;
        if (this._progress >= 1) { this.x = tx; this.y = ty; this.dead = true; }
    }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this._rot);
        ctx.shadowColor = '#e3b341'; ctx.shadowBlur = 10;
        // Heavy ball: dark red + grey bottom (Heavy Ball style)
        pokeball(ctx, 0, 0, this.radius, '#aa0000', '#888888');
        // Area preview ring
        ctx.beginPath(); ctx.arc(this._targetLastX ?? this.x, this._targetLastY ?? this.y, this.areaRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,80,0,0.12)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
        ctx.stroke(); ctx.setLineDash([]);
        ctx.restore();
    }
}

// ─── Ice → Dive Ball (slow) ───────────────────────────────────────────────────

export class IceProjectile extends Projectile {
    constructor({ x, y, target, damage, speed, slowAmount, slowDuration }) {
        super({ x, y, damage, speed }); this.target = target;
        this.slowAmount = slowAmount; this.slowDuration = slowDuration;
        this.radius = 6; this._rot = 0;
    }
    onHit(enemy, _all) { enemy.takeDamage(this.damage); enemy.applySlow(this.slowAmount, this.slowDuration); this.dead = true; }
    update(dt) {
        if (this.target.dead && !this.target.reached) { this.dead = true; return; }
        const dx = this.target.x - this.x, dy = this.target.y - this.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1, s = this.speed * (dt / 1000);
        this._rot += dt * 0.012;
        if (d <= s) { this.x = this.target.x; this.y = this.target.y; return; }
        this.x += (dx / d) * s; this.y += (dy / d) * s;
    }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this._rot);
        ctx.shadowColor = '#a5d8ff'; ctx.shadowBlur = 8;
        pokeball(ctx, 0, 0, this.radius, '#3388ff', '#ddeeff'); // Dive Ball colors
        ctx.restore();
    }
}

// ─── Sniper → Master Ball ─────────────────────────────────────────────────────

export class SniperProjectile extends Projectile {
    constructor({ x, y, target, damage, speed }) {
        super({ x, y, damage, speed }); this.target = target; this.radius = 5;
        const dx = target.x - x, dy = target.y - y, d = Math.sqrt(dx * dx + dy * dy) || 1;
        this.vx = (dx / d) * speed; this.vy = (dy / d) * speed;
        this._trail = []; this._rot = 0;
    }
    update(dt) {
        const s = dt / 1000;
        this._trail.push({ x: this.x, y: this.y });
        if (this._trail.length > 7) this._trail.shift();
        this._rot += dt * 0.02;
        this.x += this.vx * s; this.y += this.vy * s;
        if (this.x < -50 || this.x > 1010 || this.y < -50 || this.y > 590) this.dead = true;
    }
    draw(ctx) {
        ctx.save();
        for (let i = 0; i < this._trail.length; i++) {
            const a = (i / this._trail.length) * 0.5;
            ctx.beginPath(); ctx.arc(this._trail[i].x, this._trail[i].y, this.radius * 0.6 * (i / this._trail.length), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(170,0,170,${a})`; ctx.fill();
        }
        ctx.translate(this.x, this.y); ctx.rotate(this._rot);
        ctx.shadowColor = '#cc44cc'; ctx.shadowBlur = 12;
        pokeball(ctx, 0, 0, this.radius, '#884499', '#ffffff'); // Master Ball-ish purple
        ctx.restore();
    }
}

// ─── Laser → Quick Ball (pierce) ──────────────────────────────────────────────

export class LaserProjectile extends Projectile {
    constructor({ x, y, target, damage, speed, pierceCount }) {
        super({ x, y, damage, speed }); this.target = target;
        this.pierceCount = pierceCount; this.radius = 5;
        const dx = target.x - x, dy = target.y - y, d = Math.sqrt(dx * dx + dy * dy) || 1;
        this.vx = (dx / d) * speed; this.vy = (dy / d) * speed;
        this._trail = []; this._rot = 0;
    }
    onHit(enemy, _all) {
        if (this._hitEnemies.has(enemy)) return;
        this._hitEnemies.add(enemy);
        enemy.takeDamage(this.damage);
        this._pierced++;
        if (this._pierced >= this.pierceCount) this.dead = true;
    }
    update(dt) {
        const s = dt / 1000;
        this._trail.push({ x: this.x, y: this.y });
        if (this._trail.length > 5) this._trail.shift();
        this._rot += dt * 0.025;
        this.x += this.vx * s; this.y += this.vy * s;
        if (this.x < -50 || this.x > 1010 || this.y < -50 || this.y > 590) this.dead = true;
    }
    draw(ctx) {
        ctx.save();
        for (let i = 0; i < this._trail.length; i++) {
            ctx.beginPath(); ctx.arc(this._trail[i].x, this._trail[i].y, 3 * (i / this._trail.length + 0.2), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,200,0,${0.3 * (i / this._trail.length)})`; ctx.fill();
        }
        ctx.translate(this.x, this.y); ctx.rotate(this._rot);
        ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 14;
        pokeball(ctx, 0, 0, this.radius, '#ffd700', '#222222'); // Quick Ball yellow/dark
        ctx.restore();
    }
}

// ─── Mortar → Beast Ball (huge AoE arc) ───────────────────────────────────────

export class MortarShell extends Projectile {
    constructor({ x, y, tx, ty, damage, speed, areaRadius }) {
        super({ x, y, damage, speed }); this.isAoe = true; this.areaRadius = areaRadius;
        this.radius = 11; this._startX = x; this._startY = y;
        this._tx = tx; this._ty = ty; this._progress = 0;
        this._arcH = 90; this._totalDist = Math.max(50, dist(x, y, tx, ty)); this._rot = 0;
    }
    onHit(enemy, all) {
        for (const e of all) {
            if (!e.dead && dist(this.x, this.y, e.x, e.y) <= this.areaRadius) e.takeDamage(this.damage);
        }
        this.dead = true;
    }
    update(dt) {
        this._progress = Math.min(1, this._progress + (this.speed * (dt / 1000)) / this._totalDist);
        const t = this._progress;
        this.x = this._startX + (this._tx - this._startX) * t;
        this.y = this._startY + (this._ty - this._startY) * t - Math.sin(t * Math.PI) * this._arcH;
        this._rot += dt * 0.006;
        if (this._progress >= 1) { this.x = this._tx; this.y = this._ty; this.dead = true; }
    }
    draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this._rot);
        ctx.shadowColor = '#8888ff'; ctx.shadowBlur = 14;
        pokeball(ctx, 0, 0, this.radius, '#334466', '#008888'); // Beast Ball teal/dark
        // Target ring
        ctx.beginPath(); ctx.arc(this._tx - this.x, this._ty - this.y, this.areaRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(80,80,255,0.12)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
        ctx.restore();
    }
}
