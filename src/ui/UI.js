// ─── UI Manager ───────────────────────────────────────────────────────────────
import { getSpriteUrl } from '../data/pokemon.js';
import { EVOLUTION_CHAIN } from '../data/balance.js';

export class UI {
    constructor() {
        this.valLevel = document.getElementById('val-level');
        this.valXP = document.getElementById('val-xp');
        this.valPokeballs = document.getElementById('val-pokeballs');
        this.valCandy = document.getElementById('val-candy');
        this.valWave = document.getElementById('val-wave');
        this.valEnemies = document.getElementById('val-enemies');
        this.xpBar = document.getElementById('xp-bar');
        document.getElementById('hud-level')?.remove();
        document.getElementById('hud-xp')?.remove();
        document.getElementById('xp-bar-wrap')?.remove();

        this.btnStartWave = document.getElementById('btn-start-wave');
        this.btnPause = document.getElementById('btn-pause');
        this.btnReset = document.getElementById('btn-reset');
        this.btnSpeed1 = document.getElementById('btn-speed1');
        this.btnSpeed2 = document.getElementById('btn-speed2');
        this.btnSpeed4 = document.getElementById('btn-speed4');
        this.specialSlots = document.getElementById('special-slots');

        this.towerInfoPanel = document.getElementById('tower-info');
        this.towerInfoName = document.getElementById('tower-info-name');
        this.towerInfoSprite = document.getElementById('tower-info-sprite');
        this.towerInfoStats = document.getElementById('tower-stats');
        this.towerButtons = document.getElementById('tower-buttons');

        this._pokedexGrid = document.getElementById('pokedex-grid');
        this._pokedexCount = document.getElementById('pokedex-count');

        this.menuOverlay = document.getElementById('menu-overlay');
        this.btnPlay = document.getElementById('btn-play');
        this.pausedBanner = document.getElementById('paused-banner');
        this._msgEl = document.getElementById('msg');
        this._msgTimer = null;
        this._roundClearEl = document.getElementById('round-clear');
        this._roundClearTimer = null;

        // ── Handlers (set from ScenePlay) ─────────────────────────────────────
        this._pickupHandler = null;   // NOTE: never set to null again after init — bug fix
        this._evolveHandler = null;   // (slotId) → void
        this._candyHandler = null;   // (slotId) → void
        this._specialHandler = null; // (slotIdx) → void

        // Sell / Recuperar button
        const sellBtn = document.getElementById('btn-sell');
        if (sellBtn) {
            sellBtn.addEventListener('click', () => {
                if (this._pickupHandler) this._pickupHandler();
            });
        }

        // Evolucionar button
        const evoBtn = document.getElementById('btn-evolve');
        if (evoBtn) {
            evoBtn.addEventListener('click', () => {
                if (this._evolveHandler) this._evolveHandler();
            });
        }

        // Usar Rare Candy button
        const candyBtn = document.getElementById('btn-use-candy');
        if (candyBtn) {
            candyBtn.addEventListener('click', () => {
                if (this._candyHandler) this._candyHandler();
            });
        }

        this._buildSpecialSlotButtons();
    }

    _buildSpecialSlotButtons() {
        if (!this.specialSlots) return;
        this.specialSlots.innerHTML = '';
        for (let i = 0; i < 6; i++) {
            const btn = document.createElement('button');
            btn.className = 'btn-secondary';
            btn.style.cssText = 'position:relative;width:48px;height:48px;padding:0;display:flex;align-items:center;justify-content:center;overflow:hidden;border-radius:8px';
            btn.innerHTML = `<span style="font-size:9px;color:var(--text-dim)">S${i + 1}</span>`;
            btn.addEventListener('click', () => this._specialHandler?.(i));
            this.specialSlots.appendChild(btn);
        }
    }

