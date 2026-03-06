// ─── Enemy Entity (Pokémon, Gen 1 only) ───────────────────────────────────────
// Enemies are wild Pokémon. HP → 0 makes them WEAKENED (capturable), not dead.
// They die only when: captured by pokéball OR they reach the end (escape).

import { ENEMY_CONFIG, calcHP } from '../data/balance.js';
import { pickPokemon, getPokemonType, getSpriteUrl, TIER_INFO } from '../data/pokemon.js';
import { ImageCache } from '../utils/ImageCache.js';

export class Enemy {
    constructor(type, pathSystem, waveNum = 1, forcePokemon = null) {
        const def = ENEMY_CONFIG[type];
        if (!def) throw new Error(`Unknown enemy type: ${type}`);

        this.type = type;
        this.label = def.label;

        // Pick Pokémon from tier (or use forced pick for tutorial)
        const poke = forcePokemon ?? pickPokemon(type);
        this.pokemonId = poke.id;
        this.pokemonName = poke.name;
        this.pokemonType = getPokemonType(poke.id);
        this.tierInfo = TIER_INFO[type] ?? TIER_INFO.red;

        // Stats from balance.js
        this.maxHp = calcHP(type, waveNum);
        this.hp = this.maxHp;
        this.baseSpeed = def.speed;
        this.speed = def.speed;
        this.color = def.color;
        this.accent = def.accent;
        this.radius = def.radius;

        // Sprite (async load)
        this._spriteUrl = getSpriteUrl(this.pokemonId);
        this._img = null;
        this._imgFailed = false;
        ImageCache.load(this._spriteUrl).then(img => {
            this._img = img; this._imgFailed = img === null;
        });

        // Path state
        this.pathSystem = pathSystem;
        this.progress = 0;
        this.x = 0; this.y = 0;
        this.dead = false;       // truly removed from game
        this.reached = false;    // reached the end of path (escaped)
        this._rewarded = false;
        this.captured = false;   // captured by pokéball

        // Weakened state: HP hit 0 but not yet captured/escaped
        this.weakened = false;  // HP = 0, capturable
        this._weakenedTime = 0;  // ms since weakened
        this._weakenedCounted = false; // for per-round perfect tracking

        // Slow state
        this._slowTimer = 0;
        this._slowAmount = 1.0;

        // Visual
        this._age = Math.random() * 1000;
        this._wobble = Math.random() * Math.PI * 2;

        // Which tower last hit us (for XP attribution)
        this.lastAttacker = null;

        // Status effects: Map<type, {end, ...opts}>
        this.statuses = {};
    }

    // ── Status helpers ───────────────────────────────────────────────────────
    hasStatus(type) {
        const s = this.statuses[type];
        return s != null && Date.now() < s.end;
    }
    getStatus(type) { return this.hasStatus(type) ? this.statuses[type] : null; }
    clearExpiredStatuses() {
        const now = Date.now();
        for (const key of Object.keys(this.statuses)) {
            if (this.statuses[key].end <= now) delete this.statuses[key];
        }
    }

    applySlow(amount, durationMs) {
        if (amount < this._slowAmount || this._slowTimer <= 0) {
            this._slowAmount = amount; this._slowTimer = durationMs;
        } else {
            this._slowTimer = Math.max(this._slowTimer, durationMs);
        }
    }

    takeDamage(amount, attacker = null) {
        if (this.weakened || this.dead) return;
        // Armor shred: take more damage
        const shred = this.getStatus?.('armor_shred');
        if (shred) amount *= (shred.mult ?? 1.5);
        this.hp -= amount;
        if (attacker) this.lastAttacker = attacker;
        if (this.hp <= 0) {
            this.hp = 0;
            this.weakened = true;  // NOT dead yet — capturable
        }
    }

    /** Called when pokéball lands on this enemy */
    capture() {
        if (!this.weakened || this.dead) return false;
        this.captured = true;
        this.dead = true;
        return true;
    }

    update(dt) {
        if (this.dead) return;
        this._age += dt;
        this.clearExpiredStatuses();
        const now = Date.now();
        const dtS = dt / 1000;

        // Burn DoT
        const burn = this.getStatus('burn');
        if (burn && !this.weakened) {
            burn._lastTick = (burn._lastTick ?? 0) + dt;
            if (burn._lastTick >= 500) { burn._lastTick = 0; this.takeDamage(burn.dps * 0.5, this.lastAttacker); }
        }
        // Poison DoT (stacking)
        const poison = this.getStatus('poison');
        if (poison && !this.weakened) {
            poison._lastTick = (poison._lastTick ?? 0) + dt;
            if (poison._lastTick >= 500) { poison._lastTick = 0; this.takeDamage(poison.dps * 0.5 * (poison.stacks ?? 1), this.lastAttacker); }
        }

        if (this.weakened) {
            this._weakenedTime += dt;
            const weakSpeed = this.baseSpeed * 0.8;
            // Frozen/stunned/rooted stop even weakened movement
            if (!this.hasStatus('freeze') && !this.hasStatus('stun') && !this.hasStatus('root')) {
                this.progress += weakSpeed * dtS;
            }
        } else {
            // Freeze / stun / root: no movement
            if (this.hasStatus('freeze') || this.hasStatus('stun') || this.hasStatus('root')) {
                // No movement, but still age
            } else {
                // Slow / confuse
                const slow = this.getStatus('slow') ?? this.getStatus('confuse');
                const slowFactor = slow ? (slow.factor ?? 0.4) : 1.0;
                // Legacy _slowTimer still applies
                const legacySlow = this._slowTimer > 0 ? this._slowAmount : 1.0;
                if (this._slowTimer > 0) { this._slowTimer -= dt; if (this._slowTimer <= 0) this._slowAmount = 1.0; }

                const speedFactor = Math.min(slowFactor, legacySlow);
                this.speed = this.baseSpeed * speedFactor;
                this.progress += this.speed * dtS;
            }
        }

        if (this.progress >= this.pathSystem.totalLength) {
            this.reached = true;
            this.dead = true;
            return;
        }
        const pos = this.pathSystem.getPositionAt(this.progress);
        this.x = pos.x; this.y = pos.y;
    }

