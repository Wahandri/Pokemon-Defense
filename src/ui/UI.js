// ─── UI Manager ───────────────────────────────────────────────────────────────
import { getSpriteUrl } from '../data/pokemon.js';
import { EVOLUTION_CHAIN, xpToNextLevel } from '../data/balance.js';
import { getAttacksForType, getUnlockedAttacks, MODE_LABELS } from '../data/pokemon_attacks.js';

export class UI {
    constructor() {
        // Header stats
        this.valCoins     = document.getElementById('val-coins');
        this.valPokeballs = document.getElementById('val-pokeballs');
        this.valWave      = document.getElementById('val-wave');

        // Sidebar controls
        this.btnStartWave = document.getElementById('btn-start-wave');
        this.btnPause     = document.getElementById('btn-pause');
        this.btnReset     = document.getElementById('btn-reset');
        this.btnSpeed1    = document.getElementById('btn-speed1');
        this.btnSpeed2    = document.getElementById('btn-speed2');
        this.btnSpeed4    = document.getElementById('btn-speed4');
        this.specialSlots = document.getElementById('special-slots');

        // Tower info panel (sidebar)
        this.towerInfoPanel  = document.getElementById('tower-info');
        this.towerInfoName   = document.getElementById('tower-info-name');
        this.towerInfoSprite = document.getElementById('tower-info-sprite');
        this.towerInfoStats  = document.getElementById('tower-stats');

        // Pokédex
        this._pokedexGrid  = document.getElementById('pokedex-grid');
        this._pokedexCount = document.getElementById('pokedex-count');

        // Menu / overlays
        this.menuOverlay  = document.getElementById('menu-overlay');
        this.btnPlay      = document.getElementById('btn-play');
        this.pausedBanner = document.getElementById('paused-banner');

        // Toast & round clear
        this._msgEl          = document.getElementById('msg');
        this._msgTimer       = null;
        this._roundClearEl   = document.getElementById('round-clear');
        this._roundClearTimer = null;

        // ── Handlers set from ScenePlay ───────────────────────────────────────
        this._pickupHandler  = null;
        this._evolveHandler  = null;
        this._specialHandler = null;

        // Recuperar / Sell button (sidebar tower panel)
        const sellBtn = document.getElementById('btn-sell');
        if (sellBtn) sellBtn.addEventListener('click', () => this._pickupHandler?.());

        // Evolucionar button
        const evoBtn = document.getElementById('btn-evolve');
        if (evoBtn) evoBtn.addEventListener('click', () => this._evolveHandler?.());

        this._buildSpecialSlotButtons();
    }