    updateSpecialSlots(towers, abilities) {
        if (!this.specialSlots) return;
        const now = Date.now();
        const btns = [...this.specialSlots.querySelectorAll('button')];
        for (let i = 0; i < 6; i++) {
            const tower = towers[i] ?? null;
            const btn = btns[i];
            if (!btn) continue;
            if (!tower) {
                btn.disabled = true;
                btn.innerHTML = `<span style="font-size:9px;color:var(--text-dim)">S${i + 1}</span>`;
                continue;
            }
            const ab = abilities?.[tower.specialKey];
            const cooldownPct = tower.getSpecialCooldownPct?.(now) ?? 1;
            const ready = tower.isSpecialReady?.(now);
            btn.disabled = false;
            btn.title = `${tower.pokemonName} · ${ab?.label ?? tower.specialKey}`;
            btn.innerHTML = `
              <img src="${getSpriteUrl(tower.pokemonId)}" width="34" height="34" style="image-rendering:pixelated;z-index:1">
              <div style="position:absolute;left:0;bottom:0;width:100%;height:${Math.round(cooldownPct * 100)}%;background:rgba(0,0,0,0.55);"></div>
              <div style="position:absolute;top:1px;right:2px;font-size:12px;z-index:2">${ab?.emoji ?? '✨'}</div>
              <div style="position:absolute;left:2px;bottom:1px;font-size:8px;color:${ready ? '#3fb950' : '#e3b341'};z-index:2">${ready ? 'OK' : 'CD'}</div>
            `;
        }
    }

    // ─── HUD ──────────────────────────────────────────────────────────────────

    updateHUD({ pokeballs, rareCandy, wave, enemies, zone, badges }) {
        if (this.valPokeballs) this.valPokeballs.textContent = pokeballs;
        if (this.valCandy) this.valCandy.textContent = rareCandy;
        if (this.valWave) this.valWave.textContent = wave;
        if (this.valEnemies) this.valEnemies.textContent = enemies;
        const zoneEl = document.getElementById('val-zone');
        if (zoneEl && zone) zoneEl.textContent = zone;
        const badgeEl = document.getElementById('val-badges');
        if (badgeEl && badges !== undefined) badgeEl.textContent = '🏅'.repeat(badges) || '—';
    }

    setStartWaveButton({ waveNum, enabled, running, label = null }) {
        const btn = this.btnStartWave;
        if (!btn) return;
        if (running) {
            btn.textContent = label ?? `🌊 Ronda ${waveNum - 1} en curso…`;
            btn.disabled = true;
        } else {
            btn.textContent = label ?? `▶ Lanzar Ronda ${waveNum}`;
            btn.disabled = !enabled;
        }
    }

    setPaused(paused) {
        if (this.btnPause) this.btnPause.textContent = paused ? '▶ Reanudar' : '⏸ Pausa';
        if (this.btnPause) this.btnPause.classList.toggle('active', paused);
        if (this.pausedBanner) this.pausedBanner.classList.toggle('show', paused);
    }

    setSpeed(speed) {
        [1, 2, 4].forEach(s => {
            const btn = document.getElementById(`btn-speed${s}`);
            if (btn) btn.classList.toggle('active', speed === s);
        });
    }

    // ─── Backpack / Tower Selector ────────────────────────────────────────────

    rebuildBackpackUI(backpack, selectedSlotId, roundRunning) {
        if (!this.towerButtons) return;
        this.towerButtons.innerHTML = '';

        if (backpack.length === 0) {
            this.towerButtons.innerHTML = '<span style="font-size:10px;color:var(--text-dim)">¡Captura Pokémon para usarlos como torres!</span>';
            return;
        }

        for (const slot of backpack) {
            const canEvo = slot.xpToEvolve !== null && (slot.xp ?? 0) >= slot.xpToEvolve;
            const xpPct = slot.xpToEvolve ? Math.min(100, Math.round(((slot.xp ?? 0) / slot.xpToEvolve) * 100)) : 0;

            const btn = document.createElement('button');
            btn.className = 'tower-btn';
            if (slot.id === selectedSlotId) btn.classList.add('selected');
            if (slot.placed || roundRunning) btn.classList.add('unaffordable');
            if (canEvo) btn.classList.add('can-evolve');

            const statusIcon = slot.placed ? '📌 ' : '';
            const evoTag = canEvo ? ' <span style="color:#f0c040;font-size:9px">★EVO!</span>' : '';
            const xpBarHTML = slot.xpToEvolve
                ? `<div style="height:3px;background:rgba(255,255,255,0.1);border-radius:2px;margin-top:2px">
                     <div style="height:3px;background:${canEvo ? '#f0c040' : '#a371f7'};width:${xpPct}%;border-radius:2px;transition:width .3s"></div>
                   </div>`
                : '';

            btn.innerHTML = `
              <img src="${getSpriteUrl(slot.pokemonId)}" width="28" height="28" style="image-rendering:pixelated;flex-shrink:0">
              <div class="tower-info">
                <div class="tower-name">${statusIcon}${slot.name}${evoTag}</div>
                <div class="tower-cost" style="color:var(--text-dim);font-size:10px">${slot.pokemonType} · XP ${slot.xp ?? 0}${slot.xpToEvolve ? '/' + slot.xpToEvolve : ''}</div>
                ${xpBarHTML}
              </div>
            `;
            btn.disabled = slot.placed || roundRunning;
            btn.addEventListener('click', () => {
                btn.dispatchEvent(new CustomEvent('backpack-select', {
                    bubbles: true, detail: { slotId: slot.id }
                }));
            });
            this.towerButtons.appendChild(btn);
        }
    }

