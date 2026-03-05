// ─── Map Data ──────────────────────────────────────────────────────────────────
// Waypoints defined in pixel coordinates for a 960×540 canvas.
// The path flows from left-side entrance to right-side exit with several bends.

export const MAP1 = {
    name: 'Cañada Verde',

    // Waypoints: array of {x, y} pixel coordinates
    // Enemy spawns at index 0, exits after index (length-1)
    waypoints: [
        { x: 0, y: 100 },  // 0. Entry (left edge)
        { x: 200, y: 100 },  // 1.
        { x: 200, y: 260 },  // 2. Turn down
        { x: 480, y: 260 },  // 3. Horizontal centre
        { x: 480, y: 100 },  // 4. Turn up
        { x: 720, y: 100 },  // 5.
        { x: 720, y: 420 },  // 6. Turn down
        { x: 480, y: 420 },  // 7. Horizontal left
        { x: 480, y: 540 },  // 8. Exit bottom (or right of screen)
    ],

    // Background color for "grass" tiles
    bgColor: '#1a2b1a',

    // Path color
    pathColor: '#6b5a3e',

    // Path border / edge color
    pathEdgeColor: '#5a4a30',
};

// All maps available in the game
export const MAPS = [MAP1];
