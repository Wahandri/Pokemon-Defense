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

        ctx.save();

        // ── Layer 1: outer dark border (soil edge / shadow) ──
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.lineWidth = PATH_WIDTH + 10;
        ctx.strokeStyle = '#3a2810';
        ctx.lineCap = 'square';
        ctx.lineJoin = 'miter';
        ctx.stroke();

        // ── Layer 2: medium border (darker dirt) ──
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.lineWidth = PATH_WIDTH + 4;
        ctx.strokeStyle = '#6a4c28';
        ctx.stroke();

        // ── Layer 3: main road fill (light tan / sandy dirt — GBA style) ──
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.lineWidth = PATH_WIDTH;
        ctx.strokeStyle = '#c09858';
        ctx.stroke();

        // ── Layer 4: lighter center highlight strip ──
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.lineWidth = Math.max(4, PATH_WIDTH * 0.35);
        ctx.strokeStyle = '#d8b870';
        ctx.stroke();

        // ── Layer 5: dashed center line (like GBA road marking) ──
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255,240,160,0.3)';
        ctx.setLineDash([12, 14]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.restore();

        // ── GBA arrow sign — entry ──
        const drawSign = (x, y, label, color, borderColor) => {
            const R = 11;
            ctx.save();
            // Sign border (pixel shadow)
            ctx.fillStyle = borderColor;
            ctx.fillRect(x - R - 2, y - R - 2, R * 2 + 4, R * 2 + 4);
            // Sign body
            ctx.fillStyle = color;
            ctx.fillRect(x - R, y - R, R * 2, R * 2);
            // Top shine
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect(x - R + 2, y - R + 2, R * 2 - 6, 3);
            // Label
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 9px "Orbitron", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            // outline
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = 2;
            ctx.strokeText(label, x, y);
            ctx.fillText(label, x, y);
            ctx.restore();
        };

        drawSign(pts[0].x, pts[0].y, 'IN', '#287820', '#0a2808');
        const last = pts[pts.length - 1];
        drawSign(last.x, last.y, 'OUT', '#a82020', '#380808');

        if (debug) {
            ctx.save();
            ctx.fillStyle = 'rgba(255,220,0,0.9)';
            ctx.font = '10px monospace';
            pts.forEach((p, i) => {
                ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
                ctx.fillText(i, p.x + 7, p.y - 7);
            });
            ctx.restore();
        }
    }
}
