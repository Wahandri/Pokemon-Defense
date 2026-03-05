// ─── UI Manager (Team Rocket / Pokémon theme) ──────────────────────────────────
import { TOWER_DEFS } from '../entities/Tower.js';
import { getSpriteUrl } from '../data/pokemon.js';

export class UI {
    constructor() {
        this.valMoney = document.getElementById('val-money');
        this.valLives = document.getElementById('val-lives');
        this.valWave = document.getElementById('val-wave');
        this.valEnemies = document.getElementById('val-enemies');

        this.btnStartWave = document.getElementById('btn-start-wave');
        this.btnPause = document.getElementById('btn-pause');
        this.btnReset = document.getElementById('btn-reset');
        this.btnSpeed1 = document.getElementById('btn-speed1');
        this.btnSpeed2 = document.getElementById('btn-speed2');
        this.btnSpeed4 = document.getElementById('btn-speed4');

        this.towerBtns = {
            dart: document.getElementById('tower-btn-dart'),
            cannon: document.getElementById('tower-btn-cannon'),
            ice: document.getElementById('tower-btn-ice'),
            sniper: document.getElementById('tower-btn-sniper'),
            laser: document.getElementById('tower-btn-laser'),
            mortar: document.getElementById('tower-btn-mortar'),
        };

        this.towerInfoPanel = document.getElementById('tower-info');
        this.towerInfoIcon = document.getElementById('tower-info-icon');
        this.towerInfoName = document.getElementById('tower-info-name');
        this.towerInfoLevel = document.getElementById('tower-info-level');
        this.towerStats = document.getElementById('tower-stats');
        this.upgradeBtns = document.getElementById('upgrade-btns');
        this.btnSell = document.getElementById('btn-sell');

        this.menuOverlay = document.getElementById('menu-overlay');
        this.bestScoreDisplay = document.getElementById('best-score-display');
        this.btnPlay = document.getElementById('btn-play');
        this.pausedBanner = document.getElementById('paused-banner');
        this._msgEl = document.getElementById('msg');
        this._msgTimer = null;

        // Pokédex
        this._pokedexGrid = document.getElementById('pokedex-grid');
        this._pokedexCount = document.getElementById('pokedex-count');

        // Upgrade event delegation
        this._upgradeHandler = null;
        this._sellHandler = null;

        this.upgradeBtns.addEventListener('click', (e) => {
            const btn = e.target.closest('.upgrade-btn');
            if (btn && !btn.disabled && this._upgradeHandler) this._upgradeHandler(btn.dataset.key);
        });
        this.btnSell.addEventListener('click', () => { if (this._sellHandler) this._sellHandler(); });
    }

    // ─── HUD ──────────────────────────────────────────────────────────────────

    updateHUD({ money, lives, wave, enemies, totalWaves }) {
        this.valMoney.textContent = money;
        this.valLives.textContent = lives;
        this.valWave.textContent = totalWaves ? `${wave}/${totalWaves}` : wave;
        this.valEnemies.textContent = enemies;
    }

    setStartWaveButton({ waveNum, enabled, running, allDone }) {
        const btn = this.btnStartWave;
        if (allDone) { btn.textContent = '🏆 ¡Victoria!'; btn.disabled = true; }
        else if (running) { btn.textContent = `⚔️ Oleada ${waveNum} en curso…`; btn.disabled = true; }
        else { btn.textContent = `▶ Lanzar Operación ${waveNum}`; btn.disabled = !enabled; }
    }

    setPaused(paused) {
        this.btnPause.textContent = paused ? '▶ Reanudar' : '⏸ Pausa';
        this.btnPause.classList.toggle('active', paused);
        this.pausedBanner.classList.toggle('show', paused);
    }

    setSpeed(speed) {
        [1, 2, 4].forEach(s => {
            const btn = document.getElementById(`btn-speed${s}`);
            if (btn) btn.classList.toggle('active', speed === s);
        });
    }

    updateTowerSelector(selectedType, money) {
        for (const [type, btn] of Object.entries(this.towerBtns)) {
            if (!btn) continue;
            const cost = TOWER_DEFS[type]?.cost ?? 0;
            btn.classList.toggle('selected', type === selectedType);
            btn.classList.toggle('unaffordable', money < cost);
        }
    }

    clearTowerSelection() {
        for (const btn of Object.values(this.towerBtns)) { if (btn) btn.classList.remove('selected'); }
    }

    // ─── Tower info panel ─────────────────────────────────────────────────────

