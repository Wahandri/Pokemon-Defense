// ─── Enemy Entity (Pokémon theme) ─────────────────────────────────────────────
// Enemies are Pokémon. Each instance picks a random Pokémon from its tier pool.
// Sprite loaded async from PokeAPI CDN; canvas fallback if unavailable.

import { ENEMY_CONFIG, calcHP, calcReward } from '../data/balance.js';
import { pickPokemon, pickBoss, getSpriteUrl, TIER_INFO } from '../data/pokemon.js';
import { ImageCache } from '../utils/ImageCache.js';

export class Enemy {
    constructor(type, pathSystem, waveNum = 1) {
        const def = ENEMY_CONFIG[type];
        if (!def) throw new Error(`Unknown enemy type: ${type}`);

        this.type = type;
        this.label = def.label;

        // Pick random Pokémon from tier
        const poke = type === 'boss' ? pickBoss(waveNum) : pickPokemon(type);
        this.pokemonId = poke.id;
        this.pokemonName = poke.name;
        this.tierInfo = TIER_INFO[type] ?? TIER_INFO.red;

        // Stats from balance.js
        this.maxHp = calcHP(type, waveNum);
        this.hp = this.maxHp;
        this.reward = calcReward(type, waveNum);
        this.baseSpeed = def.speed;
        this.speed = def.speed;
        this.damage = def.damage;
        this.color = def.color;
        this.accent = def.accent;
        this.radius = def.radius;

        // Sprite (async load)
        this._spriteUrl = getSpriteUrl(this.pokemonId);
        this._img = null;          // becomes HTMLImageElement once loaded
        this._imgFailed = false;
        ImageCache.load(this._spriteUrl).then(img => {
            this._img = img; this._imgFailed = img === null;
        });

        // Path state
        this.pathSystem = pathSystem;
        this.progress = 0;
        this.x = 0; this.y = 0;
        this.dead = false; this.reached = false; this._rewarded = false;
        this.captured = false; // true when killed (not escaped)

        // Slow state
        this._slowTimer = 0;
        this._slowAmount = 1.0;

        // Visual
        this._age = Math.random() * 1000;
        this._wobble = Math.random() * Math.PI * 2;
        this._isBoss = type === 'boss';
    }

    applySlow(amount, durationMs) {
        if (amount < this._slowAmount || this._slowTimer <= 0) {
            this._slowAmount = amount; this._slowTimer = durationMs;
        } else {
            this._slowTimer = Math.max(this._slowTimer, durationMs);
        }
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0) { this.hp = 0; this.dead = true; this.captured = true; }
    }

    update(dt) {
        if (this.dead || this.reached) return;
        this._age += dt;
        if (this._slowTimer > 0) {
            this._slowTimer -= dt;
            if (this._slowTimer <= 0) { this._slowTimer = 0; this._slowAmount = 1.0; }
        }
        this.speed = this.baseSpeed * this._slowAmount;
        this.progress += this.speed * (dt / 1000);
        if (this.progress >= this.pathSystem.totalLength) {
            this.reached = this.dead = true; return;
        }
        const pos = this.pathSystem.getPositionAt(this.progress);
        this.x = pos.x; this.y = pos.y;
    }

    draw(ctx, debug = false) {
        if (this.dead) return;
        const r = this.radius;
        const isSlowed = this._slowTimer > 0;
        const wobble = Math.sin(this._age * 0.005 + this._wobble) * (this._isBoss ? 2 : 1.2);

        ctx.save();
        ctx.translate(this.x, this.y + wobble);

        // Boss glow aura
        if (this._isBoss) {
            for (let i = 3; i >= 1; i--) {
                ctx.beginPath(); ctx.arc(0, 0, r + 4 * i, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255,120,0,${0.07 * i})`; ctx.fill();
            }
        }

        // Slow frost overlay
        if (isSlowed) {
            ctx.beginPath(); ctx.arc(0, 0, r + 6, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(165,216,255,0.18)'; ctx.fill();
        }

        // Draw Pokémon sprite or fallback
        if (this._img) {
            ctx.imageSmoothingEnabled = false;  // crisp pixel art
            const sz = r * 2.6;
            ctx.drawImage(this._img, -sz / 2, -sz / 2, sz, sz);
        } else {
            // Fallback: colored circle with Pokémon ID
            const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 1, 0, 0, r);
            g.addColorStop(0, this.accent); g.addColorStop(1, this.color);
            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fillStyle = g; ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.font = `bold ${Math.max(8, r * 0.5)}px monospace`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(`#${this.pokemonId}`, 0, 0);
        }

        // Slow ice tint
        if (isSlowed) {
            ctx.globalAlpha = 0.25; ctx.fillStyle = '#a5d8ff';
            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
        }

        ctx.restore();

        // HP bar (wider for boss)
        const bW = r * (this._isBoss ? 2.8 : 2.5);
        const bH = this._isBoss ? 6 : 4;
        const bX = this.x - bW / 2, bY = this.y - r - 14;
        const p = this.hp / this.maxHp;
        ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(bX, bY, bW, bH);
        ctx.fillStyle = p > 0.5 ? '#3fb950' : p > 0.25 ? '#e3b341' : '#f85149';
        ctx.fillRect(bX, bY, bW * p, bH);
        ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 0.5;
        ctx.strokeRect(bX, bY, bW, bH);

        // Pokémon name tag (always show for boss, hover-style otherwise)
        if (this._isBoss || this._img) {
            ctx.save();
            ctx.fillStyle = 'rgba(0,0,0,0.65)';
            ctx.font = this._isBoss ? 'bold 10px sans-serif' : '9px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const tagW = ctx.measureText(this.pokemonName).width + 8;
            ctx.fillRect(this.x - tagW / 2, bY - 13, tagW, 11);
            ctx.fillStyle = this._isBoss ? '#ffb080' : '#fff';
            ctx.fillText(this.pokemonName, this.x, bY - 7.5);
            ctx.restore();
        }
    }
}

export function createEnemy(type, pathSystem, waveNum = 1) {
    return new Enemy(type, pathSystem, waveNum);
}
