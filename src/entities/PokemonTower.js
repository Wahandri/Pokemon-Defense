// ─── PokémonTower Entity ───────────────────────────────────────────────────────
// Towers are now Pokémon from the player's backpack.
// Visual: sprite displayed on a styled platform.
// Attacks: fires standard Pokéballs at enemies, applying type effectiveness.

import { STARTER_TOWER_CONFIG } from '../data/balance.js';
import { getSpriteUrl } from '../data/pokemon.js';
import { getTowerConfig } from '../data/pokemon_tower_config.js';
import { ImageCache } from '../utils/ImageCache.js';
import { dist } from '../utils/math.js';
import { DartProjectile, IceProjectile } from './Projectile.js';

export class PokemonTower {
    /**
     * @param {string} slotId        - backpack slot unique id
     * @param {string} starterKey    - 'bulbasaur'|'charmander'|'squirtle' or null
     * @param {number} pokemonId     - pokémon id for sprite
     * @param {string} pokemonName   - display name
     * @param {string} pokemonType   - 'fire'|'water'|'grass'|... for type chart
     * @param {number} col           - grid column
     * @param {number} row           - grid row
     * @param {number} cellSize      - grid cell size in px
     */
    constructor(slotId, starterKey, pokemonId, pokemonName, pokemonType, col, row, cellSize) {
        this.slotId = slotId;
        this.pokemonId = pokemonId;
        this.pokemonName = pokemonName;
        this.pokemonType = pokemonType;
        this.starterKey = starterKey;

        // Position
        this.col = col;
        this.row = row;
        this.cellSize = cellSize;
        this.x = col * cellSize + cellSize / 2;
        this.y = row * cellSize + cellSize / 2;

        // Stats: from STARTER_TOWER_CONFIG if starter, else species config
        const towerCfg = getTowerConfig(pokemonId, pokemonType);
        const cfg = (starterKey && STARTER_TOWER_CONFIG[starterKey]) ?? {
            range: towerCfg.baseRange ?? 110,
            fireRate: towerCfg.baseFireRate ?? 0.7,
            damage: towerCfg.baseDamage ?? 10,
            projSpeed: 300,
            color: '#aaaaaa', glowColor: '#ffffff', bgColor: '#1a1a1a',
        };
        this.range = cfg.range;
        this.fireRate = cfg.fireRate;
        this.damage = cfg.damage;
        this.projSpeed = cfg.projSpeed;
        this.slowAmount = cfg.slowAmount ?? null;
        this.slowDuration = cfg.slowDuration ?? null;
        this.color = cfg.color;
        this.glowColor = cfg.glowColor;
        this.bgColor = cfg.bgColor;
        this.specialKey = towerCfg.special;
        this.specialCooldownMs = towerCfg.cooldown ?? 10000;
        this._specialReadyAt = Date.now();

        // Firing state
        this._fireInterval = 1000 / this.fireRate;
        this._fireCooldown = this._fireInterval * Math.random(); // stagger starts
        this._shootAnim = 0;
        this.angle = 0;

        // Visual
        this.selected = false;
        this.dead = false;
        this._xp = 0;  // XP accumulated (cosmetic for now)

        // Sprite
        this._img = null;
        this._imgFailed = false;
        ImageCache.load(getSpriteUrl(pokemonId)).then(img => {
            this._img = img; this._imgFailed = img === null;
        });
    }

    /** Find best target (furthest along path) in range, skipping weakened enemies */
    _findTarget(enemies) {
        let best = null, bestProg = -1;
        for (const e of enemies) {
            if (e.dead || e.weakened) continue;  // don't shoot weakened (already HP=0)
            const d = dist(this.x, this.y, e.x, e.y);
            if (d <= this.range && e.progress > bestProg) {
                best = e; bestProg = e.progress;
            }
        }
        return best;
    }

