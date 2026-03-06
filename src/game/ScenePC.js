// ─── ScenePC ──────────────────────────────────────────────────────────────────
// Pokémon PC management screen (DOM overlay on top of canvas).
// Shows party (left, max 6) and pcBox (right, scrollable).
// Click to move Pokémon between party and box.

import { getSpriteUrl } from '../data/pokemon.js';
import { EVOLUTION_CHAIN } from '../data/balance.js';

export class ScenePC {
    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {import('../systems/TrainerSystem.js').TrainerSystem} trainer
     * @param {Function} onClose - callback to scene before PC (zone select)
     */
    constructor(ctx, trainer, onClose) {
        this.ctx = ctx;
        this.trainer = trainer;
        this.onClose = onClose;

        this._overlay = null;
        this._build();
    }

    // ─── Build DOM overlay ────────────────────────────────────────────────────

    _build() {
        // Remove any existing overlay
        document.getElementById('pc-overlay')?.remove();

        const overlay = document.createElement('div');
        overlay.id = 'pc-overlay';
        overlay.innerHTML = `
          <div class="pc-container">
            <div class="pc-header">
              <span>💾 PC de Bill</span>
              <button id="pc-close-btn">✖ Cerrar PC</button>
            </div>
            <div class="pc-body">
              <!-- Party panel -->
              <div class="pc-panel" id="pc-party-panel">
                <div class="pc-panel-title">👜 Equipo (${this.trainer.party.length}/6)</div>
                <div class="pc-party-slots" id="pc-party-slots"></div>
              </div>
              <!-- PC Box panel -->
              <div class="pc-panel pc-box-panel" id="pc-box-panel">
                <div class="pc-panel-title">📦 PC Box (${this.trainer.pcBox.length} Pokémon)</div>
                <div class="pc-box-grid" id="pc-box-grid"></div>
              </div>
            </div>
            <div class="pc-footer" id="pc-footer">
              <span style="color:var(--text-dim);font-size:11px">Haz clic en un Pokémon de PC Box para moverlo al equipo, o en uno del equipo para quitarlo.</span>
            </div>
          </div>
        `;

        document.body.appendChild(overlay);
        this._overlay = overlay;

        document.getElementById('pc-close-btn').addEventListener('click', () => this._close());

        this._renderParty();
        this._renderBox();
    }

    _renderParty() {
        const container = document.getElementById('pc-party-slots');
        if (!container) return;
        container.innerHTML = '';

        for (let i = 0; i < 6; i++) {
            const slot = this.trainer.party[i] ?? null;
            const el = document.createElement('div');
            el.className = 'pc-party-slot' + (slot ? '' : ' pc-empty-slot');
            if (slot) {
                const evo = EVOLUTION_CHAIN[slot.pokemonId];
                const xpPct = evo ? Math.min(100, Math.round(((slot.xp ?? 0) / evo.xpRequired) * 100)) : 0;
                el.innerHTML = `
                  <img src="${getSpriteUrl(slot.pokemonId)}" alt="${slot.name}" width="40" height="40" style="image-rendering:pixelated">
                  <div class="pc-slot-info">
                    <div class="pc-slot-name">${slot.name} ${slot.placed ? '📌' : ''}</div>
                    <div class="pc-slot-type" style="font-size:10px;color:var(--text-dim)">${slot.pokemonType}</div>
                    ${evo ? `<div class="pc-xp-bar-bg"><div class="pc-xp-bar-fill" style="width:${xpPct}%"></div></div>` : ''}
                  </div>
                  ${(!slot.placed) ? `<button class="pc-remove-btn" data-party-idx="${i}">↩</button>` : ''}
                `;
                el.addEventListener('click', () => {
                    if (!slot.placed) {
                        this.trainer.removeFromParty(i);
                        this._renderParty();
                        this._renderBox();
                        document.querySelector('.pc-panel-title').textContent = `👜 Equipo (${this.trainer.party.length}/6)`;
                    }
                });
            } else {
                el.innerHTML = `<div class="pc-slot-empty-label">Vacío</div>`;
            }
            container.appendChild(el);
        }

        // Wire remove buttons directly (inside the click above)
    }

    _renderBox() {
        const grid = document.getElementById('pc-box-grid');
        if (!grid) return;
        grid.innerHTML = '';

        if (this.trainer.pcBox.length === 0) {
            grid.innerHTML = '<div style="color:var(--text-dim);font-size:11px;padding:8px">PC Box vacío.</div>';
            return;
        }

        this.trainer.pcBox.forEach((slot, idx) => {
            const card = document.createElement('div');
            card.className = 'pc-box-card';
            const inParty = this.trainer.party.some(p => p.pokemonId === slot.pokemonId && p.name === slot.name);
            card.innerHTML = `
              <img src="${getSpriteUrl(slot.pokemonId)}" alt="${slot.name}" width="32" height="32" style="image-rendering:pixelated;display:block;margin:0 auto">
              <div style="font-size:9px;text-align:center;color:var(--text);margin-top:2px">${slot.name}</div>
              ${inParty ? '<div style="font-size:8px;text-align:center;color:#a371f7">En equipo</div>' : ''}
            `;
            card.addEventListener('click', () => {
                if (this.trainer.party.length >= 6) {
                    this._showMsg('⚠️ Equipo lleno. Quita un Pokémon primero.');
                    return;
                }
                const ok = this.trainer.addToParty(idx);
                if (ok) {
                    this._renderParty();
                    this._renderBox();
                    document.querySelectorAll('.pc-panel-title')[0].textContent = `👜 Equipo (${this.trainer.party.length}/6)`;
                }
            });
            grid.appendChild(card);
        });
    }

    _showMsg(text) {
        const footer = document.getElementById('pc-footer');
        if (footer) footer.textContent = text;
    }

    _close() {
        this._overlay?.remove();
        this._overlay = null;
        if (this.onClose) this.onClose();
    }

    // ─── Scene interface (canvas is just a dark bg while PC is open) ──────────

    update(_dt) { }

    render() {
        const { ctx } = this;
        ctx.fillStyle = 'rgba(5,10,20,0.92)';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }

    destroy() { this._overlay?.remove(); }
}
