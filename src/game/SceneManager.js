// ─── SceneManager ─────────────────────────────────────────────────────────────
// Thin routing layer: holds a registry of scene factories and activates one at a
// time. The active scene receives update/render/inputs from Game.js.

export class SceneManager {
    constructor() {
        /** @type {Map<string, Function>} name → factory(game, params) → scene */
        this._registry = new Map();
        /** @type {object|null} */
        this.current = null;
        this._currentName = null;
    }

    /**
     * Register a scene factory.
     * @param {string}   name     - unique scene key
     * @param {Function} factory  - (game, params) => scene instance
     */
    register(name, factory) {
        this._registry.set(name, factory);
    }

    /**
     * Switch to a registered scene.  Calls destroy() on the previous scene if
     * it implements it, then creates the new one.
     * @param {string} name
     * @param {object} [params={}] - forwarded to factory
     */
    setScene(name, params = {}) {
        if (this.current?.destroy) {
            try { this.current.destroy(); } catch (_) { }
        }
        const factory = this._registry.get(name);
        if (!factory) throw new Error(`SceneManager: unknown scene "${name}"`);
        this.current = factory(params);
        this._currentName = name;
    }

    get currentName() { return this._currentName; }

    // ── Delegation ────────────────────────────────────────────────────────────

    update(dt) { this.current?.update(dt); }
    render() { this.current?.render(); }

    onClick(x, y) { this.current?.onClick?.(x, y); }
    onMouseMove(x, y) { this.current?.onMouseMove?.(x, y); }
    onRightClick(x, y) { this.current?.onRightClick?.(x, y); }
    onKeyDown(key) { this.current?.onKeyDown?.(key); }
}
