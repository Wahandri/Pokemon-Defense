// ─── Collision System ─────────────────────────────────────────────────────────
// Distance-based hit detection.
// Applies type-effectiveness multiplier from attackerType vs. enemy.pokemonType.

import { typeMultiplier } from '../data/balance.js';

export class Collision {
    /**
     * @param {Projectile[]} projectiles
     * @param {Enemy[]}      enemies
     */
    static check(projectiles, enemies) {
        for (const proj of projectiles) {
            if (proj.dead) continue;
            for (const enemy of enemies) {
                if (enemy.dead || enemy.weakened) continue;  // weakened = non-targetable by projectiles
                if (proj._hitEnemies?.has(enemy)) continue;
                const dx = proj.x - enemy.x;
                const dy = proj.y - enemy.y;
                if (dx * dx + dy * dy < (proj.radius + enemy.radius) ** 2) {
                    // Apply type effectiveness
                    const mult = typeMultiplier(proj.attackerType, enemy.pokemonType);
                    if (mult !== 1.0) {
                        proj._typeEffMult = mult;
                    }
                    proj.onHit(enemy, enemies); // passes all enemies for AoE
                    break;
                }
            }
        }
    }

    /**
     * Return all non-dead, non-weakened enemies within radius of (cx, cy).
     * Utility for area-damage queries.
     */
    static inArea(enemies, cx, cy, radius) {
        return enemies.filter(e => {
            if (e.dead || e.weakened) return false;
            const dx = e.x - cx, dy = e.y - cy;
            return dx * dx + dy * dy <= radius * radius;
        });
    }

    /**
     * Find a weakened enemy near (cx, cy) within hitRadius.
     */
    static findWeakened(enemies, cx, cy, hitRadius) {
        let best = null, bestDist = Infinity;
        for (const e of enemies) {
            if (e.dead || !e.weakened) continue;
            const dx = e.x - cx, dy = e.y - cy;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d <= hitRadius && d < bestDist) {
                best = e; bestDist = d;
            }
        }
        return best;
    }
}
