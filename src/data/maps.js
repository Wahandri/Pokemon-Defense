// ─── Map Data ──────────────────────────────────────────────────────────────────
// Waypoints defined in pixel coordinates for a 960×540 canvas.
// Longer path with more bends so the journey takes significantly more time.

export const MAP1 = {
    name: 'Ruta 1 Kanto',

    // Waypoints: array of {x, y} pixel coordinates
    // Enemy spawns at index 0, exits after index (length-1)
    waypoints: [
        { x: 0, y: 80 },   //  0. Entry (left edge)
        { x: 140, y: 80 },   //  1. Short run right
        { x: 140, y: 200 },   //  2. Turn down
        { x: 340, y: 200 },   //  3. Run right across centre
        { x: 340, y: 80 },   //  4. Turn up
        { x: 560, y: 80 },   //  5. Run right upper
        { x: 560, y: 300 },   //  6. Turn down to middle
        { x: 760, y: 300 },   //  7. Run right middle
        { x: 760, y: 460 },   //  8. Turn down lower
        { x: 540, y: 460 },   //  9. Run left lower
        { x: 540, y: 300 },   // 10. Turn up to middle
        { x: 340, y: 300 },   // 11. Run left mid
        { x: 340, y: 460 },   // 12. Turn down again
        { x: 160, y: 460 },   // 13. Run left lower
        { x: 160, y: 320 },   // 14. Turn up
        { x: 0, y: 320 },   // 15. Exit left
    ],

    bgColor: '#1a2b1a',
    pathColor: '#6b5a3e',
    pathEdgeColor: '#5a4a30',
};

// All maps available in the game
export const MAPS = [MAP1];
