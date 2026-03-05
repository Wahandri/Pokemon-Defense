// ─── Math Utilities ────────────────────────────────────────────────────────────

/** Euclidean distance between two points */
export function dist(ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    return Math.sqrt(dx * dx + dy * dy);
}

/** Angle in radians from (ax,ay) to (bx,by) */
export function angle(ax, ay, bx, by) {
    return Math.atan2(by - ay, bx - ax);
}

/** Linear interpolation */
export function lerp(a, b, t) {
    return a + (b - a) * t;
}

/** Clamp value between min and max */
export function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

/** Convert pixel (x,y) to grid col/row */
export function pixelToGrid(x, y, cellSize) {
    return {
        col: Math.floor(x / cellSize),
        row: Math.floor(y / cellSize),
    };
}

/** Convert grid col/row to pixel center */
export function gridToPixel(col, row, cellSize) {
    return {
        x: col * cellSize + cellSize / 2,
        y: row * cellSize + cellSize / 2,
    };
}

/** Returns a random integer in [min, max) */
export function randInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

/** Returns a random element from an array */
export function randItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