    _buildSpecialSlotButtons() {
        if (!this.specialSlots) return;
        this.specialSlots.innerHTML = '';
        for (let i = 0; i < 6; i++) {
            const btn = document.createElement('button');
            btn.className = 'btn-secondary special-slot-btn';
            btn.innerHTML = `<span style="font-size:9px;color:var(--text-dim);font-family:'Orbitron',sans-serif">S${i + 1}</span>`;
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
                btn.className = 'btn-secondary special-slot-btn';
                btn.innerHTML = `<span style="font-size:9px;color:var(--text-dim);font-family:'Orbitron',sans-serif">S${i + 1}</span>`;
                continue;
            }
            const ab = abilities?.[tower.specialKey];
            const cooldownPct = tower.getSpecialCooldownPct?.(now) ?? 1;
            const ready = tower.isSpecialReady?.(now);
            btn.disabled = false;
            btn.className = `btn-secondary special-slot-btn ${ready ? 'special-ready' : ''}`;
            btn.title = `${tower.pokemonName}\n${ab?.label ?? tower.specialKey}${ready ? ' — LISTO' : ' — enfriando'}`;
            btn.innerHTML = `
              <img src="${getSpriteUrl(tower.pokemonId)}" width="36" height="36" style="image-rendering:pixelated;z-index:1;display:block">
              <div class="special-cd-fill" style="height:${Math.round(cooldownPct * 100)}%"></div>
              <div class="special-emoji">${ab?.emoji ?? '✨'}</div>
              <div class="special-status" style="color:${ready ? '#3fb950' : '#e3b341'}">${ready ? '▶' : '…'}</div>
              <div class="special-name">${ab?.label?.split(' ')[0] ?? ''}</div>
            `;
        }
    }

    // ─── HUD (header stats) ───────────────────────────────────────────────────

    updateHUD({ pokeballs, coins, wave, enemies, zone, badges, captures }) {
        if (this.valPokeballs) this.valPokeballs.textContent = pokeballs;
        if (this.valCoins)     this.valCoins.textContent = coins ?? 0;
        if (this.valWave)      this.valWave.textContent = wave;

        // Sidebar-only extras
        const enemiesEl = document.getElementById('val-enemies');
        if (enemiesEl) enemiesEl.textContent = enemies;
        const zoneEl = document.getElementById('val-zone');
        if (zoneEl && zone) zoneEl.textContent = zone;
        const badgeEl = document.getElementById('val-badges');
        if (badgeEl && badges !== undefined) badgeEl.textContent = '🏅'.repeat(badges) || '—';
        const capturesEl = document.getElementById('val-captures');
        if (capturesEl && captures !== undefined) capturesEl.textContent = captures;
    }

    setStartWaveButton({ waveNum, enabled, running, label = null }) {
        const btn = this.btnStartWave;
        if (!btn) return;
        if (running) {
            btn.textContent = label ?? `🌊 Ronda ${waveNum - 1} en curso…`;
            btn.disabled = true;
            btn.classList.remove('pulse');
        } else {
            btn.textContent = label ?? `▶ Lanzar Ronda ${waveNum}`;
            btn.disabled = !enabled;
            btn.classList.toggle('pulse', !!enabled);
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

    // ─── Backpack modal (party list) ──────────────────────────────────────────

    rebuildBackpackUI(backpack, selectedSlotId, roundRunning) {
        const container = document.getElementById('tower-buttons');
        if (!container) return;
        container.innerHTML = '';

        if (backpack.length === 0) {
            container.innerHTML = '<span style="font-size:11px;color:var(--text-dim)">¡Captura Pokémon para usarlos como torres!</span>';
            return;
        }

        for (const slot of backpack) {
            const lv = slot.level ?? 1;
            const xpNeeded = lv < 100 ? xpToNextLevel(lv) : 0;
            const xpCur = slot.xp ?? 0;
            const xpPct = xpNeeded > 0 ? Math.min(100, Math.round((xpCur / xpNeeded) * 100)) : 100;
            const evo = EVOLUTION_CHAIN[slot.pokemonId];
            const canEvoLevel = evo?.evolvesAtLevel && lv >= evo.evolvesAtLevel;
            const canEvoItem  = evo?.evolvesWithItem || evo?.itemEvolutions;
            const canEvo = canEvoLevel || canEvoItem;
            const isMaxLv = lv >= 100;

            const btn = document.createElement('button');
            btn.className = 'tower-btn';
            if (slot.id === selectedSlotId) btn.classList.add('selected');
            if (slot.placed || roundRunning) btn.classList.add('unaffordable');
            if (canEvo) btn.classList.add('can-evolve');

            const statusIcon = slot.placed ? '📌 ' : '';
            const lvColor = lv >= 55 ? '#ff6b6b' : lv >= 32 ? '#ffd700' : lv >= 16 ? '#a371f7' : '#3fb950';
            const xpBarColor = isMaxLv ? '#ffd700' : (xpPct >= 80 ? '#3fb950' : '#a371f7');
            const xpBarHTML = `<div style="height:3px;background:rgba(255,255,255,0.1);border-radius:2px;margin-top:2px">
                     <div style="height:3px;background:${xpBarColor};width:${xpPct}%;border-radius:2px;transition:width .3s"></div>
                   </div>`;

            let evoHint = '';
            if (canEvoItem) evoHint = `<span style="font-size:8px;color:#e3b341">🪨 ${evo.evolvesWithItem ?? '?'}</span>`;
            else if (canEvoLevel) evoHint = `<span style="font-size:8px;color:#f0c040">⭐ Puede evolucionar</span>`;

            btn.innerHTML = `
              <img src="${getSpriteUrl(slot.pokemonId)}" width="28" height="28" style="image-rendering:pixelated;flex-shrink:0">
              <div class="tower-info">
                <div class="tower-name">${statusIcon}${slot.name} <span style="color:${lvColor};font-size:9px">Nv${lv}</span></div>
                <div class="tower-cost" style="color:var(--text-dim);font-size:10px">${slot.pokemonType}${isMaxLv ? ' · MAX' : ` · ${xpCur}/${xpNeeded} XP`}</div>
                ${evoHint}
                ${xpBarHTML}
              </div>
            `;
            btn.disabled = slot.placed || roundRunning;
            btn.addEventListener('click', () => {
                btn.dispatchEvent(new CustomEvent('backpack-select', {
                    bubbles: true, detail: { slotId: slot.id }
                }));
            });
            container.appendChild(btn);
        }
    }

    bindBackpackSelect(handler) {
        document.addEventListener('backpack-select', (e) => handler(e.detail.slotId));
    }

    // ─── Tower Info Panel (sidebar, shown when tower selected) ───────────────

    showTowerInfoPokemon(tower, slot, trainer) {
        if (!this.towerInfoPanel) return;
        this.towerInfoPanel.classList.add('visible');
        if (this.towerInfoName) this.towerInfoName.textContent = tower.pokemonName;
        if (this.towerInfoSprite) this.towerInfoSprite.src = getSpriteUrl(tower.pokemonId);

        const lv = slot?.level ?? 1;
        const slotXP = slot?.xp ?? 0;
        const xpNeeded = lv < 100 ? xpToNextLevel(lv) : 0;
        const xpPct = xpNeeded > 0 ? Math.min(100, Math.round((slotXP / xpNeeded) * 100)) : 100;

        // Attack selector
        const allAttacks = getAttacksForType(tower.pokemonType);
        const currentIdx = slot?.currentAttackIdx ?? tower.currentAttackIdx ?? 0;
        const attackSelectorHTML = `
          <div style="grid-column:span 2;margin-top:4px">
            <div style="font-size:9px;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Ataque activo</div>
            <div id="attack-selector-${slot?.id ?? tower.slotId}">
              ${allAttacks.map((atk, i) => {
                  const unlocked = atk.unlockLv <= lv;
                  const active = i === currentIdx;
                  return `<button class="attack-btn${active ? ' active' : ''}${!unlocked ? ' locked' : ''}"
                    data-slot="${slot?.id ?? tower.slotId}" data-idx="${i}"
                    ${!unlocked ? 'disabled' : ''}
                    title="${!unlocked ? 'Desbloquea en Nv.' + atk.unlockLv : MODE_LABELS[atk.mode] ?? atk.mode}">
                    ${atk.emoji} ${atk.name}
                    <span style="font-size:9px;opacity:.55;margin-left:auto">${MODE_LABELS[atk.mode] ?? atk.mode}</span>
                    ${!unlocked ? `<span style="font-size:9px;color:#a371f7;margin-left:4px">Nv.${atk.unlockLv}</span>` : ''}
                  </button>`;
              }).join('')}
            </div>
          </div>`;

        if (this.towerInfoStats) {
            const xpBarHTML = `
              <div style="grid-column:span 2;background:rgba(255,255,255,0.06);border-radius:6px;padding:5px 7px">
                <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--text-dim);margin-bottom:3px">
                  <span>📈 XP (Nv ${lv}${lv >= 100 ? ' MAX' : ''})</span>
                  <span>${lv < 100 ? `${slotXP}/${xpNeeded}` : 'MAX'}</span>
                </div>
                <div style="height:5px;background:rgba(255,255,255,0.1);border-radius:3px">
                  <div style="height:5px;background:${lv >= 100 ? '#ffd700' : '#a371f7'};width:${xpPct}%;border-radius:3px;transition:width .4s"></div>
                </div>
              </div>`;
            this.towerInfoStats.innerHTML = `
              <div class="stat-item"><div class="stat-label">🎯 Daño</div><div class="stat-value">${tower.damage.toFixed(0)}</div></div>
              <div class="stat-item"><div class="stat-label">📡 Alcance</div><div class="stat-value">${tower.range.toFixed(0)}</div></div>
              <div class="stat-item"><div class="stat-label">⚡ Cadencia</div><div class="stat-value">${tower.fireRate.toFixed(1)}/s</div></div>
              <div class="stat-item"><div class="stat-label">🔤 Tipo</div><div class="stat-value">${tower.pokemonType}</div></div>
              ${xpBarHTML}
              ${attackSelectorHTML}
            `;

            const selectorEl = this.towerInfoStats.querySelector(`#attack-selector-${slot?.id ?? tower.slotId}`);
            if (selectorEl) {
                selectorEl.addEventListener('click', (e) => {
                    const btn = e.target.closest('.attack-btn');
                    if (!btn || btn.disabled) return;
                    const slotId = btn.dataset.slot;
                    const idx = parseInt(btn.dataset.idx, 10);
                    this._attackHandler?.(slotId, idx);
                });
            }
        }

        // Evolucionar button — show only for level-based evolution
        const evoBtn = document.getElementById('btn-evolve');
        if (evoBtn) evoBtn.style.display = 'none';

        const sellBtn = document.getElementById('btn-sell');
        if (sellBtn) sellBtn.textContent = '📦 Recuperar';
    }

    hideTowerInfo() {
        if (this.towerInfoPanel) this.towerInfoPanel.classList.remove('visible');
    }

    bindPickupHandler(handler)  { this._pickupHandler = handler; }
    bindEvolveHandler(handler)  { this._evolveHandler = handler; }
    bindCandyHandler(_handler)  { /* removed — no-op for backward compat */ }
    bindSpecialHandler(handler) { this._specialHandler = handler; }
    bindAttackHandler(handler)  { this._attackHandler = handler; }

    // ─── Pokédex ──────────────────────────────────────────────────────────────

    updatePokedex(pokedexMap) {
        if (!this._pokedexGrid) return;
        const count = pokedexMap.size;
        if (this._pokedexCount) this._pokedexCount.textContent = `${count}/151`;
        this._pokedexGrid.innerHTML = '';
        if (count === 0) {
            this._pokedexGrid.innerHTML = '<span style="font-size:10px;color:var(--text-dim);font-style:italic">¡Captura Pokémon para llenar tu Pokédex!</span>';
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

    showRoundClear({ captured = 0, escaped = 0, xpGained = 0, pokeballsGained = 0, coinsGained = 0 }) {
        if (!this._roundClearEl) return;
        const perfect = escaped === 0 && captured > 0;
        this._roundClearEl.innerHTML = `
          <div style="font-weight:800;font-size:13px;color:${perfect ? '#3fb950' : '#e3b341'};margin-bottom:8px;font-family:'Orbitron',sans-serif;letter-spacing:1px">
            ${perfect ? '🎉 RONDA PERFECTA' : '✅ Ronda Completada'}
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px">
            <div style="background:rgba(63,185,80,.1);border:1px solid rgba(63,185,80,.25);border-radius:7px;padding:5px 8px;text-align:center">
              <div style="color:#3fb950;font-family:'Orbitron',sans-serif;font-size:15px;font-weight:700">${captured}</div>
              <div style="color:#708070;font-size:9px;margin-top:1px;text-transform:uppercase;letter-spacing:.5px">Capturados</div>
            </div>
            <div style="background:rgba(248,81,73,.1);border:1px solid rgba(248,81,73,.25);border-radius:7px;padding:5px 8px;text-align:center">
              <div style="color:#f85149;font-family:'Orbitron',sans-serif;font-size:15px;font-weight:700">${escaped}</div>
              <div style="color:#708070;font-size:9px;margin-top:1px;text-transform:uppercase;letter-spacing:.5px">Escapados</div>
            </div>
            <div style="background:rgba(163,113,247,.1);border:1px solid rgba(163,113,247,.25);border-radius:7px;padding:5px 8px;text-align:center">
              <div style="color:#a371f7;font-family:'Orbitron',sans-serif;font-size:15px;font-weight:700">+${xpGained}</div>
              <div style="color:#708070;font-size:9px;margin-top:1px;text-transform:uppercase;letter-spacing:.5px">XP Torre</div>
            </div>
            <div style="background:rgba(227,179,65,.1);border:1px solid rgba(227,179,65,.25);border-radius:7px;padding:5px 8px;text-align:center">
              <div style="color:#e3b341;font-family:'Orbitron',sans-serif;font-size:15px;font-weight:700">+${coinsGained}</div>
              <div style="color:#708070;font-size:9px;margin-top:1px;text-transform:uppercase;letter-spacing:.5px">💰 Monedas</div>
            </div>
          </div>
        `;
        this._roundClearEl.classList.add('show');
        clearTimeout(this._roundClearTimer);
        this._roundClearTimer = setTimeout(() => this._roundClearEl.classList.remove('show'), 3500);
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
