// ─── Game (State Machine + Main Loop) ─────────────────────────────────────────
// Owns the canvas, runs requestAnimationFrame loop, routes input,
// manages game state transitions, and persists scores.

import { CANVAS_W, CANVAS_H, STATE } from '../utils/constants.js';
import { loadSave, updateSave } from '../utils/storage.js';
import { UI } from '../ui/UI.js';
import { ScenePlay } from './ScenePlay.js';

export class Game {
    constructor() {
        // ── Canvas setup ──────────────────────────────────────────────────────
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this._resize();

        // ── State ─────────────────────────────────────────────────────────────
        this.state = STATE.MENU;
        this.speed = 1;       // 1 or 2
        this.paused = false;
        this._lastTime = null;

        // ── Save data ─────────────────────────────────────────────────────────
        this.save = loadSave();

        // ── UI ────────────────────────────────────────────────────────────────
        this.ui = new UI();

        // ── Scenes ────────────────────────────────────────────────────────────
        this.scene = null;  // created on game start

        // ── Input ─────────────────────────────────────────────────────────────
        this._bindInput();

        // ── Show menu ─────────────────────────────────────────────────────────
        this.ui.showMenu(this.save.bestScore);
        this.ui.btnPlay.addEventListener('click', () => this.startGame());
        this.ui.btnReset.addEventListener('click', () => this.resetGame());
        this.ui.btnPause.addEventListener('click', () => this.togglePause());
        this.ui.btnSpeed1.addEventListener('click', () => this.setSpeed(1));
        this.ui.btnSpeed2.addEventListener('click', () => this.setSpeed(2));
        if (this.ui.btnSpeed4) this.ui.btnSpeed4.addEventListener('click', () => this.setSpeed(4));

        // ── Start loop ────────────────────────────────────────────────────────
        requestAnimationFrame((t) => this._loop(t));
    }

    // ─── Canvas sizing ────────────────────────────────────────────────────────

    _resize() {
        this.canvas.width = CANVAS_W;
        this.canvas.height = CANVAS_H;
    }

    // ─── Input Bindings ───────────────────────────────────────────────────────

