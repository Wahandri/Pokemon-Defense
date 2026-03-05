// ─── Storage Utilities ─────────────────────────────────────────────────────────

const KEY = 'towerDefense_v1';

/**
 * Load saved data from localStorage.
 * Returns default structure if nothing is saved.
 */
export function loadSave() {
    try {
        const raw = localStorage.getItem(KEY);
        if (raw) return JSON.parse(raw);
    } catch (_) { /* ignore */ }
    return {
        bestScore: 0,       // highest wave survived
        highestWave: 0,     // same meaning, alias for clarity
        lastSpeed: 1,       // speed preference
    };
}

/**
 * Persist the save object.
 * @param {Object} data
 */
export function writeSave(data) {
    try {
        localStorage.setItem(KEY, JSON.stringify(data));
    } catch (_) { /* quota exceeded or private mode */ }
}

/**
 * Update only specific fields of the save.
 * @param {Object} partial
 */
export function updateSave(partial) {
    const current = loadSave();
    writeSave({ ...current, ...partial });
}
