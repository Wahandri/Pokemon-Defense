// ─── MysteryGiftItem ────────────────────────────────────────────────────────────
// A floating mystery gift that appears during gameplay.
// Click it to collect a random item from the mystery pool.

import { rollMysteryItem } from '../data/mystery_items.js';

function randomSafePos() {
    // Grass zones away from the main path
    const zones = [
        { xMin: 10,  yMin: 230, xMax: 130, yMax: 290 },
        { xMin: 200, yMin: 230, xMax: 320, yMax: 290 },
        { xMin: 400, yMin: 120, xMax: 530, yMax: 170 },
        { xMin: 595, yMin: 120, xMax: 740, yMax: 170 },
        { xMin: 790, yMin: 340, xMax: 940, yMax: 440 },
        { xMin: 10,  yMin: 360, xMax: 130, yMax: 440 },
        { xMin: 200, yMin: 120, xMax: 320, yMax: 170 },
        { xMin: 595, yMin: 340, xMax: 730, yMax: 440 },
    ];
    const zone = zones[Math.floor(Math.random() * zones.length)];
    return {
        x: zone.xMin + Math.random() * (zone.xMax - zone.xMin),
        y: zone.yMin + Math.random() * (zone.yMax - zone.yMin),
    };
}

export class MysteryGiftItem {
    constructor() {
        const pos = randomSafePos();
        this.x = pos.x;
        this.y = pos.y;
        this._baseX = pos.x;
        this._baseY = pos.y;
        this._age = Math.random() * 1000;
        this._lifeMax = 20000 + Math.random() * 8000; // 20–28 seconds
        this._life = this._lifeMax;
        this.dead = false;
        this.radius = 20;
        this._glowPhase = 0;
        this._xDir = (Math.random() > 0.5 ? 1 : -1);
        this._item = rollMysteryItem();
        this._collected = false;
    }

    get item() { return this._item; }

    update(dt) {
        if (this.dead) return;
        this._age += dt;
        this._life -= dt;
        this._glowPhase += dt * 0.003;

        // Gentle float
        this.y = this._baseY + Math.sin(this._age * 0.0022) * 12;
        this.x = this._baseX + Math.sin(this._age * 0.0009) * 22 * this._xDir;

        if (this._life <= 0) this.dead = true;
    }

    contains(px, py) {
        const dx = px - this.x, dy = py - this.y;
        return dx * dx + dy * dy <= this.radius * this.radius;
    }

    collect() {
        this._collected = true;
        this.dead = true;
    }

    draw(ctx) {
        if (this.dead) return;
        const alpha = Math.min(1, this._life / 2000);
        const pulse = 1 + Math.sin(this._glowPhase * 1.4) * 0.1;
        const glow = 10 + Math.sin(this._glowPhase) * 6;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(this.x, this.y);
        ctx.scale(pulse, pulse);

        // Outer glow ring
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + glow, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,215,0,${0.10 + Math.sin(this._glowPhase) * 0.06})`;
        ctx.fill();

        // Box body
        const size = this.radius * 1.4;
        const half = size / 2;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(-half + 3, -half + 3, size, size);

        // Box body gradient
        const grad = ctx.createLinearGradient(-half, -half, half, half);
        grad.addColorStop(0, '#e8a020');
        grad.addColorStop(0.5, '#f0c840');
        grad.addColorStop(1, '#c87820');
        ctx.fillStyle = grad;
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = glow + 4;
        ctx.fillRect(-half, -half, size, size);

        // Ribbon horizontal
        ctx.fillStyle = '#c82020';
        ctx.fillRect(-half, -4, size, 8);

        // Ribbon vertical
        ctx.fillRect(-4, -half, 8, size);

        // Bow
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#e84040';
        ctx.beginPath();
        ctx.ellipse(-8, -half - 2, 6, 4, -0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(8, -half - 2, 6, 4, 0.5, 0, Math.PI * 2);
        ctx.fill();

        // Bow center
        ctx.beginPath();
        ctx.arc(0, -half - 1, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#ff6060';
        ctx.fill();

        // Shiny highlight
        ctx.beginPath();
        ctx.arc(-half * 0.4, -half * 0.4, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fill();

        // "?" label
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', 0, 1);

        ctx.restore();
    }
}
