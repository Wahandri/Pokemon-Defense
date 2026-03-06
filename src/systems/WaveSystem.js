// ─── Wave System (Procedural, Gen 1 only) ─────────────────────────────────────
// Generates rounds procedurally by round number.
// No fixed wave table — all procedural.
// Fires onSpawn(type, roundNum) and onWaveClear(roundNum, escapedCount).

const TIER_UNLOCK = {
    red: 1,   // available from round 1
    blue: 3,   // unlocks at round 3
    green: 6,   // unlocks at round 6
    t4: 10,  // unlocks at round 10
};

/** Generate spawn groups for a given round number */
function generateWave(roundNum) {
    // ── Round 1 tutorial: always 1 Magikarp (very easy) ──────────────────────
    if (roundNum === 1) {
        return [{ type: 'red', count: 1, delay: 500, forcePokemon: { id: 129, name: 'Magikarp' } }];
    }

    const groups = [];

    // Count by round:
    //   1 → 1 enemy; 2 → 2; 3-4 → 4-5; 5+ → scale up to ~15 max early
    let totalCount;
    if (roundNum === 2) {
        totalCount = 2;
    } else if (roundNum === 3) {
        totalCount = 3;
    } else {
        totalCount = Math.min(12, 2 + Math.floor((roundNum - 2) * 0.65));
    }

    // Determine which tiers are unlocked
    const available = Object.entries(TIER_UNLOCK)
        .filter(([, minRound]) => roundNum >= minRound)
        .map(([type]) => type);

    // Distribute: heavier on lower tiers early
    const tierWeights = available.map((type) => {
        switch (type) {
            case 'red': return 0.55;
            case 'blue': return 0.30;
            case 'green': return 0.25;
            case 't4': return 0.15;
            default: return 0.1;
        }
    });

    const totalWeight = tierWeights.reduce((a, b) => a + b, 0);
    let remaining = totalCount;
    const delay = Math.max(280, 900 - roundNum * 28);

    for (let i = 0; i < available.length; i++) {
        const type = available[i];
        const isLast = i === available.length - 1;
        const count = isLast
            ? remaining
            : Math.max(0, Math.floor((tierWeights[i] / totalWeight) * totalCount));
        remaining -= count;
        if (count > 0) {
            groups.push({ type, count, delay });
        }
    }

    return groups.filter(g => g.count > 0);
}

export class WaveSystem {
    /**
     * @param {Function} onSpawn      (type: string, roundNum: number) → void
     * @param {Function} onWaveClear  (roundNum: number, escaped: number) → void
     */
    constructor(onSpawn, onWaveClear) {
        this.onSpawn = onSpawn;
        this.onWaveClear = onWaveClear ?? (() => { });

        this.currentWave = 0;
        this.isRunning = false;
        this._spawnDone = false;

        this._groups = [];
        this._groupIndex = 0;
        this._spawnCount = 0;
        this._timer = 0;

        // Track escaped count — set externally each round
        this._escapedThisRound = 0;
    }

    get waveNumber() { return this.currentWave; }
    get nextWaveNum() { return this.currentWave + 1; }

    startNextWave() {
        this.currentWave++;
        this._groups = generateWave(this.currentWave);
        this._groupIndex = 0;
        this._spawnCount = 0;
        this._spawnDone = false;
        this._timer = 600;  // short initial delay before first spawn
        this._escapedThisRound = 0;
        this.isRunning = true;
    }

    /** Called by ScenePlay whenever an enemy escapes without being weakened first */
    recordEscape() {
        this._escapedThisRound++;
    }

    /** Return forcePokemon override for current group (if any) */
    getCurrentForcePokemon() {
        const g = this._groups[this._groupIndex];
        return g?.forcePokemon ?? null;
    }

    /** Called by ScenePlay when all enemies are gone (after spawning finished) */
    notifyAllEnemiesGone() {
        if (this._spawnDone && this.isRunning) {
            this.isRunning = false;
            this.onWaveClear(this.currentWave, this._escapedThisRound);
        }
    }

    update(dt) {
        if (!this.isRunning || this._spawnDone) return;

        const group = this._groups[this._groupIndex];
        if (!group) {
            this._spawnDone = true;
            return;
        }

        this._timer -= dt;
        if (this._timer <= 0) {
            this.onSpawn(group.type, this.currentWave, group.forcePokemon ?? null);
            this._spawnCount++;
            this._timer = group.delay;

            if (this._spawnCount >= group.count) {
                this._groupIndex++;
                this._spawnCount = 0;
                this._timer = 650; // pause between groups
            }
            if (this._groupIndex >= this._groups.length) {
                this._spawnDone = true;
            }
        }
    }

    reset() {
        this.currentWave = 0;
        this.isRunning = false;
        this._spawnDone = false;
        this._groups = [];
        this._groupIndex = 0;
        this._spawnCount = 0;
        this._timer = 0;
        this._escapedThisRound = 0;
    }
}