    _bindInput() {
        // Keyboard
        window.addEventListener('keydown', (e) => this._onKeyDown(e));

        // Canvas mouse
        this.canvas.addEventListener('mousemove', (e) => {
            const pos = this._canvasPos(e);
            if (this.scene && this.state === STATE.PLAYING && !this.paused) {
                this.scene.onMouseMove(pos.x, pos.y);
            }
        });

        this.canvas.addEventListener('click', (e) => {
            if (this.state !== STATE.PLAYING || this.paused) return;
            const pos = this._canvasPos(e);
            if (this.scene) this.scene.onClick(pos.x, pos.y);
        });

        // Prevent right-click menu on canvas
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            // Right-click = deselect tower type
            if (this.scene && this.state === STATE.PLAYING) {
                this.scene.selectedTowerType = null;
                this.ui.clearTowerSelection();
            }
        });
    }

    /** Convert a MouseEvent to canvas-local coordinates */
    _canvasPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = CANVAS_W / rect.width;
        const scaleY = CANVAS_H / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
        };
    }

    _onKeyDown(e) {
        // Block shortcuts while typing in an input
        if (e.target.tagName === 'INPUT') return;

        switch (e.key) {
            case 'p':
            case 'P':
                if (this.state === STATE.PLAYING) this.togglePause();
                break;
            case 'r':
            case 'R':
                if (this.state !== STATE.MENU) this.resetGame();
                break;
            default:
                if (this.scene && this.state === STATE.PLAYING) {
                    this.scene.onKeyDown(e.key);
                }
        }
    }

    // ─── Game Lifecycle ───────────────────────────────────────────────────────

    startGame() {
        this.state = STATE.PLAYING;
        this.paused = false;
        this.ui.hideMenu();
        this.ui.setPaused(false);

        if (!this.scene) {
            this.scene = new ScenePlay(
                this.ctx,
                this.ui,
                (wave) => this._onGameOver(wave)
            );
        } else {
            this.scene.reset();
        }

        // Apply saved speed preference
        this.setSpeed(this.save.lastSpeed ?? 1);
    }

    resetGame() {
        this.state = STATE.PLAYING;
        this.paused = false;
        this.ui.setPaused(false);
        if (this.scene) {
            this.scene.reset();
        } else {
            this.startGame();
            return;
        }
        this.ui.showMessage('↺ Juego reiniciado');
    }

    togglePause() {
        if (this.state !== STATE.PLAYING) return;
        this.paused = !this.paused;
        this.ui.setPaused(this.paused);
    }

    setSpeed(s) {
        this.speed = s;
        this.ui.setSpeed(s);
        updateSave({ lastSpeed: s });
    }

    _onGameOver(waveSurvived) {
        this.state = STATE.GAME_OVER;
        this.paused = false;
        this.ui.setPaused(false);

        // Persist best score
        if (waveSurvived > (this.save.bestScore ?? 0)) {
            this.save.bestScore = waveSurvived;
            updateSave({ bestScore: waveSurvived });
        }

        this._showEndOverlay('💀 GAME OVER', `Sobreviviste hasta la oleada ${waveSurvived}`, '#f85149');
    }

    /** Show the menu overlay with a custom message and "Play Again" option */
    _showEndOverlay(title, subtitle, color) {
        const overlay = this.ui.menuOverlay;
        overlay.classList.remove('hidden');
        overlay.innerHTML = `
      <h1 style="color:${color};text-shadow:0 0 40px ${color}88;font-family:'Orbitron',sans-serif;font-size:40px;font-weight:900;letter-spacing:4px;">${title}</h1>
      <p style="color:#c9d1d9;font-size:15px;text-align:center;max-width:360px;line-height:1.6;">${subtitle}</p>
      <div id="best-score-display" style="color:#e3b341;font-family:'Orbitron',sans-serif;font-size:13px;">
        🏆 Mejor Oleada: ${this.save.bestScore}
      </div>
      <button class="menu-btn" id="btn-play" style="font-family:'Orbitron',sans-serif;font-size:15px;font-weight:700;letter-spacing:2px;background:${color};color:#000;border-radius:10px;border:none;cursor:pointer;padding:14px 48px;">
        ↺ Jugar de Nuevo
      </button>
    `;
        document.getElementById('btn-play').addEventListener('click', () => this.startGame());
    }

    // ─── Main Loop ────────────────────────────────────────────────────────────

    _loop(timestamp) {
        requestAnimationFrame((t) => this._loop(t));

        if (this._lastTime === null) {
            this._lastTime = timestamp;
        }

        let dt = (timestamp - this._lastTime) * this.speed;
        this._lastTime = timestamp;

        // Cap dt to avoid spiral of death on tab switch
        dt = Math.min(dt, 100);

        // Update
        if (this.state === STATE.PLAYING && !this.paused && this.scene) {
            this.scene.update(dt);
        }

        // Render
        this._render();
    }

    _render() {
        const { ctx } = this;

        // Clear canvas
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

        if (this.state === STATE.MENU) {
            // Draw a static background while in menu
            ctx.fillStyle = '#0d1117';
            ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
            this._drawMenuBg(ctx);
            return;
        }

        if (this.scene) {
            this.scene.render();
        }
    }

    /** Animated decoration for menu background */
    _drawMenuBg(ctx) {
        const now = Date.now() / 1000;
        ctx.save();
        ctx.globalAlpha = 0.08;
        for (let i = 0; i < 5; i++) {
            const x = (CANVAS_W * (i / 5)) + Math.sin(now + i) * 40;
            const y = CANVAS_H / 2 + Math.cos(now * 0.7 + i * 1.3) * 80;
            ctx.beginPath();
            ctx.arc(x, y, 80 + Math.abs(Math.sin(now + i * 2)) * 40, 0, Math.PI * 2);
            ctx.fillStyle = ['#58a6ff', '#3fb950', '#f85149', '#e3b341', '#a371f7'][i];
            ctx.fill();
        }
        ctx.restore();
    }
}
