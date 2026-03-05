// ─── Collision System ─────────────────────────────────────────────────────────
// Distance-based hit detection.
// onHit now receives (enemy, allEnemies) so area-damage projectiles can splash.

export class Collision {
    /**
     * @param {Projectile[]} projectiles
     * @param {Enemy[]}      enemies
     */
    static check(projectiles, enemies) {
        for (const proj of projectiles) {
            if (proj.dead) continue;
            for (const enemy of enemies) {
                if (enemy.dead || proj._hitEnemies?.has(enemy)) continue;
                const dx = proj.x - enemy.x;
                const dy = proj.y - enemy.y;
                if (dx * dx + dy * dy < (proj.radius + enemy.radius) ** 2) {
                    proj.onHit(enemy, enemies); // pass all enemies for AoE
                    break; // re-checks dead flag next iteration
                }
            }
        }
    }

    /**
     * Return all non-dead enemies within radius of (cx, cy).
     * Utility for area-damage queries.
     */
    static inArea(enemies, cx, cy, radius) {
        return enemies.filter(e => {
            if (e.dead) return false;
            const dx = e.x - cx, dy = e.y - cy;
            return dx * dx + dy * dy <= radius * radius;
        });
    }
}