    draw(ctx, debug = false) {
        if (this.dead) return;
        const r = this.radius;
        const isSlowed = this._slowTimer > 0;
        const wobble = Math.sin(this._age * 0.005 + this._wobble) * 1.2;

        ctx.save();
        ctx.translate(this.x, this.y + wobble);

        // ── Weakened aura: big flashing halo + pokéball icon ──────────────────
        if (this.weakened) {
            const t = this._weakenedTime;
            // Fast pulse (6Hz)
            const pulse = 0.5 + 0.5 * Math.sin(t * 0.012);
            // Outer glow ring
            ctx.beginPath();
            ctx.arc(0, 0, r + 14 + pulse * 8, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,220,0,${0.12 + pulse * 0.18})`;
            ctx.fill();
            // Inner sharp ring
            ctx.beginPath();
            ctx.arc(0, 0, r + 5, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255,200,0,${0.7 + pulse * 0.3})`;
            ctx.lineWidth = 2.5;
            ctx.stroke();
            // Second outer ring (alternating)
            const pulse2 = 0.5 + 0.5 * Math.sin(t * 0.012 + Math.PI);
            ctx.beginPath();
            ctx.arc(0, 0, r + 10 + pulse2 * 5, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255,100,0,${0.3 + pulse2 * 0.4})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        // Slow frost overlay
        if (isSlowed && !this.weakened) {
            ctx.beginPath(); ctx.arc(0, 0, r + 6, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(165,216,255,0.18)'; ctx.fill();
        }

        // Draw Pokémon sprite (no background circle, just transparent PNG)
        if (this._img) {
            ctx.imageSmoothingEnabled = false;
            const sz = r * 3.5;
            if (this.weakened) {
                ctx.filter = 'grayscale(30%) brightness(1.3)';
            }
            ctx.drawImage(this._img, -sz / 2, -sz / 2, sz, sz);
            ctx.filter = 'none';
        } else {
            // Fallback: colored circle only if no sprite
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
        if (isSlowed && !this.weakened) {
            ctx.globalAlpha = 0.25; ctx.fillStyle = '#a5d8ff';
            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1;
        }

        ctx.restore();

        // HP bar
        const bW = r * 2.5;
        const bH = 4;
        const bX = this.x - bW / 2, bY = this.y - r - 16;
        const p = this.hp / this.maxHp;
        ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(bX, bY, bW, bH);
        if (!this.weakened) {
            ctx.fillStyle = p > 0.5 ? '#3fb950' : p > 0.25 ? '#e3b341' : '#f85149';
            ctx.fillRect(bX, bY, bW * p, bH);
        }
        ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 0.5;
        ctx.strokeRect(bX, bY, bW, bH);

        // ── Capturable badge (ATRÁPALO!) ──────────────────────────────────────
        if (this.weakened) {
            const pulse = 0.5 + 0.5 * Math.sin(this._weakenedTime * 0.012);
            const badgeY = this.y - r * 3.5 / 2 - 18;
            // Pokéball icon above
            this._drawPokeballIcon(ctx, this.x, badgeY - 6, 8 + pulse * 3);
            // Text
            ctx.save();
            ctx.font = `bold ${11 + pulse * 2}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.lineWidth = 3.5;
            ctx.strokeStyle = 'rgba(0,0,0,0.9)';
            ctx.fillStyle = `hsl(${45 + pulse * 20}, 100%, ${60 + pulse * 15}%)`;
            const label = '⚡ ATRÁPALO!';
            ctx.strokeText(label, this.x, badgeY + 10);
            ctx.fillText(label, this.x, badgeY + 10);
            ctx.restore();
        }
    }

    /** Tiny inline pokéball icon */
    _drawPokeballIcon(ctx, x, y, r) {
        ctx.save();
        ctx.translate(x, y);
        ctx.beginPath(); ctx.arc(0, 0, r, Math.PI, 0); ctx.fillStyle = '#f04040'; ctx.fill();
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI); ctx.fillStyle = '#fff'; ctx.fill();
        ctx.strokeStyle = '#111'; ctx.lineWidth = r * 0.15;
        ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
        ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
        ctx.restore();
    }
}

export function createEnemy(type, pathSystem, waveNum = 1, forcePokemon = null) {
    return new Enemy(type, pathSystem, waveNum, forcePokemon);
}
