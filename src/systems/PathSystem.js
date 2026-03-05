// ─── Path System ───────────────────────────────────────────────────────────────
// Manages the path waypoints, computes total length, progress distances,
// draws the path on canvas, and provides utilities for building the
// "blocked cells" set so towers can't be placed on the path.

import { PATH_WIDTH, CELL } from '../utils/constants.js';
import { dist } from '../utils/math.js';

export class PathSystem {
    /**
     * @param {Array<{x:number,y:number}>} waypoints
     */
    constructor(waypoints) {
        this.waypoints = waypoints;

        // Precompute cumulative distances for each segment
        this._segLengths = [];
        this._totalLength = 0;
        for (let i = 1; i < waypoints.length; i++) {
            const d = dist(
                waypoints[i - 1].x, waypoints[i - 1].y,
                waypoints[i].x, waypoints[i].y
            );
            this._segLengths.push(d);
            this._totalLength += d;
        }

        // Build a set of grid cells blocked by the path
        this.blockedCells = new Set();
        this._computeBlockedCells();
    }

    get totalLength() { return this._totalLength; }

    /**
     * Given a progress value [0..totalLength], return the {x, y} position
     * along the path and the current direction angle.
     * @returns {{ x: number, y: number, angle: number }}
     */
    getPositionAt(progress) {
        let remaining = Math.max(0, Math.min(progress, this._totalLength));
        for (let i = 0; i < this._segLengths.length; i++) {
            const segLen = this._segLengths[i];
            if (remaining <= segLen) {
                const t = remaining / segLen;
                const a = this.waypoints[i];
                const b = this.waypoints[i + 1];
                return {
                    x: a.x + (b.x - a.x) * t,
                    y: a.y + (b.y - a.y) * t,
                    angle: Math.atan2(b.y - a.y, b.x - a.x),
                };
            }
            remaining -= segLen;
        }
        // At the end
        const last = this.waypoints[this.waypoints.length - 1];
        const prev = this.waypoints[this.waypoints.length - 2];
        return {
            x: last.x,
            y: last.y,
            angle: Math.atan2(last.y - prev.y, last.x - prev.x),
        };
    }

    /**
     * Rasterize the path segments onto the grid to find all blocked cells.
     * We sample many points along the path and mark the cell at each sample.
     */
    _computeBlockedCells() {
        const halfW = Math.ceil(PATH_WIDTH / 2) + 4; // tight margin: path edge + 4px
        const steps = Math.ceil(this._totalLength / 4);

        for (let s = 0; s <= steps; s++) {
            const progress = (s / steps) * this._totalLength;
            const { x, y } = this.getPositionAt(progress);

            // Mark all grid cells within halfW pixels of this point
            const minCol = Math.floor((x - halfW) / CELL);
            const maxCol = Math.floor((x + halfW) / CELL);
            const minRow = Math.floor((y - halfW) / CELL);
            const maxRow = Math.floor((y + halfW) / CELL);

            for (let c = minCol; c <= maxCol; c++) {
                for (let r = minRow; r <= maxRow; r++) {
                    // Check if center of this cell is within halfW of point
                    const cx = c * CELL + CELL / 2;
                    const cy = r * CELL + CELL / 2;
                    if (dist(cx, cy, x, y) < halfW) {
                        this.blockedCells.add(`${c}_${r}`);
                    }
                }
            }
        }
    }

    /** Check if a grid cell is blocked by the path */
    isCellBlocked(col, row) {
        return this.blockedCells.has(`${col}_${row}`);
    }

    // ─── Rendering ────────────────────────────────────────────────────────────

    /**
     * Draw the path and optional waypoint markers.
     * @param {CanvasRenderingContext2D} ctx
     * @param {boolean} debug
     */
    draw(ctx, debug = false) {
        const pts = this.waypoints;
        if (pts.length < 2) return;

        // Draw path edge (slightly wider, darker)
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.lineWidth = PATH_WIDTH + 6;
        ctx.strokeStyle = '#5a4a30';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Draw path fill
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.lineWidth = PATH_WIDTH;
        ctx.strokeStyle = '#8c7a56';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Path center line (lighter, decorative)
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.stroke();
        ctx.restore();

        // Start marker
        ctx.save();
        ctx.fillStyle = '#3fb950';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pts[0].x, pts[0].y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('IN', pts[0].x, pts[0].y);
        ctx.restore();

        // End marker
        const last = pts[pts.length - 1];
        ctx.save();
        ctx.fillStyle = '#f85149';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(last.x, last.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 8px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('OUT', last.x, last.y);
        ctx.restore();

        if (debug) {
            // Draw waypoint numbers
            ctx.save();
            ctx.fillStyle = 'rgba(255,220,0,0.8)';
            ctx.font = '11px monospace';
            pts.forEach((p, i) => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillText(i, p.x + 7, p.y - 7);
            });
            ctx.restore();
        }
    }
}