    showTowerInfo(tower, money, onUpgrade, onSell) {
        this._upgradeHandler = onUpgrade;
        this._sellHandler = onSell;
        this.towerInfoPanel.classList.add('visible');
        this.towerInfoIcon.textContent = tower.emoji;
        this.towerInfoIcon.style.background = tower.bgColor;
        this.towerInfoName.textContent = tower.label;
        this.towerInfoLevel.textContent = `Nivel ${tower.upgradeLevel + 1}`;

        const stats = [
            { label: '🎯 Daño', value: tower.damage.toFixed(1) },
            { label: '📡 Alcance', value: tower.range.toFixed(0) },
            { label: '⚡ Cadencia', value: tower.fireRate.toFixed(2) + '/s' },
            { label: '💰 Invertido', value: `$${tower.totalCost}` },
        ];
        if (tower.areaRadius > 0)
            stats.push({ label: '💣 Área', value: tower.areaRadius.toFixed(0) + 'px' });
        if (tower.pierceCount > 1)
            stats.push({ label: '🔗 Penetra', value: `${tower.pierceCount} Pokémon` });
        this.towerStats.innerHTML = stats.map(s =>
            `<div class="stat-item"><div class="stat-label">${s.label}</div><div class="stat-value">${s.value}</div></div>`
        ).join('');

        const available = tower.getAvailableUpgrades();
        if (available.length === 0) {
            this.upgradeBtns.innerHTML = '<div style="font-size:11px;color:var(--text-dim)">Agente al máximo nivel ✨</div>';
        } else {
            this.upgradeBtns.innerHTML = available.map(upg => {
                const canAfford = money >= upg.cost;
                const preview = tower.previewUpgrade(upg);
                const diffs = Object.entries(preview).map(([stat, newVal]) => {
                    const labels = {
                        damage: 'Daño', range: 'Alcance', fireRate: 'Cadencia',
                        areaRadius: 'Área', pierceCount: 'Penetra',
                        slowAmount: 'Slow', slowDuration: 'Dur.Slow'
                    };
                    const lbl = labels[stat] || stat;
                    const cur = tower[stat] ?? 0;
                    const fmt = v => stat === 'fireRate' ? v.toFixed(2) + '/s'
                        : stat === 'slowAmount' ? (v * 100).toFixed(0) + '%'
                            : stat === 'slowDuration' ? (v / 1000).toFixed(1) + 's'
                                : typeof v === 'number' ? v.toFixed(stat === 'range' || stat === 'areaRadius' ? 0 : 1)
                                    : v;
                    return `<span style="color:var(--text-dim)">${lbl}: </span><span style="color:#aaa">${fmt(cur)}</span><span style="color:#3fb950"> → ${fmt(newVal)}</span>`;
                }).join('<br>');
                return `
          <button class="upgrade-btn" data-key="${upg.key}" ${canAfford ? '' : 'disabled'}>
            <div class="upgrade-btn-label">[${upg.key}] ${upg.label}</div>
            <div class="upgrade-btn-desc" style="font-size:10px;margin-top:3px;line-height:1.7">${diffs}</div>
            <div class="upgrade-btn-cost ${canAfford ? '' : 'cant-afford'}">$${upg.cost}</div>
          </button>`;
            }).join('');
        }
    }

    refreshUpgradeAffordability(money, tower) {
        if (!tower) return;
        const available = tower.getAvailableUpgrades();
        this.upgradeBtns.querySelectorAll('.upgrade-btn[data-key]').forEach(btn => {
            const upg = available.find(u => u.key === btn.dataset.key);
            if (upg) btn.disabled = money < upg.cost;
        });
        this.btnSell.textContent = `💸 Liberar ($${tower.getSellValue()})`;
    }

    hideTowerInfo() {
        this.towerInfoPanel.classList.remove('visible');
        this._upgradeHandler = null; this._sellHandler = null;
    }

    // ─── Pokédex ──────────────────────────────────────────────────────────────

    updatePokedex(pokedexMap) {
        if (!this._pokedexGrid) return;
        const count = pokedexMap.size;
        if (this._pokedexCount) this._pokedexCount.textContent = `${count} capturado${count !== 1 ? 's' : ''}`;
        this._pokedexGrid.innerHTML = '';
        for (const [id, entry] of pokedexMap) {
            const img = document.createElement('img');
            img.src = getSpriteUrl(id);
            img.title = `${entry.name} ×${entry.count}`;
            img.alt = entry.name;
            img.style.cssText = `width:32px;height:32px;image-rendering:pixelated;filter:drop-shadow(0 0 3px ${entry.color})`;
            this._pokedexGrid.appendChild(img);
        }
    }

    // ─── Menu ─────────────────────────────────────────────────────────────────

    showMenu(bestScore) {
        this.menuOverlay.classList.remove('hidden');
        this.bestScoreDisplay.textContent = bestScore > 0 ? `🏆 Mejor Oleada: ${bestScore}` : '';
    }

    hideMenu() { this.menuOverlay.classList.add('hidden'); }

    // ─── Toast ────────────────────────────────────────────────────────────────

    showMessage(text, durationMs = 2200) {
        this._msgEl.textContent = text;
        this._msgEl.classList.add('show');
        clearTimeout(this._msgTimer);
        this._msgTimer = setTimeout(() => this._msgEl.classList.remove('show'), durationMs);
    }
}
