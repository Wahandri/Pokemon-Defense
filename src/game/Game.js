// ─── Game (State Machine + Main Loop) ─────────────────────────────────────────
// Owns the canvas, runs the rAF loop, routes input through SceneManager.

import { CANVAS_W, CANVAS_H } from '../utils/constants.js';
import { UI } from '../ui/UI.js';
import { TrainerSystem } from '../systems/TrainerSystem.js';
import { ShopSystem } from '../systems/ShopSystem.js';
import { ShopModal } from '../ui/ShopModal.js';
import { STARTER_TOWER_CONFIG, xpToNextLevel, EVOLUTION_CHAIN } from '../data/balance.js';
import { KANTO_ZONES, isZoneUnlocked } from '../data/kanto_zones.js';
import { SceneManager } from './SceneManager.js';
import { ScenePlay } from './ScenePlay.js';
import { SceneGymBattle } from './SceneGymBattle.js';
import { ScenePC } from './ScenePC.js';
import { loadSave, updateSave } from '../utils/storage.js';
import { getSpriteUrl } from '../data/pokemon.js';

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
        this.shop = new ShopSystem(this.trainer);
        this.shopModal = new ShopModal();

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

        // ── Header nav buttons ────────────────────────────────────────────────
        document.getElementById('btn-header-map')?.addEventListener('click', () => this._showZoneOverlay());
        document.getElementById('btn-header-shop')?.addEventListener('click', () => this._openShop());
        document.getElementById('btn-header-backpack')?.addEventListener('click', () => this._openBackpackModal());

        // ── Floating backpack button ──────────────────────────────────────────
        document.getElementById('btn-backpack-float')?.addEventListener('click', () => this._openBackpackModal());

        // ── Backpack modal close ──────────────────────────────────────────────
        document.getElementById('backpack-close')?.addEventListener('click', () => this._closeBackpackModal());
        document.getElementById('backpack-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'backpack-modal') this._closeBackpackModal();
        });

        // ── Backpack modal tabs ───────────────────────────────────────────────
        document.getElementById('backpack-tabs')?.addEventListener('click', (e) => {
            const tab = e.target.dataset.tab;
            if (!tab) return;
            document.querySelectorAll('#backpack-tabs .modal-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
            document.querySelectorAll('.backpack-tab-content').forEach(el => {
                const id = `backpack-tab-${tab}`;
                el.classList.toggle('hidden', el.id !== id);
            });
            if (tab === 'items') this._renderBackpackItems();
            if (tab === 'data')  this._renderBackpackData();
        });

        // ── PC modal close ────────────────────────────────────────────────────
        document.getElementById('pc-close-btn')?.addEventListener('click', () => {
            document.getElementById('pc-overlay')?.classList.add('hidden');
        });

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
            new SceneGymBattle(
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

        // Always reset placed flags when entering a zone so every Pokémon is available
        this.trainer.returnAllToBackpack();

        this.paused = false;
        this.ui.setPaused(false);
        this.setSpeed(1);
        this.ui.showMessage(`🗺️ Entrando en: ${zone.name}`, 2000);

        if (zone.isGym === true || zone.type === 'gym') {
            this.sm.setScene('gym', { zone });
        } else {
            this.sm.setScene('zone', { zone });
        }

        // Rebuild party UI
        this.ui.rebuildBackpackUI(this.trainer.party, null, false);
        this.ui.updatePokedex(this.trainer.pokedex);
    }

    goToZoneSelect() {
        document.getElementById('pc-overlay')?.classList.add('hidden');
        this.trainer.returnAllToBackpack();
        this.paused = false;
        this.ui.setPaused(false);
        this.ui.rebuildBackpackUI(this.trainer.party, null, false);
        this._showZoneOverlay();
    }

    goToPC() {
        this._openPCModal();
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
        this.ui.rebuildBackpackUI(this.trainer.party, null, false);

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

    // ─── Kanto visual map positions (px on 820×730 world) ────────────────────
    static ZONE_POSITIONS = {
        route1:          { x: 100, y: 620 },
        viridian_forest: { x: 220, y: 620 },
        pewter_gym:      { x: 340, y: 620 },
        route3:          { x: 460, y: 620 },
        mt_moon:         { x: 580, y: 620 },
        cerulean_gym:    { x: 700, y: 620 },
        route6:          { x: 700, y: 520 },
        vermilion_gym:   { x: 580, y: 520 },
        rock_tunnel:     { x: 460, y: 520 },
        celadon_gym:     { x: 340, y: 520 },
        route14:         { x: 220, y: 520 },
        fuchsia_gym:     { x: 100, y: 520 },
        route16:         { x: 100, y: 420 },
        saffron_gym:     { x: 220, y: 420 },
        seafoam:         { x: 340, y: 420 },
        cinnabar_gym:    { x: 460, y: 420 },
        victory_road:    { x: 580, y: 420 },
        viridian_gym:    { x: 700, y: 420 },
    };

    static ZONE_CONNECTIONS = [
        ['route1', 'viridian_forest'],
        ['viridian_forest', 'pewter_gym'],
        ['pewter_gym', 'route3'],
        ['route3', 'mt_moon'],
        ['mt_moon', 'cerulean_gym'],
        ['cerulean_gym', 'route6'],
        ['route6', 'vermilion_gym'],
        ['vermilion_gym', 'rock_tunnel'],
        ['rock_tunnel', 'celadon_gym'],
        ['celadon_gym', 'route14'],
        ['route14', 'fuchsia_gym'],
        ['fuchsia_gym', 'route16'],
        ['route16', 'saffron_gym'],
        ['saffron_gym', 'seafoam'],
        ['seafoam', 'cinnabar_gym'],
        ['cinnabar_gym', 'victory_road'],
        ['victory_road', 'viridian_gym'],
    ];

    _buildZoneOverlay() {
        const el = document.createElement('div');
        el.id = 'zone-overlay';
        el.className = 'kanto-map-overlay hidden';
        el.innerHTML = `
          <div class="kanto-map-header">
            <div class="kanto-map-title">TOWN MAP</div>
            <div class="kanto-map-info">
              <span id="zone-badge-display" class="kanto-badges"></span>
              <span id="zone-map-stats" class="kanto-stats"></span>
            </div>
            <div class="kanto-map-btns">
              <button id="zone-open-pc-btn" class="kanto-btn">💾 PC</button>
              <button id="zone-close-btn" class="kanto-btn kanto-btn-close">✕</button>
            </div>
          </div>
          <div class="kanto-viewport" id="kanto-viewport">
            <div class="kanto-world" id="kanto-world">
              <canvas id="kanto-map-canvas" width="820" height="730"></canvas>
              <div id="kanto-nodes"></div>
            </div>
          </div>
          <div class="kanto-map-footer" id="kanto-footer">Selecciona una zona · Arrastra para mover</div>
        `;

        el.querySelector('#zone-open-pc-btn').addEventListener('click', () => { this._openPCModal(); });
        el.querySelector('#zone-close-btn').addEventListener('click', () => { el.classList.add('hidden'); });

        this._initMapDrag(el.querySelector('#kanto-viewport'));
        return el;
    }

    _initMapDrag(viewport) {
        let dragging = false, sx = 0, sy = 0, sl = 0, st = 0;
        viewport.addEventListener('mousedown', e => {
            if (e.target.closest('.kanto-node')) return;
            dragging = true; sx = e.clientX; sy = e.clientY;
            sl = viewport.scrollLeft; st = viewport.scrollTop;
            viewport.style.cursor = 'grabbing';
            e.preventDefault();
        });
        window.addEventListener('mousemove', e => {
            if (!dragging) return;
            viewport.scrollLeft = sl - (e.clientX - sx);
            viewport.scrollTop  = st - (e.clientY - sy);
        });
        window.addEventListener('mouseup', () => { dragging = false; viewport.style.cursor = 'grab'; });
        viewport.addEventListener('touchstart', e => {
            if (e.target.closest('.kanto-node')) return;
            const t = e.touches[0]; sx = t.clientX; sy = t.clientY;
            sl = viewport.scrollLeft; st = viewport.scrollTop;
        }, { passive: true });
        viewport.addEventListener('touchmove', e => {
            const t = e.touches[0];
            viewport.scrollLeft = sl - (t.clientX - sx);
            viewport.scrollTop  = st - (t.clientY - sy);
        }, { passive: true });
    }

    // ─── GBA Town Map Canvas Renderer ─────────────────────────────────────────

    _drawKantoMapCanvas(canvas) {
        const ctx = canvas.getContext('2d');
        const W = 820, H = 730;

        // 1. Ocean background (GBA teal-blue)
        ctx.fillStyle = '#7098d8';
        ctx.fillRect(0, 0, W, H);

        // Ocean shimmer texture
        ctx.fillStyle = 'rgba(255,255,255,0.07)';
        for (let y = 0; y < H; y += 14) {
            for (let x = (y % 28 === 0 ? 0 : 7); x < W; x += 14) {
                ctx.fillRect(x, y, 6, 2);
            }
        }

        // 2. Land masses
        const drawLand = (x, y, w, h, r = 8) => {
            ctx.fillStyle = '#80b848';
            ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
            ctx.fillStyle = '#587830';
            ctx.fillRect(x + r, y, w - r * 2, 4);
            ctx.fillRect(x, y + r, 4, h - r * 2);
            ctx.fillStyle = '#98d060';
            ctx.fillRect(x + r + 2, y + 2, w - r * 2 - 4, 2);
        };

        // Main Kanto continent
        drawLand(80, 110, 660, 540, 12);
        drawLand(60, 210, 90, 240, 8);     // west peninsula
        drawLand(62, 570, 110, 100, 8);   // Cinnabar area
        drawLand(680, 90, 90, 180, 8);    // east cape
        drawLand(210, 70, 380, 90, 8);    // north strip

        // Checkerboard grass texture
        ctx.fillStyle = '#70a840';
        for (let gx = 88; gx < 750; gx += 16) {
            for (let gy = 78; gy < 668; gy += 16) {
                if ((Math.floor(gx / 16) + Math.floor(gy / 16)) % 2 === 0) {
                    ctx.fillRect(gx, gy, 8, 8);
                }
            }
        }

        // 3. Mountains (Mt Moon, Rock Tunnel, Victory Road)
        const drawMtn = (mx, my, sz, col) => {
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath();
            ctx.moveTo(mx, my + sz); ctx.lineTo(mx + sz * 0.5, my);
            ctx.lineTo(mx + sz, my + sz); ctx.closePath(); ctx.fill();
            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.moveTo(mx, my + sz); ctx.lineTo(mx + sz * 0.5, my);
            ctx.lineTo(mx + sz, my + sz); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#f0f0f8';
            ctx.beginPath();
            ctx.moveTo(mx + sz * 0.28, my + sz * 0.42);
            ctx.lineTo(mx + sz * 0.5, my);
            ctx.lineTo(mx + sz * 0.72, my + sz * 0.42);
            ctx.closePath(); ctx.fill();
        };
        drawMtn(400, 150, 42, '#908060'); drawMtn(438, 162, 32, '#806850');
        drawMtn(376, 172, 28, '#806850');
        drawMtn(628, 148, 38, '#908060'); drawMtn(662, 162, 28, '#806850');
        drawMtn(228, 112, 34, '#806850'); drawMtn(258, 108, 26, '#706040');

        // 4. Viridian Forest (dark green patch)
        ctx.fillStyle = '#246018';
        ctx.beginPath(); ctx.roundRect(290, 365, 88, 76, 6); ctx.fill();
        ctx.fillStyle = '#387828';
        for (let tx = 298; tx < 368; tx += 14) {
            for (let ty = 372; ty < 432; ty += 12) {
                ctx.beginPath(); ctx.ellipse(tx + 5, ty + 4, 6, 5, 0, 0, Math.PI * 2); ctx.fill();
            }
        }

        // 5. Roads between zones
        const pos = Game.ZONE_POSITIONS;
        const connections = Game.ZONE_CONNECTIONS;

        for (const [a, b] of connections) {
            const pa = pos[a], pb = pos[b];
            if (!pa || !pb) continue;
            // Border
            ctx.save();
            ctx.strokeStyle = '#604820';
            ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
            // Road fill
            ctx.strokeStyle = '#c8a060';
            ctx.lineWidth = 6;
            ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
            // Center dotted line
            const dx = pb.x - pa.x, dy = pb.y - pa.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len > 70) {
                ctx.strokeStyle = 'rgba(255,230,120,0.5)';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([8, 10]);
                ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
                ctx.setLineDash([]);
            }
            ctx.restore();
        }

        // 6. Small scattered pixel details
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        for (let i = 0; i < 35; i++) {
            const rx = 100 + ((i * 137 + 31) % 600);
            const ry = 120 + ((i * 89 + 17) % 480);
            ctx.fillRect(rx, ry, 2, 2);
        }
    }

    _refreshZoneList(overlay) {
        const t = this.trainer;
        const pos = Game.ZONE_POSITIONS;

        // Header
        const badgeEl = overlay.querySelector('#zone-badge-display');
        if (badgeEl) {
            const BADGE_ICONS = { roca:'🥇', cascada:'💧', trueno:'⚡', arco_iris:'🌸', alma:'☠️', pantano:'🌀', volcan:'🔥', tierra:'🌍' };
            badgeEl.innerHTML = t.badgeCount === 0
                ? '<span style="opacity:.5;font-size:10px;color:#a8c8a8">Sin medallas</span>'
                : [...t.badges].map(b => `<span title="${b}">${BADGE_ICONS[b] ?? '🏅'}</span>`).join('');
        }
        const statsEl = overlay.querySelector('#zone-map-stats');
        if (statsEl) statsEl.textContent = `${t.totalCaptures} capturas`;

        // Draw terrain canvas
        const mapCanvas = overlay.querySelector('#kanto-map-canvas');
        if (mapCanvas) this._drawKantoMapCanvas(mapCanvas);

        // Zone nodes
        const container = overlay.querySelector('#kanto-nodes');
        if (!container) return;
        container.innerHTML = '';

        const currentZoneId = this.sm.current?.zoneConfig?.id ?? null;

        for (const zone of KANTO_ZONES) {
            const p = pos[zone.id];
            if (!p) continue;
            const unlocked = isZoneUnlocked(zone, t);
            const hasBadge = zone.type === 'gym' && t.hasBadge(zone.badgeId);

            let lockReason = '';
            if (!unlocked) {
                const rule = zone.unlockRule;
                if (rule.type === 'capture_from') {
                    const have = t.capturesPerZone.get(rule.zoneId) ?? 0;
                    const fromZone = KANTO_ZONES.find(z => z.id === rule.zoneId)?.name ?? rule.zoneId;
                    lockReason = `Captura ${rule.count - have} en ${fromZone}`;
                } else if (rule.type === 'total_captures') {
                    lockReason = `Captura ${rule.count - t.totalCaptures} más`;
                } else if (rule.type === 'badge') {
                    lockReason = `Medalla ${rule.badgeId} requerida`;
                } else if (rule.type === 'level') {
                    lockReason = `Captura ${Math.max(0, (rule.level ?? 1) - t.totalCaptures)} más`;
                }
            }

            const node = document.createElement('div');
            const isGym = zone.type === 'gym';
            node.className = [
                'kanto-node',
                isGym ? 'kanto-node-gym' : 'kanto-node-route',
                unlocked ? 'kanto-unlocked' : 'kanto-locked',
                hasBadge ? 'kanto-cleared' : '',
                zone.id === currentZoneId ? 'kanto-node-current' : '',
            ].filter(Boolean).join(' ');
            node.style.cssText = `left:${p.x}px;top:${p.y}px`;
            node.dataset.zoneId = zone.id;

            const iconContent = hasBadge ? '✅' : (zone.emoji ?? '📍');
            const displayName = isGym ? zone.leader : zone.name;
            const tooltipBody = !unlocked
                ? `<small>${lockReason}</small>`
                : isGym
                    ? `<small>Líder: ${zone.leader}</small>`
                    : `<small>Lv. rec. ${zone.recommendedLevel}</small>`;

            node.innerHTML = `
              <div class="kanto-node-icon">${iconContent}</div>
              <div class="kanto-node-label">${displayName}</div>
              ${unlocked && !hasBadge ? `<div class="kanto-node-level">Lv.${zone.recommendedLevel}</div>` : ''}
              ${!unlocked ? `<div class="kanto-node-lock">🔒</div>` : ''}
              <div class="kanto-node-tooltip">
                <strong>${zone.name}</strong>
                ${tooltipBody}
              </div>
            `;

            if (unlocked) {
                node.addEventListener('click', () => {
                    overlay.classList.add('hidden');
                    this.paused = false;
                    this.goToZone(zone);
                });
            }
            container.appendChild(node);
        }

        // Scroll to show center of map
        const viewport = overlay.querySelector('#kanto-viewport');
        if (viewport) {
            viewport.scrollLeft = 0;
            viewport.scrollTop = 60;
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

    // ─── Shop ─────────────────────────────────────────────────────────────────

    _openShop() {
        this.shop.trainer = this.trainer;
        this.shopModal.open(this.trainer, this.shop, () => {
            this.ui.updateHUD({
                pokeballs: this.trainer.pokeballs,
                coins: this.trainer.coins,
                wave: this.sm.current?.waveSystem?.waveNumber ?? 0,
                enemies: this.sm.current?.enemies?.filter(e => !e.dead).length ?? 0,
                zone: '—',
                badges: this.trainer.badgeCount,
                captures: this.trainer.totalCaptures,
            });
        });
    }

    // ─── Backpack Modal ───────────────────────────────────────────────────────

    _openBackpackModal() {
        const modal = document.getElementById('backpack-modal');
        if (!modal) return;
        modal.classList.remove('hidden');
        // Default to items tab
        document.querySelectorAll('#backpack-tabs .modal-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === 'items'));
        document.querySelectorAll('.backpack-tab-content').forEach(el => el.classList.toggle('hidden', el.id !== 'backpack-tab-items'));
        this._renderBackpackItems();
    }

    _closeBackpackModal() {
        document.getElementById('backpack-modal')?.classList.add('hidden');
    }

    _renderBackpackItems() {
        const container = document.getElementById('backpack-items-list');
        if (!container) return;
        const inv = this.trainer.getInventory();
        container.innerHTML = '';

        if (inv.length === 0) {
            container.innerHTML = '<span style="font-size:11px;color:var(--text-dim)">Inventario vacío — recoge regalos misteriosos o compra en la tienda.</span>';
            return;
        }

        for (const item of inv) {
            const row = document.createElement('div');
            row.className = 'inv-item-row';
            // Find emoji from mystery pool or use default
            const emoji = this._getItemEmoji(item.itemType);
            const isEvoItem = this._isEvolutionItem(item.itemType);
            row.innerHTML = `
              <span class="inv-item-emoji">${emoji}</span>
              <div class="inv-item-info">
                <div class="inv-item-name">${item.itemType}</div>
                <div class="inv-item-desc">${isEvoItem ? 'Objeto de evolución' : 'Objeto'}</div>
              </div>
              <span class="inv-item-qty">×${item.quantity}</span>
              ${isEvoItem ? `<button class="btn-use-item" data-item="${item.itemType}">Usar</button>` : ''}
            `;
            container.appendChild(row);
        }

        // Bind use-item clicks — pick pokemon from party
        container.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-use-item');
            if (!btn) return;
            this._openItemTargetPicker(btn.dataset.item);
        }, { once: true });
    }

    _renderBackpackData() {
        const captures = document.getElementById('data-captures');
        if (captures) captures.textContent = this.trainer.totalCaptures;
        const pokedex = document.getElementById('data-pokedex');
        if (pokedex) pokedex.textContent = `${this.trainer.pokedex.size}/151`;
        const badgesEl = document.getElementById('val-badges');
        if (badgesEl) badgesEl.textContent = '🏅'.repeat(this.trainer.badgeCount) || '—';
    }

    _openItemTargetPicker(itemType) {
        // Close backpack temporarily, show a simple picker overlay
        const party = this.trainer.party;
        if (party.length === 0) { this.ui.showMessage('No tienes Pokémon en el equipo', 1500); return; }

        const picker = document.createElement('div');
        picker.className = 'modal-overlay';
        picker.style.zIndex = '500';
        picker.innerHTML = `
          <div class="modal-panel" style="width:340px">
            <div class="modal-header">
              <span class="modal-title">Usar ${itemType}</span>
              <button class="modal-close" id="picker-close">✕</button>
            </div>
            <div class="modal-body">
              <div style="font-size:11px;color:var(--text-dim);margin-bottom:10px">¿A qué Pokémon aplicar el objeto?</div>
              <div id="picker-list" style="display:flex;flex-direction:column;gap:6px"></div>
            </div>
          </div>
        `;
        document.body.appendChild(picker);

        const list = picker.querySelector('#picker-list');
        for (const slot of party) {
            const evoEntry = EVOLUTION_CHAIN[slot.pokemonId];
            const canUse = evoEntry && (
                (evoEntry.evolvesWithItem === itemType) ||
                (evoEntry.itemEvolutions && evoEntry.itemEvolutions[itemType])
            );
            const btn = document.createElement('div');
            btn.className = 'inv-item-row';
            btn.style.cursor = canUse ? 'pointer' : 'default';
            btn.style.opacity = canUse ? '1' : '0.4';
            btn.innerHTML = `
              <img src="${getSpriteUrl(slot.pokemonId)}" width="32" height="32" style="image-rendering:pixelated">
              <div class="inv-item-info">
                <div class="inv-item-name">${slot.name} <span style="color:#a371f7;font-size:10px">Nv${slot.level}</span></div>
                <div class="inv-item-desc">${canUse ? '✅ Compatible' : '❌ No compatible'}</div>
              </div>
            `;
            if (canUse) {
                btn.addEventListener('click', () => {
                    const result = this.trainer.useItemOnSlot(slot.id, itemType);
                    picker.remove();
                    if (result.ok) {
                        // Update living tower if placed
                        const tower = this.sm.current?.towers?.find(t => t.slotId === slot.id);
                        if (tower && this.sm.current) {
                            this.sm.current._applyEvolution(tower, { newName: result.newName, newId: result.newId });
                        }
                        this.ui.showMessage(`🌟 ¡${slot.name} evolucionó a ${result.newName}!`, 3000);
                        this._openBackpackModal();
                        this._renderBackpackItems();
                    } else {
                        this.ui.showMessage('❌ No se puede usar ese objeto aquí', 1800);
                    }
                });
            }
            list.appendChild(btn);
        }

        picker.querySelector('#picker-close').addEventListener('click', () => picker.remove());
        picker.addEventListener('click', (e) => { if (e.target === picker) picker.remove(); });
    }

    _isEvolutionItem(itemType) {
        const evoItems = ['Thunder Stone','Water Stone','Fire Stone','Leaf Stone','Moon Stone','Link Cable'];
        return evoItems.includes(itemType);
    }

    _getItemEmoji(itemType) {
        const map = {
            'Thunder Stone': '⚡', 'Water Stone': '💧', 'Fire Stone': '🔥',
            'Leaf Stone': '🍃', 'Moon Stone': '🌙', 'Link Cable': '📡',
            'Pokébola': '🔴', 'Superbola': '🔵', 'Ultrabola': '⚫',
            'Poción': '💊', 'Antídoto': '💚', 'Éter': '🔵',
            'Repelente': '🌀', 'Baya Oran': '🍊', 'Escudo Humo': '💨',
            'Baya Sitrus': '🍋', 'Incienso Extraño': '🕯️',
            'Revivir Max': '💛', 'PP Máx': '✨', 'Ficha Casino': '🎰',
            'Master Ball': '🟣',
        };
        return map[itemType] ?? '📦';
    }

    // ─── PC Modal ─────────────────────────────────────────────────────────────

    _openPCModal() {
        const overlay = document.getElementById('pc-overlay');
        if (!overlay) return;
        overlay.classList.remove('hidden');
        this._renderPCModal();
    }

    _renderPCModal() {
        const partyPanel = document.getElementById('pc-party-panel');
        const boxGrid    = document.getElementById('pc-box-grid');
        if (!partyPanel || !boxGrid) return;

        // Party slots
        const oldTitle = partyPanel.querySelector('.pc-panel-title');
        partyPanel.innerHTML = '';
        if (oldTitle) partyPanel.appendChild(oldTitle);
        const title = document.createElement('div');
        title.className = 'pc-panel-title';
        title.textContent = '👜 Equipo activo';
        partyPanel.appendChild(title);

        for (let i = 0; i < 6; i++) {
            const slot = this.trainer.party[i] ?? null;
            const div = document.createElement('div');
            div.className = `pc-party-slot${slot ? '' : ' pc-empty-slot'}`;
            if (slot) {
                const lv = slot.level ?? 1;
                const xpNeeded = lv < 100 ? xpToNextLevel(lv) : 0;
                const xpPct = xpNeeded > 0 ? Math.min(100, Math.round(((slot.xp ?? 0) / xpNeeded) * 100)) : 100;
                div.innerHTML = `
                  <img src="${getSpriteUrl(slot.pokemonId)}" width="32" height="32" style="image-rendering:pixelated">
                  <div class="pc-slot-info">
                    <div class="pc-slot-name">${slot.name}${slot.placed ? ' 📌' : ''}</div>
                    <div class="pc-slot-type">${slot.pokemonType} · Nv${lv}</div>
                    <div class="pc-xp-bar-bg"><div class="pc-xp-bar-fill" style="width:${xpPct}%"></div></div>
                  </div>
                `;
                if (!slot.placed) {
                    div.addEventListener('click', () => {
                        // Send to PC
                        this.trainer.removeFromParty(i);
                        this.trainer.pcBox.push({ ...slot, placed: false });
                        this._renderPCModal();
                        this.ui.rebuildBackpackUI(this.trainer.party, null, false);
                    });
                }
            } else {
                div.innerHTML = `<div class="pc-slot-empty-label">— vacío —</div>`;
            }
            partyPanel.appendChild(div);
        }

        // PC Box grid
        boxGrid.innerHTML = '';
        for (let i = 0; i < this.trainer.pcBox.length; i++) {
            const slot = this.trainer.pcBox[i];
            const card = document.createElement('div');
            card.className = 'pc-box-card';
            card.innerHTML = `
              <img src="${getSpriteUrl(slot.pokemonId)}" width="40" height="40" style="image-rendering:pixelated;display:block;margin:auto">
              <div style="font-size:8px;color:var(--text-dim);text-align:center;margin-top:2px">${slot.name}</div>
              <div style="font-size:8px;color:#a371f7;text-align:center">Nv${slot.level}</div>
            `;
            card.addEventListener('click', () => {
                if (this.trainer.party.length >= 6) {
                    this.ui.showMessage('⚠️ Equipo lleno — retira un Pokémon primero', 1800);
                    return;
                }
                this.trainer.addToParty(i);
                this._renderPCModal();
                this.ui.rebuildBackpackUI(this.trainer.party, null, false);
            });
            boxGrid.appendChild(card);
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
