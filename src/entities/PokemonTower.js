// ─── PokémonTower Entity ───────────────────────────────────────────────────────
// Towers are now Pokémon from the player's backpack.
// Visual: sprite displayed on a styled platform.
// Attacks: type-based attack catalog with unlockable modes.

import { STARTER_TOWER_CONFIG, getPokemonLevelMultiplier, TOWER_LEVEL_BONUS } from '../data/balance.js';
import { getSpriteUrl } from '../data/pokemon.js';
import { getTowerConfig } from '../data/pokemon_tower_config.js';
import { getAttacksForType, getUnlockedAttacks } from '../data/pokemon_attacks.js';
import { ImageCache } from '../utils/ImageCache.js';
import { dist } from '../utils/math.js';
import { DartProjectile, IceProjectile, DotProjectile, LaserProjectile, CannonProjectile } from './Projectile.js';

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
     * @param {number} level         - current tower level (1-10)
     * @param {number} currentAttackIdx - which attack is active
     */
    constructor(slotId, starterKey, pokemonId, pokemonName, pokemonType, col, row, cellSize, level = 1, currentAttackIdx = 0) {
        this.slotId = slotId;
        this.pokemonId = pokemonId;
        this.pokemonName = pokemonName;
        this.pokemonType = pokemonType;
        this.starterKey = starterKey;
        this.level = level;

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
        this.damage = cfg.damage * getPokemonLevelMultiplier(level);
        this.projSpeed = cfg.projSpeed;
        this.color = cfg.color;
        this.glowColor = cfg.glowColor;
        this.bgColor = cfg.bgColor;
        this.specialKey = towerCfg.special;
        this.specialCooldownMs = towerCfg.cooldown ?? 10000;
        this._specialReadyAt = Date.now();

        // Attack system
        this._allAttacks = getAttacksForType(pokemonType);
        this.currentAttackIdx = Math.max(0, Math.min(currentAttackIdx, this._allAttacks.length - 1));
        this._activeAttack = this._getActiveAttack();

        // Firing state
        this._fireInterval = 1000 / this.fireRate;
        this._fireCooldown = this._fireInterval * Math.random(); // stagger starts
        this._shootAnim = 0;
        this.angle = 0;

        // Visual
        this.selected = false;
        this.dead = false;
        this._xp = 0;
        this._levelUpFx = 0;

        // Sprite
        this._img = null;
        this._imgFailed = false;
        ImageCache.load(getSpriteUrl(pokemonId)).then(img => {
            this._img = img; this._imgFailed = img === null;
        });
    }

    _getActiveAttack() {
        const atk = this._allAttacks[this.currentAttackIdx];
        // Fall back to first unlocked attack if current is locked
        if (!atk || atk.unlockLv > this.level) {
            const unlocked = getUnlockedAttacks(this.pokemonType, this.level);
            return unlocked[unlocked.length - 1] ?? this._allAttacks[0];
        }
        return atk;
    }

    /** Change active attack by index */
    setAttackIdx(idx, pokemonType, level) {
        const attacks = getAttacksForType(pokemonType ?? this.pokemonType);
        this._allAttacks = attacks;
        this.currentAttackIdx = Math.max(0, Math.min(idx, attacks.length - 1));
        this._activeAttack = this._getActiveAttack();
    }

    /** Apply incremental stat bonuses when leveling up */
    applyLevelBonus(newLevel) {
        this.level = newLevel;
        const bonus = TOWER_LEVEL_BONUS[newLevel];
        if (bonus) {
            this.damage    *= bonus.dmg;
            this.range     *= bonus.range;
            this.fireRate  *= bonus.fireRate;
        }
        // Re-evaluate active attack in case new attacks unlocked
        this._activeAttack = this._getActiveAttack();
    }

    /** Find best target (furthest along path) in range */
    _findTarget(enemies) {
        let best = null, bestProg = -1;
        for (const e of enemies) {
            if (e.dead || e.weakened) continue;
            const d = dist(this.x, this.y, e.x, e.y);
            if (d <= this.range && e.progress > bestProg) {
                best = e; bestProg = e.progress;
            }
        }
        return best;
    }

    /** Find up to n targets sorted by furthest progress */
    _findTargets(enemies, n) {
        const inRange = enemies.filter(e =>
            !e.dead && !e.weakened && dist(this.x, this.y, e.x, e.y) <= this.range
        );
        inRange.sort((a, b) => b.progress - a.progress);
        return inRange.slice(0, n);
    }

    update(dt, enemies, addProj) {
        if (this.dead) return;
        const now = Date.now();
        const damageMult = (this._damageBoostEnd && now < this._damageBoostEnd) ? (this._damageBoostMult ?? 1.5) : 1;
        const fireRateMult = (this._fireRateBoostEnd && now < this._fireRateBoostEnd) ? (this._fireRateBoostMult ?? 1.5) : 1;
        this._fireInterval = 1000 / Math.max(0.1, this.fireRate * fireRateMult);

        this._fireCooldown -= dt;
        if (this._shootAnim > 0) this._shootAnim -= dt;
        if (this._levelUpFx > 0) this._levelUpFx -= dt;

        if (this._fireCooldown <= 0) {
            const atk = this._activeAttack;
            const effectiveDmg = this.damage * (atk?.dmgMult ?? 1.0) * damageMult;
            const effectiveRange = this.range * (atk?.rangeMult ?? 1.0);

            const baseParams = {
                x: this.x, y: this.y,
                damage: effectiveDmg,
                speed: this.projSpeed,
                attackerType: this.pokemonType,
                attacker: this,
            };

            const mode = atk?.mode ?? 'single';

            if (mode === 'multi') {
                const targets = this._findTargets(enemies, atk.multiCount ?? 3);
                if (targets.length > 0) {
                    this.angle = Math.atan2(targets[0].y - this.y, targets[0].x - this.x);
                    this._shootAnim = 80;
                    this._fireCooldown = this._fireInterval;
                    for (const t of targets) {
                        const proj = this._makeProjectile(mode, { ...baseParams, target: t }, atk);
                        if (proj) addProj(proj);
                    }
                } else {
                    this._fireCooldown = 150;
                }
            } else if (mode === 'aoe') {
                const target = this._findTarget(enemies);
                if (target) {
                    this.angle = Math.atan2(target.y - this.y, target.x - this.x);
                    this._shootAnim = 80;
                    this._fireCooldown = this._fireInterval;
                    addProj(new CannonProjectile({
                        ...baseParams, target,
                        areaRadius: atk.aoeRadius ?? 60,
                    }));
                } else {
                    this._fireCooldown = 150;
                }
            } else if (mode === 'pierce') {
                const target = this._findTarget(enemies);
                if (target) {
                    this.angle = Math.atan2(target.y - this.y, target.x - this.x);
                    this._shootAnim = 80;
                    this._fireCooldown = this._fireInterval;
                    addProj(new LaserProjectile({
                        ...baseParams, target,
                        pierceCount: atk.pierceCount ?? 3,
                    }));
                } else {
                    this._fireCooldown = 150;
                }
            } else {
                // single / slow / dot
                const target = this._findTarget(enemies);
                if (target) {
                    this.angle = Math.atan2(target.y - this.y, target.x - this.x);
                    this._shootAnim = 80;
                    this._fireCooldown = this._fireInterval;
                    const proj = this._makeProjectile(mode, { ...baseParams, target }, atk);
                    if (proj) addProj(proj);
                } else {
                    this._fireCooldown = 150;
                }
            }
        }
    }

    _makeProjectile(mode, params, atk) {
        if (mode === 'slow') {
            return new IceProjectile({
                ...params,
                slowAmount: atk.slowAmt ?? 0.35,
                slowDuration: atk.slowDur ?? 1500,
            });
        } else if (mode === 'dot') {
            return new DotProjectile({
                ...params,
                dotDmg: atk.dotDmg ?? 2,
                dotDur: atk.dotDur ?? 2000,
            });
        } else {
            return new DartProjectile(params);
        }
    }

    draw(ctx, debug = false) {
        if (this.dead) return;
        const r = this.cellSize / 2 - 2;
        const fa = Math.max(0, this._shootAnim / 80);

        ctx.save();
        ctx.translate(this.x, this.y);

        // Range ring (only while selected)
        if (this.selected) {
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

        // Level-up FX
        if (this._levelUpFx > 0) {
            const t = this._levelUpFx / 900;
            const pulse = 1 + (1 - t) * 0.35;
            ctx.beginPath();
            ctx.arc(0, 0, (r + 8) * pulse, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(240,192,64,${0.8 * t})`;
            ctx.lineWidth = 3;
            ctx.stroke();

            const textY = -r - 12 - (1 - t) * 10;
            ctx.save();
            ctx.globalAlpha = Math.max(0, t);
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.lineWidth = 3;
            ctx.strokeStyle = 'rgba(0,0,0,0.9)';
            ctx.fillStyle = '#ffd700';
            ctx.strokeText('+LEVEL UP', 0, textY);
            ctx.fillText('+LEVEL UP', 0, textY);
            ctx.restore();
        }

        // Pokémon sprite
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

        // Level badge (top-right corner)
        if (this.level > 1) {
            const bx = r - 2, by = -r + 2;
            ctx.save();
            ctx.font = 'bold 9px Inter, sans-serif';
            ctx.textAlign = 'right'; ctx.textBaseline = 'top';
            ctx.fillStyle = 'rgba(0,0,0,0.75)';
            const txt = `Nv${this.level}`;
            const tw = ctx.measureText(txt).width;
            ctx.fillRect(bx - tw - 3, by - 1, tw + 6, 12);
            ctx.fillStyle = this.level >= 7 ? '#ffd700' : (this.level >= 4 ? '#a371f7' : '#3fb950');
            ctx.fillText(txt, bx, by);
            ctx.restore();
        }

        ctx.restore();
    }

    addXP(amount) { this._xp += amount; }

    triggerLevelUpFx() {
        this._levelUpFx = 900;
    }

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
        slot.name, slot.pokemonType, col, row, cellSize,
        slot.level ?? 1, slot.currentAttackIdx ?? 0
    );
}