    bindBackpackSelect(handler) {
        document.addEventListener('backpack-select', (e) => handler(e.detail.slotId));
    }

    // ─── Tower Info Panel ─────────────────────────────────────────────────────

    /**
     * Show tower info with XP bar + evolve button.
     * @param {PokemonTower} tower
     * @param {object} slot  - backpack slot (has .xp, .xpToEvolve)
     * @param {TrainerSystem} trainer
     */
    showTowerInfoPokemon(tower, slot, trainer) {
        if (!this.towerInfoPanel) return;
        this.towerInfoPanel.classList.add('visible');
        if (this.towerInfoName) this.towerInfoName.textContent = tower.pokemonName;
        if (this.towerInfoSprite) this.towerInfoSprite.src = getSpriteUrl(tower.pokemonId);

        const slotXP = slot?.xp ?? 0;
        const xpToEvo = slot?.xpToEvolve ?? null;
        const canEvo = xpToEvo !== null && slotXP >= xpToEvo;
        const xpPct = xpToEvo ? Math.min(100, Math.round((slotXP / xpToEvo) * 100)) : 0;
        const nextEvoName = xpToEvo ? (EVOLUTION_CHAIN[tower.pokemonId]?.evolvedName ?? '—') : '—';

        if (this.towerInfoStats) {
            const xpBarHTML = xpToEvo
                ? `<div style="grid-column:span 2;background:rgba(255,255,255,0.06);border-radius:6px;padding:5px 7px">
                     <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--text-dim);margin-bottom:3px">
                       <span>📈 XP Torre (Nv ${slot?.level ?? 1})</span><span>${slotXP}/${xpToEvo} (→${nextEvoName})</span>
                     </div>
                     <div style="height:5px;background:rgba(255,255,255,0.1);border-radius:3px">
                       <div style="height:5px;background:${canEvo ? '#f0c040' : '#a371f7'};width:${xpPct}%;border-radius:3px;transition:width .4s"></div>
                     </div>
                   </div>`
                : '';
            this.towerInfoStats.innerHTML = `
              <div class="stat-item"><div class="stat-label">🎯 Daño</div><div class="stat-value">${tower.damage.toFixed(0)}</div></div>
              <div class="stat-item"><div class="stat-label">📡 Alcance</div><div class="stat-value">${tower.range.toFixed(0)}</div></div>
              <div class="stat-item"><div class="stat-label">⚡ Cadencia</div><div class="stat-value">${tower.fireRate.toFixed(1)}/s</div></div>
              <div class="stat-item"><div class="stat-label">🔤 Tipo</div><div class="stat-value">${tower.pokemonType}</div></div>
              <div class="stat-item"><div class="stat-label">⭐ Nivel</div><div class="stat-value">${slot?.level ?? 1}</div></div>
              ${xpBarHTML}
            `;
        }

        // Evolucionar button
        const evoBtn = document.getElementById('btn-evolve');
        if (evoBtn) {
            if (xpToEvo !== null) {
                evoBtn.style.display = '';
                evoBtn.disabled = !canEvo;
                evoBtn.textContent = canEvo
                    ? `⭐ Evolucionar → ${nextEvoName}`
                    : `⭐ Evolucionar (${slotXP}/${xpToEvo} XP)`;
            } else {
                evoBtn.style.display = 'none';
            }
        }

        // Usar Rare Candy button
        const candyBtn = document.getElementById('btn-use-candy');
        if (candyBtn) {
            const hasCandy = trainer && trainer.rareCandy > 0;
            const canUse = xpToEvo !== null && hasCandy;
            if (xpToEvo !== null) {
                candyBtn.style.display = '';
                candyBtn.disabled = !canUse;
                candyBtn.textContent = `🍬 Rare Candy (${trainer?.rareCandy ?? 0})`;
            } else {
                candyBtn.style.display = 'none';
            }
        }

        const sellBtn = document.getElementById('btn-sell');
        if (sellBtn) sellBtn.textContent = '📦 Recuperar';
    }

