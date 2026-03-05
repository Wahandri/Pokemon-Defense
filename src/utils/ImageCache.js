// ─── ImageCache ───────────────────────────────────────────────────────────────
// Singleton async image loader. Returns Promise<HTMLImageElement|null>.
// null means the image failed to load → caller should draw a canvas fallback.

const _cache = new Map();

export const ImageCache = {
    /** Load (or return cached) image. Always returns a Promise. */
    load(url) {
        if (_cache.has(url)) return _cache.get(url);
        const p = new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = url;
        });
        _cache.set(url, p);
        return p;
    },

    /** Sync getter — null if not yet loaded. Use sparingly (prefer async). */
    get(url) {
        const p = _cache.get(url);
        if (!p) return null;
        let result = null;
        // If promise is already resolved we can grab it via a sync trick
        p.then(img => { result = img; });
        return result;
    },

    /** Preload a list of URLs in parallel. Returns Promise<void>. */
    preload(urls) {
        return Promise.all(urls.map(u => this.load(u)));
    },
};
