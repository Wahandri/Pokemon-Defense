// ─── main.js ───────────────────────────────────────────────────────────────────
// Entry point: bootstraps the Game instance once the DOM is ready.

import { Game } from './game/Game.js';

window.addEventListener('DOMContentLoaded', () => {
    // Boot the game
    window._game = new Game();
});
