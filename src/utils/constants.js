// ─── constants.js ──────────────────────────────────────────────────────────────
// Non-balance constants (canvas size, grid, states, etc.)
// Economy constants (START_MONEY, START_LIVES) live in balance.js

export const CANVAS_W = 960;
export const CANVAS_H = 540;

export const CELL = 32;
export const COLS = Math.floor(CANVAS_W / CELL); // 30
export const ROWS = Math.floor(CANVAS_H / CELL); // 16

export const PATH_WIDTH = 52;

export const STATE = {
    MENU: 'MENU',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    GAME_OVER: 'GAME_OVER',
};

export const TOWER_TYPE = { DART: 'dart', CANNON: 'cannon', ICE: 'ice', SNIPER: 'sniper', LASER: 'laser', MORTAR: 'mortar' };
export const ENEMY_TYPE = { RED: 'red', BLUE: 'blue', GREEN: 'green', T4: 't4', BOSS: 'boss' };

