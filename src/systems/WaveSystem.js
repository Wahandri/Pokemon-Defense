// ─── Wave System (Procedural, Gen 1 only) ─────────────────────────────────────
// Generates rounds procedurally by round number.
// Fires onSpawn(type, roundNum, forcePokemon, wildLevel) and onWaveClear(roundNum, escapedCount).

import { getWildLevelForRound } from '../data/balance.js';

const TIER_UNLOCK = {
    red: 1,
    blue: 3,
    green: 6,
    t4: 10,
};

/** Generate spawn groups for a given round number */
function generateWave(roundNum) {
    if (roundNum === 1) {
        return [{ type: 'red', count: 1, delay: 500, forcePokemon: { id: 129, name: 'Magikarp' } }];
    }

    const groups = [];
    const minGroups = 2;
    const maxGroups = Math.min(5, 2 + Math.floor(roundNum / 3));
    const groupCount = minGroups + Math.floor(Math.random() * (maxGroups - minGroups + 1));

    let remaining = Math.min(16, 2 + Math.floor(roundNum * 1.2));

    const available = Object.entries(TIER_UNLOCK)
        .filter(([, minRound]) => roundNum >= minRound)
        .map(([type]) => type);

    for (let i = 0; i < groupCount; i++) {
        const groupsLeft = groupCount - i;
        const count = groupsLeft === 1
            ? remaining
            : Math.max(0, Math.floor(Math.random() * Math.min(4, remaining - (groupsLeft - 1))) + 1);
        remaining -= count;
        if (count <= 0) continue;

        const type = available[Math.floor(Math.random() * available.length)];
        const delayBase = Math.max(220, 920 - roundNum * 28);
        const delay = Math.max(180, delayBase + Math.floor(Math.random() * 320) - 140);

        groups.push({ type, count, delay });
    }

    return groups.filter(g => g.count > 0);
}

export class WaveSystem {
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

        this._escapedThisRound = 0;
    }

    get waveNumber() { return this.currentWave; }
    get nextWaveNum() { return Math.max(1, this.currentWave + 1); }

    startNextWave() {
        this._startWave(this.currentWave + 1);
    }

    restartCurrentWave() {
        const round = Math.max(1, this.currentWave);
        this._startWave(round);
    }

    _startWave(roundNum) {
        this.currentWave = roundNum;
        this._groups = generateWave(this.currentWave);
        this._groupIndex = 0;
        this._spawnCount = 0;
        this._spawnDone = false;
        this._timer = 600;
        this._escapedThisRound = 0;
        this.isRunning = true;
    }

    recordEscape() {
        this._escapedThisRound++;
    }

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
            const wildLevel = getWildLevelForRound(this.currentWave);
            this.onSpawn(group.type, this.currentWave, group.forcePokemon ?? null, wildLevel);
            this._spawnCount++;
            this._timer = group.delay;

            if (this._spawnCount >= group.count) {
                this._groupIndex++;
                this._spawnCount = 0;
                this._timer = 450 + Math.floor(Math.random() * 500);
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
