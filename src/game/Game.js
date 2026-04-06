// ─── Game (State Machine + Main Loop) ─────────────────────────────────────────
// Owns the canvas, runs the rAF loop, routes input through SceneManager.

import { CANVAS_W, CANVAS_H } from '../utils/constants.js';
import { UI } from '../ui/UI.js';
import { TrainerSystem } from '../systems/TrainerSystem.js';
import { STARTER_TOWER_CONFIG } from '../data/balance.js';
import { KANTO_ZONES, isZoneUnlocked } from '../data/kanto_zones.js';
import { SceneManager } from './SceneManager.js';
import { ScenePlay } from './ScenePlay.js';
import { SceneGymPlay } from './SceneGymPlay.js';
import { ScenePC } from './ScenePC.js';
import { loadSave, updateSave } from '../utils/storage.js';

export class Game {
    constructor() {
        // ── Canvas ────────────────────────────────────────────────────────────
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = CANVAS_W;
        this.canvas.height = CANVAS_H;

        // ── Core systems ──────────────────────────────────────────────────────
        this.trainer = new TrainerSystem();
        this.ui = new UI();
        this.sm = new SceneManager();

        // ── App state ─────────────────────────────────────────────────────────
        const saved = loadSave();
        this.speed = saved.lastSpeed ?? 1;
        this.paused = false;
        this._lastTime = null;

        // Pokéball drag
        this._draggingPokeball = false;
        this._pokeballDragX = 0;
        this._pokeballDragY = 0;

        // Which starter was chosen
        this._selectedStarter = null;

        // ── Register scenes ───────────────────────────────────────────────────
        this._registerScenes();

        // ── Input ─────────────────────────────────────────────────────────────
        this._bindInput();

        // ── Speed / control buttons ───────────────────────────────────────────
        this.ui.btnPause?.addEventListener('click', () => this.togglePause());
        this.ui.btnReset?.addEventListener('click', () => this.goToZoneSelect());
        this.ui.btnSpeed1?.addEventListener('click', () => this.setSpeed(1));
        this.ui.btnSpeed2?.addEventListener('click', () => this.setSpeed(2));
        this.ui.btnSpeed4?.addEventListener('click', () => this.setSpeed(4));

        // ── Open PC button (sidebar) ──────────────────────────────────────────
        const pcBtn = document.getElementById('btn-open-pc');
        if (pcBtn) pcBtn.addEventListener('click', () => this.goToPC());

        // ── Restore saved speed ───────────────────────────────────────────────
        this.ui.setSpeed(this.speed);

        // ── Show starter screen ────────────────────────────────────────────────
        this._showStarterScreen();

        // ── rAF loop ──────────────────────────────────────────────────────────
        requestAnimationFrame(t => this._loop(t));
    }

    // ─── Scene Registration ───────────────────────────────────────────────────

    _registerScenes() {
        // Zone play (regular farming)
        this.sm.register('zone', ({ zone }) =>
            new ScenePlay(
                this.ctx, this.ui, this.trainer,
                () => {},
                zone,
                () => this.goToZoneSelect()
            )
        );

        // Gym battle
        this.sm.register('gym', ({ zone }) =>
            new SceneGymPlay(
                this.ctx, this.ui, this.trainer, zone,
                (gymZone) => this._onGymWin(gymZone),
                () => this.goToZoneSelect()
            )
        );

        // PC management
        this.sm.register('pc', () =>
            new ScenePC(
                this.ctx, this.trainer,
                () => this.goToZoneSelect()
            )
        );
    }

    // ─── Navigation helpers ───────────────────────────────────────────────────

    goToZone(zone) {
        // Cleanup any existing PC overlay
        document.getElementById('pc-overlay')?.remove();
        document.getElementById('zone-overlay')?.classList.add('hidden');

        this.paused = false;
        this.ui.setPaused(false);
        this.setSpeed(1);
        this.ui.showMessage(`🗺️ Entrando en: ${zone.name}`, 2000);

        if (zone.type === 'gym') {
            this.sm.setScene('gym', { zone });
        } else {
            this.sm.setScene('zone', { zone });
        }

        // Rebuild party UI
        this.ui.rebuildBackpackUI(this.trainer.party, null, false);
        this.ui.updatePokedex(this.trainer.pokedex);
    }

    goToZoneSelect() {
        document.getElementById('pc-overlay')?.remove();
        this.trainer.returnAllToBackpack();
        this.paused = false;
        this.ui.setPaused(false);
        this._showZoneOverlay();
    }

    goToPC() {
        document.getElementById('zone-overlay')?.classList.add('hidden');
        this.sm.setScene('pc', {});
    }

    _onGymWin(gymZone) {
        // Zone select will show newly unlocked zones
        setTimeout(() => this.goToZoneSelect(), 1500);
    }


// ─── Starter Screen ───────────────────────────────────────────────────────

