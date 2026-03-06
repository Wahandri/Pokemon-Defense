// ─── RareCandyItem ─────────────────────────────────────────────────────────────
// A floating collectible that appears on the grass area of the map.
// Click it to collect a Rare Candy (+1 rareCandy).

import { CANVAS_W, CANVAS_H } from '../utils/constants.js';

const SAFE_ZONES = [
    // Avoid path (approximate bounding boxes)
    // Canvas: 960×540. Path is roughly within x:0-960, y:60-500.
    // We spawn in the grassy corners / wider areas away from common path tiles.
];

function randomSafePos() {
    // Pick from safe-ish green areas (avoid path centres)
    const zones = [
        { xMin: 10, yMin: 230, xMax: 130, yMax: 290 },
        { xMin: 200, yMin: 230, xMax: 320, yMax: 290 },
        { xMin: 400, yMin: 120, xMax: 530, yMax: 170 },
        { xMin: 595, yMin: 120, xMax: 740, yMax: 170 },
        { xMin: 790, yMin: 340, xMax: 940, yMax: 440 },
        { xMin: 10, yMin: 360, xMax: 130, yMax: 440 },
        { xMin: 200, yMin: 120, xMax: 320, yMax: 170 },
        { xMin: 595, yMin: 340, xMax: 730, yMax: 440 },
    ];
    const zone = zones[Math.floor(Math.random() * zones.length)];
    return {
        x: zone.xMin + Math.random() * (zone.xMax - zone.xMin),
        y: zone.yMin + Math.random() * (zone.yMax - zone.yMin),
    };
}

export class RareCandyItem {
    constructor() {
        const pos = randomSafePos();
        this.x = pos.x;
        this.y = pos.y;
        this._baseX = pos.x;
        this._baseY = pos.y;
        this._age = Math.random() * 1000;     // stagger phase
        this._lifeMax = 18000 + Math.random() * 8000; // 18-26 seconds
        this._life = this._lifeMax;
        this.dead = false;
        this.radius = 18;                       // click hit radius
        this._glowPhase = 0;
        this._xDir = (Math.random() > 0.5 ? 1 : -1);
    }

    update(dt) {
        if (this.dead) return;
        this._age += dt;
        this._life -= dt;
        this._glowPhase += dt * 0.004;

        // Gentle float: vertical sine + horizontal zig-zag
        this.y = this._baseY + Math.sin(this._age * 0.0025) * 14;
        this.x = this._baseX + Math.sin(this._age * 0.001) * 28 * this._xDir;

        // Fade out in last 2s
        if (this._life <= 0) this.dead = true;
    }

    /** Returns true if (px, py) is within click radius */
    contains(px, py) {
        const dx = px - this.x, dy = py - this.y;
        return dx * dx + dy * dy <= this.radius * this.radius;
    }

    draw(ctx) {
        if (this.dead) return;
        const alpha = Math.min(1, this._life / 2000); // fade out last 2s
        const glow = 8 + Math.sin(this._glowPhase) * 6;
        const scale = 1 + Math.sin(this._glowPhase * 1.3) * 0.08;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(this.x, this.y);
        ctx.scale(scale, scale);

        // Soft purple glow ring
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + glow, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(167,113,247,${0.12 + Math.sin(this._glowPhase) * 0.08})`;
        ctx.fill();

        // Candy body: purple gradient circle
        const grad = ctx.createRadialGradient(-4, -4, 2, 0, 0, this.radius);
        grad.addColorStop(0, '#d4b0ff');
        grad.addColorStop(0.5, '#a371f7');
        grad.addColorStop(1, '#7B2FBE');
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.shadowColor = '#a371f7';
        ctx.shadowBlur = glow + 4;
        ctx.fill();
        ctx.strokeStyle = '#d4b0ff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Shiny highlight
        ctx.beginPath();
        ctx.arc(-5, -5, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.shadowBlur = 0;
        ctx.fill();

        // Candy stem
        ctx.strokeStyle = '#d4b0ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.radius * 0.6, this.radius * 0.6);
        ctx.lineTo(this.radius * 1.2, this.radius * 1.2);
        ctx.stroke();

        // Label
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('RC', 0, 0);

        ctx.restore();
    }
}