    update(dt, enemies, addProj) {
        if (this.dead) return;
        const now = Date.now();
        const damageMult = (this._damageBoostEnd && now < this._damageBoostEnd) ? (this._damageBoostMult ?? 1.5) : 1;
        const fireRateMult = (this._fireRateBoostEnd && now < this._fireRateBoostEnd) ? (this._fireRateBoostMult ?? 1.5) : 1;
        this._fireInterval = 1000 / Math.max(0.1, this.fireRate * fireRateMult);

        this._fireCooldown -= dt;
        if (this._shootAnim > 0) this._shootAnim -= dt;

        if (this._fireCooldown <= 0) {
            const target = this._findTarget(enemies);
            if (target) {
                this.angle = Math.atan2(target.y - this.y, target.x - this.x);
                this._shootAnim = 80;
                this._fireCooldown = this._fireInterval;

                const projParams = {
                    x: this.x, y: this.y, target,
                    damage: this.damage * damageMult,
                    speed: this.projSpeed,
                    attackerType: this.pokemonType,
                    attacker: this,
                };

                // Squirtle gets slowing water projectile
                if (this.slowAmount) {
                    addProj(new IceProjectile({
                        ...projParams,
                        slowAmount: this.slowAmount,
                        slowDuration: this.slowDuration,
                    }));
                } else {
                    addProj(new DartProjectile(projParams));
                }
            } else {
                // No target: reset cooldown to small value so we check frequently
                this._fireCooldown = 150;
            }
        }
    }

    draw(ctx, debug = false) {
        if (this.dead) return;
        const r = this.cellSize / 2 - 2;
        const fa = Math.max(0, this._shootAnim / 80);

        ctx.save();
        ctx.translate(this.x, this.y);

        // Range ring (when selected or debug)
        if (this.selected || debug) {
            ctx.beginPath(); ctx.arc(0, 0, this.range, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255,255,255,0.22)`;
            ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]);
            ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fill();
        }

        // Selection ring
        if (this.selected) {
            ctx.beginPath(); ctx.arc(0, 0, r + 5, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2; ctx.stroke();
        }

        // Base platform gradient
        const bg = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 1, 0, 0, r);
        bg.addColorStop(0, this.bgColor);
        bg.addColorStop(1, '#080808');
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = bg; ctx.fill();
        ctx.strokeStyle = this.color + '66'; ctx.lineWidth = 2; ctx.stroke();

        // Glow at shoot
        if (fa > 0) {
            ctx.shadowColor = this.glowColor; ctx.shadowBlur = 20 * fa;
            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.strokeStyle = this.color + Math.floor(fa * 200).toString(16).padStart(2, '0');
            ctx.lineWidth = 3 * fa; ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // Pokémon sprite inside — same size ratio as wild enemies (r*3.5)
        if (this._img) {
            ctx.imageSmoothingEnabled = false;
            const sz = r * 3.5;
            ctx.drawImage(this._img, -sz / 2, -sz / 2, sz, sz);
        } else {
            ctx.fillStyle = this.color;
            ctx.font = `bold ${Math.floor(r * 0.7)}px monospace`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(`#${this.pokemonId}`, 0, 0);
        }

        ctx.restore();
    }

    addXP(amount) { this._xp += amount; }

    isSpecialReady(now = Date.now()) {
        return now >= this._specialReadyAt;
    }

    triggerSpecial(now = Date.now()) {
        this._specialReadyAt = now + this.specialCooldownMs;
    }

    getSpecialCooldownPct(now = Date.now()) {
        if (this.isSpecialReady(now)) return 0;
        return Math.max(0, Math.min(1, (this._specialReadyAt - now) / this.specialCooldownMs));
    }
}

/** Create a PokémonTower from a TrainerSystem backpack slot */
export function createPokemonTower(slot, col, row, cellSize) {
    return new PokemonTower(
        slot.id, slot.starterKey, slot.pokemonId,
        slot.name, slot.pokemonType, col, row, cellSize
    );
}