    _showStarterScreen() {
        const overlay = document.getElementById('menu-overlay');
        if (overlay) overlay.classList.remove('hidden');
        document.getElementById('zone-overlay')?.classList.add('hidden');
        document.querySelectorAll('.starter-btn').forEach(b => b.classList.remove('selected'));
        const playBtn = document.getElementById('btn-play');
        if (playBtn) playBtn.disabled = true;

        // Starter select
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.starter-btn[data-starter]');
            if (!btn) return;
            this._selectedStarter = btn.dataset.starter;
            document.querySelectorAll('.starter-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            if (playBtn) playBtn.disabled = false;
        }, { once: false }); // keep active, filtered by null-check

        const playBtn2 = document.getElementById('btn-play');
        if (playBtn2) {
            playBtn2.addEventListener('click', () => this._onStarterConfirmed(), { once: true });
        }
    }

    _onStarterConfirmed() {
        const starter = this._selectedStarter;
        if (!starter) return;

        document.getElementById('menu-overlay')?.classList.add('hidden');

        // Fresh trainer with starter
        this.trainer = new TrainerSystem();
        const cfg = STARTER_TOWER_CONFIG[starter];
        this.trainer.initStarter(starter, cfg);
        this.ui.updatePokedex(this.trainer.pokedex);

        // Re-register scenes with fresh trainer reference
        this._registerScenes();

        this._showZoneOverlay();
    }

    // ─── Zone Select Overlay ──────────────────────────────────────────────────

    _showZoneOverlay() {
        // Pause any active scene
        this.paused = true;

        let overlay = document.getElementById('zone-overlay');
        if (!overlay) {
            overlay = this._buildZoneOverlay();
            document.body.appendChild(overlay);
        }
        overlay.classList.remove('hidden');
        this._refreshZoneList(overlay);
    }

    _buildZoneOverlay() {
        const el = document.createElement('div');
        el.id = 'zone-overlay';
        el.innerHTML = `
          <div class="zone-modal">
            <div class="zone-modal-header">
              <div class="zone-modal-title">🗺️ Mapa Kanto</div>
              <div class="zone-modal-badges" id="zone-badge-display"></div>
            </div>
            <div class="zone-modal-subtitle" id="zone-modal-subtitle">Elige una zona para jugar</div>
            <div class="zone-list" id="zone-list"></div>
            <div class="zone-modal-footer">
              <button id="zone-open-pc-btn" class="zone-btn-secondary">💾 Abrir PC</button>
            </div>
          </div>
        `;
        el.querySelector('#zone-open-pc-btn').addEventListener('click', () => {
            el.classList.add('hidden');
            this.goToPC();
        });
        return el;
    }

    _refreshZoneList(overlay) {
        const t = this.trainer;

        // Badges
        const badgeEl = overlay.querySelector('#zone-badge-display');
        if (badgeEl) {
            const badgeIcons = { roca: '🥇' };
            badgeEl.innerHTML = t.badgeCount === 0
                ? '<span style="font-size:11px;color:var(--text-dim)">Sin medallas aún</span>'
                : [...t.badges].map(b => `<span class="badge-icon" title="${b}">${badgeIcons[b] ?? '🏅'}</span>`).join('');
        }

        // Subtitle
        const subtitleEl = overlay.querySelector('#zone-modal-subtitle');
        if (subtitleEl) {
            subtitleEl.textContent = `${t.totalCaptures} capturas | ${t.badgeCount} medallas`;
        }

        // Zone list
        const listEl = overlay.querySelector('#zone-list');
        if (!listEl) return;
        listEl.innerHTML = '';

        for (const zone of KANTO_ZONES) {
            const unlocked = isZoneUnlocked(zone, t);
            const card = document.createElement('div');
            card.className = `zone-card ${zone.type} ${unlocked ? 'unlocked' : 'locked'}`;

            let lockReason = '';
            if (!unlocked) {
                const rule = zone.unlockRule;
                if (rule.type === 'capture_from') {
                    const have = t.capturesPerZone.get(rule.zoneId) ?? 0;
                    lockReason = `Captura ${rule.count - have} más en ${KANTO_ZONES.find(z => z.id === rule.zoneId)?.name ?? rule.zoneId}`;
                } else if (rule.type === 'total_captures') {
                    lockReason = `Captura ${rule.count - t.totalCaptures} Pokémon más`;
                } else if (rule.type === 'badge') {
                    lockReason = `Necesitas la Medalla ${rule.badgeId}`;
                } else if (rule.type === 'level') {
                    lockReason = `Captura ${Math.max(0, (rule.level ?? 1) - t.totalCaptures)} Pokémon más`;
                }
            }

            card.innerHTML = `
              <div class="zone-card-icon">${zone.emoji ?? '📍'}</div>
              <div class="zone-card-info">
                <div class="zone-card-name">${zone.name}</div>
                <div class="zone-card-meta">
                  ${zone.type === 'gym'
                    ? `⚔️ Líder: ${zone.leader} ${t.hasBadge(zone.badgeId) ? '✅' : ''}`
                    : `🌿 Lv. rec. ${zone.recommendedLevel}`}
                </div>
                ${!unlocked ? `<div class="zone-card-lock">🔒 ${lockReason}</div>` : ''}
              </div>
              <div class="zone-card-enter">${unlocked ? '▶' : '🔒'}</div>
            `;

            if (unlocked) {
                card.addEventListener('click', () => {
                    overlay.classList.add('hidden');
                    this.paused = false;
                    this.goToZone(zone);
                });
            }
            listEl.appendChild(card);
        }
    }

    // ─── Pause / Speed ────────────────────────────────────────────────────────

    togglePause() {
        this.paused = !this.paused;
        this.ui.setPaused(this.paused);
    }

    setSpeed(s) {
        this.speed = s;
        this.ui.setSpeed(s);
        updateSave({ lastSpeed: s });
    }

    // ─── Input ────────────────────────────────────────────────────────────────

    _bindInput() {
        window.addEventListener('keydown', e => this._onKeyDown(e));

        this.canvas.addEventListener('mousemove', e => {
            const pos = this._canvasPos(e);
            if (this._draggingPokeball && this.sm.current) {
                this.sm.current._pokeballDragging = true;
                this.sm.current._pokeballDragX = pos.x;
                this.sm.current._pokeballDragY = pos.y;
            }
            if (!this.paused) this.sm.onMouseMove(pos.x, pos.y);
        });

        this.canvas.addEventListener('click', e => {
            if (this.paused) return;
            const pos = this._canvasPos(e);
            this.sm.onClick(pos.x, pos.y);
        });

        this.canvas.addEventListener('contextmenu', e => {
            e.preventDefault();
            if (!this.paused) {
                const pos = this._canvasPos(e);
                this.sm.onRightClick(pos.x, pos.y);
            }
        });

        // Pokéball drag — start from canvas when wave running and weakened exist
        this.canvas.addEventListener('mousedown', e => {
            if (this.paused || e.button !== 0) return;
            const scene = this.sm.current;
            if (!scene?.waveSystem?.isRunning && !scene?._gymRunning) return;
            if ((this.trainer.pokeballs ?? 0) <= 0) return;
            const hasWeakened = scene?.enemies?.some(en => en.weakened && !en.dead);
            if (hasWeakened) {
                this._draggingPokeball = true;
                const pos = this._canvasPos(e);
                this._pokeballDragX = pos.x;
                this._pokeballDragY = pos.y;
                if (scene) { scene._pokeballDragging = true; scene._pokeballDragX = pos.x; scene._pokeballDragY = pos.y; }
            }
        });

        // Pokéball drag from HUD icon
        document.addEventListener('mousedown', e => {
            const src = e.target.closest('#pokeball-drag-src');
            if (!src) return;
            if ((this.trainer.pokeballs ?? 0) <= 0) { this.ui.showMessage('❌ No tienes Pokébolas'); return; }
            this._draggingPokeball = true;
            const pos = this._canvasPos(e);
            this._pokeballDragX = pos.x; this._pokeballDragY = pos.y;
            const scene = this.sm.current;
            if (scene) { scene._pokeballDragging = true; scene._pokeballDragX = pos.x; scene._pokeballDragY = pos.y; }
        });

        document.addEventListener('mouseup', e => {
            if (!this._draggingPokeball) return;
            this._draggingPokeball = false;
            const scene = this.sm.current;
            if (scene) {
                scene._pokeballDragging = false;
                if (!this.paused) {
                    const pos = this._canvasPos(e);
                    scene.throwPokeball?.(pos.x, pos.y);
                }
            }
        });
    }

    _canvasPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (CANVAS_W / rect.width),
            y: (e.clientY - rect.top) * (CANVAS_H / rect.height),
        };
    }

    _onKeyDown(e) {
        if (e.target.tagName === 'INPUT') return;
        if (e.key === 'p' || e.key === 'P') this.togglePause();
        else if (e.key === 'Escape') this.goToZoneSelect();
        else if (!this.paused) this.sm.onKeyDown(e.key);
    }

    // ─── Main Loop ────────────────────────────────────────────────────────────

    _loop(timestamp) {
        requestAnimationFrame(t => this._loop(t));

        if (this._lastTime === null) this._lastTime = timestamp;
        let dt = (timestamp - this._lastTime) * this.speed;
        this._lastTime = timestamp;
        dt = Math.min(dt, 100);

        if (!this.paused && this.sm.current) {
            this.sm.update(dt);
        }

        // Always render
        this.ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
        if (this.sm.current) {
            this.sm.render();
        } else {
            this._drawIdleBg();
        }
    }

    _drawIdleBg() {
        const ctx = this.ctx;
        const now = Date.now() / 1000;
        ctx.fillStyle = '#0d1117';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.save(); ctx.globalAlpha = 0.08;
        for (let i = 0; i < 6; i++) {
            const x = CANVAS_W * (i / 6) + Math.sin(now + i) * 40;
            const y = CANVAS_H / 2 + Math.cos(now * 0.7 + i * 1.3) * 80;
            ctx.beginPath(); ctx.arc(x, y, 80 + Math.abs(Math.sin(now + i * 2)) * 40, 0, Math.PI * 2);
            ctx.fillStyle = ['#78c850', '#f08030', '#6890f0', '#f8d030', '#c792ea', '#58a6ff'][i];
            ctx.fill();
        }
        ctx.restore();
    }
}
