// ─── Ability Catalog ──────────────────────────────────────────────────────────
// 20 reusable special-move keys for all Pokémon towers.
//
// Each ability defines:
//   key          — unique string identifier
//   label        — UI display name
//   emoji        — icon
//   cooldownMs   — base cooldown (ms); tower config can override
//   radius       — area of effect (px); 0 = single-target or self
//   description  — tooltip
//   color        — glow accent
//   execute(tower, enemies, particles, ctx, options) → void
//
// execute() is called inside ScenePlay when the player activates the move.

export const ABILITIES = {

    AOE_BLAST: {
        key: 'AOE_BLAST',
        label: 'Explosión', emoji: '💥',
        cooldownMs: 8000, radius: 140,
        color: '#ff6030',
        desc: 'Daño en área grande alrededor de la torre',
        execute({ tower, enemies, addParticle }) {
            const dmg = tower.damage * 4;
            for (const e of enemies) {
                if (e.dead || e.weakened) continue;
                if (dist2(tower, e) <= 140 * 140) {
                    e.takeDamage(dmg, tower);
                    addParticle(e.x, e.y, '#ff6030', 10);
                }
            }
        },
    },

    BURN_DOT: {
        key: 'BURN_DOT',
        label: 'Quemadura', emoji: '🔥',
        cooldownMs: 7000, radius: 120,
        color: '#f08030',
        desc: 'Aplica quemadura: daño por tiempo a todos en rango',
        execute({ tower, enemies }) {
            for (const e of enemies) {
                if (e.dead || e.weakened) continue;
                if (dist2(tower, e) <= 120 * 120) {
                    applyStatus(e, 'burn', { dps: tower.damage * 0.4, duration: 4000 });
                }
            }
        },
    },

    POISON_DOT: {
        key: 'POISON_DOT',
        label: 'Veneno', emoji: '☠️',
        cooldownMs: 8000, radius: 130,
        color: '#a040a0',
        desc: 'Envenenam: daño acumulativo por tiempo',
        execute({ tower, enemies }) {
            for (const e of enemies) {
                if (e.dead || e.weakened) continue;
                if (dist2(tower, e) <= 130 * 130) {
                    applyStatus(e, 'poison', { dps: tower.damage * 0.25, stacks: true, duration: 6000 });
                }
            }
        },
    },

    FREEZE_STUN: {
        key: 'FREEZE_STUN',
        label: 'Congelar', emoji: '❄️',
        cooldownMs: 12000, radius: 110,
        color: '#98d8d8',
        desc: 'Congela a todos en rango durante 3 s',
        execute({ tower, enemies, addParticle }) {
            for (const e of enemies) {
                if (e.dead || e.weakened) continue;
                if (dist2(tower, e) <= 110 * 110) {
                    applyStatus(e, 'freeze', { duration: 3000 });
                    addParticle(e.x, e.y, '#98d8d8', 8);
                }
            }
        },
    },

    PSY_STUN: {
        key: 'PSY_STUN',
        label: 'Psíquico', emoji: '🌀',
        cooldownMs: 10000, radius: 150,
        color: '#f85888',
        desc: 'Paraliza los enemigos en rango durante 2 s',
        execute({ tower, enemies, addParticle }) {
            for (const e of enemies) {
                if (e.dead || e.weakened) continue;
                if (dist2(tower, e) <= 150 * 150) {
                    applyStatus(e, 'stun', { duration: 2000 });
                    addParticle(e.x, e.y, '#f85888', 8);
                }
            }
        },
    },

    KNOCKBACK: {
        key: 'KNOCKBACK',
        label: 'Empuje', emoji: '🥊',
        cooldownMs: 9000, radius: 100,
        color: '#e0c020',
        desc: 'Empuja a los enemigos hacia atrás en el camino (reduce progress)',
        execute({ tower, enemies }) {
            for (const e of enemies) {
                if (e.dead || e.weakened) continue;
                if (dist2(tower, e) <= 100 * 100) {
                    e.progress = Math.max(0, e.progress - 0.10);
                }
            }
        },
    },

    CHAIN_LIGHTNING: {
        key: 'CHAIN_LIGHTNING',
        label: 'Rayo Cadena', emoji: '⚡',
        cooldownMs: 8000, radius: 200,
        color: '#f8d030',
        desc: 'Daño que salta entre 4 enemigos cercanos',
        execute({ tower, enemies, addParticle }) {
            const dmg = tower.damage * 2.5;
            let targets = enemies.filter(e => !e.dead && !e.weakened && dist2(tower, e) <= 200 * 200);
            targets.sort((a, b) => dist2(tower, a) - dist2(tower, b));
            targets = targets.slice(0, 4);
            for (const t of targets) {
                t.takeDamage(dmg, tower);
                addParticle(t.x, t.y, '#f8d030', 10);
            }
        },
    },

    SLOW_FIELD: {
        key: 'SLOW_FIELD',
        label: 'Campo Lento', emoji: '🐌',
        cooldownMs: 11000, radius: 160,
        color: '#6890f0',
        desc: 'Crea un campo que ralentiza 60 % durante 4 s',
        execute({ tower, enemies }) {
            for (const e of enemies) {
                if (e.dead || e.weakened) continue;
                if (dist2(tower, e) <= 160 * 160) {
                    applyStatus(e, 'slow', { factor: 0.40, duration: 4000 });
                }
            }
        },
    },

    ARMOR_SHRED: {
        key: 'ARMOR_SHRED',
        label: 'Rompe-Armadura', emoji: '🗡️',
        cooldownMs: 10000, radius: 130,
        color: '#c0a060',
        desc: 'Reduce defensa: recibe 2× daño durante 5 s',
        execute({ tower, enemies }) {
            for (const e of enemies) {
                if (e.dead || e.weakened) continue;
                if (dist2(tower, e) <= 130 * 130) {
                    applyStatus(e, 'armor_shred', { mult: 2.0, duration: 5000 });
                }
            }
        },
    },

    HEAL_TOWER: {
        key: 'HEAL_TOWER',
        label: 'Curar Torres', emoji: '💚',
        cooldownMs: 15000, radius: 180,
        color: '#48c878',
        desc: 'Aumenta temporalmente el daño de torres cercanas 50 %',
        execute({ tower, allTowers, addParticle }) {
            const towers2 = (allTowers ?? []).filter(t => t !== tower && dist2(tower, t) <= 180 * 180);
            for (const t of towers2) {
                t._damageBoostEnd = Date.now() + 5000;
                t._damageBoostMult = 1.5;
                addParticle?.(t.x, t.y, '#48c878', 7);
            }
        },
    },

    MULTI_SHOT: {
        key: 'MULTI_SHOT',
        label: 'Disparo Múltiple', emoji: '🏹',
        cooldownMs: 7000, radius: 200,
        color: '#f0a040',
        desc: 'Daño inmediato a los 5 enemigos más cercanos',
        execute({ tower, enemies, addParticle }) {
            const dmg = tower.damage * 2;
            let targets = enemies.filter(e => !e.dead && !e.weakened && dist2(tower, e) <= 200 * 200);
            targets.sort((a, b) => dist2(tower, a) - dist2(tower, b));
            for (const t of targets.slice(0, 5)) {
                t.takeDamage(dmg, tower);
                addParticle(t.x, t.y, '#f0a040', 7);
            }
        },
    },

    PIERCE_SHOT: {
        key: 'PIERCE_SHOT',
        label: 'Flecha Perforante', emoji: '🎯',
        cooldownMs: 9000, radius: 220,
        color: '#b8b800',
        desc: 'Disparo que atraviesa todos los enemigos en línea (hasta 8)',
        execute({ tower, enemies, addParticle }) {
            const dmg = tower.damage * 3;
            for (const e of enemies) {
                if (e.dead || e.weakened) continue;
                if (dist2(tower, e) <= 220 * 220) {
                    e.takeDamage(dmg, tower);
                    addParticle(e.x, e.y, '#b8b800', 8);
                }
            }
        },
    },

    SNIPE_MARK: {
        key: 'SNIPE_MARK',
        label: 'Marcar Objetivo', emoji: '🎯',
        cooldownMs: 6000, radius: 300,
        color: '#ff3060',
        desc: 'Marca el enemigo más avanzado: recibe +100 % daño 5 s',
        execute({ enemies }) {
            const front = enemies.filter(e => !e.dead && !e.weakened).sort((a, b) => b.progress - a.progress)[0];
            if (front) applyStatus(front, 'armor_shred', { mult: 2.0, duration: 5000 });
        },
    },

    CONFUSE_WANDER: {
        key: 'CONFUSE_WANDER',
        label: 'Confusión', emoji: '💫',
        cooldownMs: 12000, radius: 140,
        color: '#f85888',
        desc: 'Confunde a los enemigos: avanzan muy lento y erráticamente 3 s',
        execute({ tower, enemies }) {
            for (const e of enemies) {
                if (e.dead || e.weakened) continue;
                if (dist2(tower, e) <= 140 * 140) {
                    applyStatus(e, 'confuse', { duration: 3000, factor: 0.20 });
                }
            }
        },
    },

    ROOT_STOP: {
        key: 'ROOT_STOP',
        label: 'Raíces', emoji: '🌿',
        cooldownMs: 13000, radius: 120,
        color: '#78c850',
        desc: 'Enraíza a enemigos en rango: no avanzan 3 s',
        execute({ tower, enemies, addParticle }) {
            for (const e of enemies) {
                if (e.dead || e.weakened) continue;
                if (dist2(tower, e) <= 120 * 120) {
                    applyStatus(e, 'root', { duration: 3000 });
                    addParticle(e.x, e.y, '#78c850', 8);
                }
            }
        },
    },

    WAVE_PUSH: {
        key: 'WAVE_PUSH',
        label: 'Onda de Choque', emoji: '🌊',
        cooldownMs: 10000, radius: 180,
        color: '#6890f0',
        desc: 'Onda frontal que empuja todos los enemigos en rango',
        execute({ tower, enemies }) {
            for (const e of enemies) {
                if (e.dead || e.weakened) continue;
                if (dist2(tower, e) <= 180 * 180) {
                    e.progress = Math.max(0, e.progress - 0.15);
                    applyStatus(e, 'slow', { factor: 0.50, duration: 2000 });
                }
            }
        },
    },

    METEOR_RAIN: {
        key: 'METEOR_RAIN',
        label: 'Lluvia de Meteoros', emoji: '☄️',
        cooldownMs: 14000, radius: 200,
        color: '#f08030',
        desc: '5 impactos AoE pequeños (daño alto, random en rango)',
        execute({ tower, enemies, addParticle }) {
            const aliveInRange = enemies.filter(e => !e.dead && !e.weakened && dist2(tower, e) <= 200 * 200);
            const dmg = tower.damage * 3;
            for (let i = 0; i < Math.min(5, aliveInRange.length); i++) {
                const t = aliveInRange[Math.floor(Math.random() * aliveInRange.length)];
                t.takeDamage(dmg, tower);
                addParticle(t.x, t.y, '#f08030', 12);
            }
        },
    },

    SHIELD_SELF: {
        key: 'SHIELD_SELF',
        label: 'Escudo', emoji: '🛡️',
        cooldownMs: 20000, radius: 0,
        color: '#98d8d8',
        desc: 'Escudo temporal: torres en rango no se debilitarán 5 s (reservado)',
        execute({ tower, addParticle }) {
            tower._shieldEnd = Date.now() + 5000;
            addParticle?.(tower.x, tower.y, '#98d8d8', 12);
        },
    },

    SPEED_BUFF: {
        key: 'SPEED_BUFF',
        label: 'Aceleración', emoji: '⚡',
        cooldownMs: 12000, radius: 180,
        color: '#f8d030',
        desc: 'Aumenta la cadencia de disparo de torres cercanas 80 % durante 4 s',
        execute({ tower, allTowers, addParticle }) {
            const nearby = (allTowers ?? []).filter(t => t !== tower && dist2(tower, t) <= 180 * 180);
            for (const t of nearby) {
                t._fireRateBoostEnd = Date.now() + 4000;
                t._fireRateBoostMult = 1.8;
                addParticle?.(t.x, t.y, '#f8d030', 7);
            }
        },
    },

    CAPTURE_NET: {
        key: 'CAPTURE_NET',
        label: 'Red de Captura', emoji: '🕸️',
        cooldownMs: 5000, radius: 160,
        color: '#a371f7',
        desc: 'Aplica ROOT a los Pokémon debilitados en rango (facilita captura)',
        execute({ tower, enemies, addParticle }) {
            for (const e of enemies) {
                if (e.dead) continue;
                if (dist2(tower, e) <= 160 * 160) {
                    if (e.weakened) applyStatus(e, 'root', { duration: 2500 });
                    else applyStatus(e, 'slow', { factor: 0.30, duration: 2500 });
                    addParticle?.(e.x, e.y, '#a371f7', 8);
                }
            }
        },
    },
};

