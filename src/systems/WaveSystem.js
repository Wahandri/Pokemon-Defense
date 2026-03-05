// ─── Wave System ───────────────────────────────────────────────────────────────
// Uses WAVE_DEFS from balance.js for predefined waves.
// Uses WAVES from balance.js for predefined waves.
// Generates procedural waves after wave 25.
// Fires onWaveClear(waveNum) when all spawning is done (ScenePlay listens for it).

import { WAVES } from '../data/waves.js';


/** Generate a wave procedurally for waveNum > WAVES.length */
function generateWave(waveNum) {
    const extra = waveNum - WAVES.length;
    const base = Math.floor(12 + extra * 2.8 + Math.pow(extra * 0.07, 2));
    const delay = Math.max(180, 580 - extra * 7);
    const groups = [];
    const redC = Math.floor(base * 0.45);
    const blueC = Math.floor(base * 0.35);
    const greenC = Math.floor(base * 0.28);
    if (redC > 0) groups.push({ type: 'red', count: redC, delay });
    if (blueC > 0) groups.push({ type: 'blue', count: blueC, delay: delay + 60 });
    if (greenC > 0) groups.push({ type: 'green', count: greenC, delay: delay + 120 });
    return groups;
}

export class WaveSystem {
    /**
     * @param {Function} onSpawn      (type: string, waveNum: number) → void
     * @param {Function} onWaveClear  (waveNum: number) → void  — called when spawning ends
     */
    constructor(onSpawn, onWaveClear) {
        this.onSpawn = onSpawn;
        this.onWaveClear = onWaveClear ?? (() => { });

        this.currentWave = 0;
        this.isRunning = false;

        this._groups = [];
        this._groupIndex = 0;
        this._spawnCount = 0;
        this._timer = 0;
    }

    get waveNumber() { return this.currentWave; }
    get nextWaveNum() { return this.currentWave + 1; }

    startNextWave() {
        this.currentWave++;
        this._groups = this.currentWave <= WAVES.length
            ? WAVES[this.currentWave - 1]
            : generateWave(this.currentWave);
        this._groupIndex = 0;
        this._spawnCount = 0;
        this._timer = 0;
        this.isRunning = true;
    }

    update(dt) {
        if (!this.isRunning) return;

        const group = this._groups[this._groupIndex];
        if (!group) { this._finishWave(); return; }

        this._timer -= dt;
        if (this._timer <= 0) {
            this.onSpawn(group.type, this.currentWave);
            this._spawnCount++;
            this._timer = group.delay;

            if (this._spawnCount >= group.count) {
                this._groupIndex++;
                this._spawnCount = 0;
                this._timer = 500; // pause between groups
                if (this._groupIndex >= this._groups.length) this._finishWave();
            }
        }
    }

    _finishWave() {
        this.isRunning = false;
        this.onWaveClear(this.currentWave);
    }

    allWavesDone() { return false; } // infinite — never done

    reset() {
        this.currentWave = 0; this.isRunning = false;
        this._groups = []; this._groupIndex = 0;
        this._spawnCount = 0; this._timer = 0;
    }
}