    hideTowerInfo() {
        if (this.towerInfoPanel) this.towerInfoPanel.classList.remove('visible');
        // NOTE: do NOT null _pickupHandler/_evolveHandler/_candyHandler here.
        // They are persistent closures set once in ScenePlay._bindUI().
    }

    bindPickupHandler(handler) { this._pickupHandler = handler; }
    bindEvolveHandler(handler) { this._evolveHandler = handler; }
    bindCandyHandler(handler) { this._candyHandler = handler; }
    bindSpecialHandler(handler) { this._specialHandler = handler; }

    // ─── Pokédex ──────────────────────────────────────────────────────────────

    updatePokedex(pokedexMap) {
        if (!this._pokedexGrid) return;
        const count = pokedexMap.size;
        if (this._pokedexCount) this._pokedexCount.textContent = `${count}/151`;
        this._pokedexGrid.innerHTML = '';
        if (count === 0) {
            this._pokedexGrid.innerHTML = '<span style="font-size:10px;color:var(--text-dim);font-style:italic">¡Captura para llenar tu Pokédex!</span>';
            return;
        }
        for (const [id, entry] of pokedexMap) {
            const img = document.createElement('img');
            img.src = getSpriteUrl(id);
            img.title = `${entry.name} ×${entry.count}`;
            img.alt = entry.name;
            img.style.cssText = 'width:28px;height:28px;image-rendering:pixelated';
            this._pokedexGrid.appendChild(img);
        }
    }

    // ─── Menu ─────────────────────────────────────────────────────────────────

    showMenu() {
        if (this.menuOverlay) this.menuOverlay.classList.remove('hidden');
        document.querySelectorAll('.starter-btn').forEach(b => b.classList.remove('selected'));
        if (this.btnPlay) this.btnPlay.disabled = true;
    }

    hideMenu() {
        if (this.menuOverlay) this.menuOverlay.classList.add('hidden');
    }



    showRoundClear({ captured = 0, escaped = 0, xpGained = 0, pokeballsGained = 0 }) {
        if (!this._roundClearEl) return;
        this._roundClearEl.innerHTML = `
          <div style="font-weight:800;font-size:15px;margin-bottom:6px">Round cleared!</div>
          <div style="font-size:11px;line-height:1.45">
            Captured: <b>${captured}</b><br>
            Escaped: <b>${escaped}</b><br>
            XP gained: <b>${xpGained}</b><br>
            Pokeballs gained: <b>${pokeballsGained}</b>
          </div>
        `;
        this._roundClearEl.classList.add('show');
        clearTimeout(this._roundClearTimer);
        this._roundClearTimer = setTimeout(() => this._roundClearEl.classList.remove('show'), 2400);
    }

    // ─── Toast ────────────────────────────────────────────────────────────────

    showMessage(text, durationMs = 2200) {
        if (!this._msgEl) return;
        this._msgEl.textContent = text;
        this._msgEl.classList.add('show');
        clearTimeout(this._msgTimer);
        this._msgTimer = setTimeout(() => this._msgEl.classList.remove('show'), durationMs);
    }
}