// ── Helpers (internal to abilities) ──────────────────────────────────────────

function dist2(a, b) {
    const dx = a.x - b.x, dy = a.y - b.y;
    return dx * dx + dy * dy;
}

/**
 * Apply a status effect to an enemy.
 * Existing same-type status is refreshed (max duration).
 */
function applyStatus(enemy, type, opts = {}) {
    if (!enemy.statuses) enemy.statuses = {};
    const now = Date.now();
    const existing = enemy.statuses[type];
    const end = now + (opts.duration ?? 3000);
    if (existing) {
        existing.end = Math.max(existing.end, end); // refresh
        if (opts.stacks && existing.stacks) existing.stacks++;
    } else {
        enemy.statuses[type] = { end, ...opts, stacks: 1 };
    }
}

export { applyStatus };

/** Choose a specialKey from the catalog based on Pokémon type (heuristic) */
export function specialKeyForType(pokemonType) {
    const map = {
        fire: 'BURN_DOT',
        water: 'SLOW_FIELD',
        grass: 'ROOT_STOP',
        electric: 'CHAIN_LIGHTNING',
        ice: 'FREEZE_STUN',
        psychic: 'PSY_STUN',
        poison: 'POISON_DOT',
        fighting: 'KNOCKBACK',
        rock: 'AOE_BLAST',
        ground: 'WAVE_PUSH',
        ghost: 'CONFUSE_WANDER',
        dragon: 'METEOR_RAIN',
        flying: 'MULTI_SHOT',
        bug: 'SNIPE_MARK',
        normal: 'PIERCE_SHOT',
        dark: 'ARMOR_SHRED',
        steel: 'SHIELD_SELF',
        fairy: 'HEAL_TOWER',
    };
    return map[pokemonType] ?? 'AOE_BLAST';
}
