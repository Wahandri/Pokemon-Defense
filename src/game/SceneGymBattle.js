import { CANVAS_W, CANVAS_H } from '../utils/constants.js';
import { getAttacksForType, getUnlockedAttacks } from '../data/pokemon_attacks.js';
import { getSpriteUrl } from '../data/pokemon.js';
import { typeMultiplier } from '../data/balance.js';
import { ImageCache } from '../utils/ImageCache.js';

const MENU_HEIGHT = 156;

export class SceneGymBattle {
    constructor(ctx, ui, trainer, gymZone, onWin, onExit) {
        this.ctx = ctx;
        this.ui = ui;
        this.trainer = trainer;
        this.gym = gymZone;
        this.onWin = onWin;
        this.onExit = onExit;

        this._gymRunning = true;
        this.enemies = [];

        this.state = 'menu'; // menu | attack | switch | message | ended
        this.turn = 'player';
        this.message = `¡${this.gym.leader} te desafía!`;
        this.messageTimer = 1000;

        this.menuButtons = [];
        this.optionButtons = [];

        this.playerTeam = trainer.party.map((slot) => this._buildBattlerFromSlot(slot, false));
        this.enemyTeam = (gymZone.waves ?? []).flat().map((spec, idx) => this._buildGymBattler(spec, idx));

        this.playerActive = this.playerTeam.findIndex(p => !p.fainted);
        this.enemyActive = this.enemyTeam.findIndex(p => !p.fainted);

        this._preloadSprites();
        this._updateHUD();
        this.ui.rebuildBackpackUI?.(this.trainer.party, null, true);
        this.ui.setStartWaveButton?.({ waveNum: 1, enabled: false, running: true, label: '⚔️ Combate de Gimnasio' });
    }

    _buildBattlerFromSlot(slot) {
        const level = slot.level ?? 5;
        const maxHp = 40 + level * 8;
        return {
            key: slot.id,
            name: slot.name,
            pokemonId: slot.pokemonId,
            type: slot.pokemonType,
            level,
            maxHp,
            hp: maxHp,
            slotId: slot.id,
            attacks: getUnlockedAttacks(slot.pokemonType, level),
            fainted: false,
        };
    }

    _buildGymBattler(spec, idx) {
        const level = Math.max(4, this.gym.recommendedLevel + idx);
        const maxHp = 45 + level * 8;
        return {
            key: `gym_${spec.speciesId}_${idx}`,
            name: spec.name,
            pokemonId: spec.speciesId,
            type: spec.pokemonType,
            level,
            maxHp,
            hp: maxHp,
            attacks: getAttacksForType(spec.pokemonType).filter(a => a.unlockLv <= 7),
            fainted: false,
        };
    }

    _preloadSprites() {
        const all = [...this.playerTeam, ...this.enemyTeam];
        for (const p of all) ImageCache.load(getSpriteUrl(p.pokemonId));
    }

    _updateHUD() {
        this.ui.updateHUD?.({
            pokeballs: this.trainer.pokeballs,
            coins: this.trainer.coins,
            wave: 'GYM',
            enemies: Math.max(0, this.enemyTeam.filter(p => !p.fainted).length),
            zone: this.gym.name,
            badges: this.trainer.badgeCount,
            captures: this.trainer.totalCaptures,
        });
        this.ui.updateSpecialSlots?.([], null);
    }

    update(dt) {
        if (this.state !== 'message') return;
        this.messageTimer -= dt;
        if (this.messageTimer > 0) return;

        if (this._checkEnd()) return;

        if (this.turn === 'enemy') {
            this._enemyTurn();
            return;
        }

        this.state = 'menu';
    }

    _checkEnd() {
        if (this.playerTeam.every(p => p.fainted)) {
            this.state = 'ended';
            this._showMessage('😵 Te has quedado sin Pokémon... Regresando al mapa.', 2200, () => this.onExit?.());
            return true;
        }
        if (this.enemyTeam.every(p => p.fainted)) {
            this.state = 'ended';
            this.trainer.addBadge(this.gym.badgeId);
            this.trainer.addXP(120);
            this._showMessage(`🏅 ¡Victoria! ${this.gym.badgeName} obtenida.`, 2600, () => this.onWin?.(this.gym));
            return true;
        }
        return false;
    }

    _enemyTurn() {
        const enemy = this.enemyTeam[this.enemyActive];
        const target = this.playerTeam[this.playerActive];
        if (!enemy || !target) return;
        const atk = enemy.attacks[Math.floor(Math.random() * enemy.attacks.length)] ?? enemy.attacks[0];
        this._performAttack(enemy, target, atk, false);
        if (this._checkFaint(target, false)) return;
        this.turn = 'player';
        this.state = 'menu';
    }

    _performAttack(attacker, defender, attack, isPlayer) {
        const stab = 1.1;
        const eff = typeMultiplier(attacker.type, defender.type);
        const base = ((12 + attacker.level * 1.6) * (attack?.dmgMult ?? 1)) - defender.level * 0.35;
        const dmg = Math.max(3, Math.round(base * stab * eff * (0.9 + Math.random() * 0.2)));
        defender.hp = Math.max(0, defender.hp - dmg);

        let msg = `${attacker.name} usó ${attack?.name ?? 'Placaje'} · ${dmg} de daño.`;
        if (eff > 1) msg += ' ¡Súper eficaz!';
        if (eff < 1) msg += ' No es muy eficaz...';
        this._showMessage(msg, 1200);
        this.turn = isPlayer ? 'enemy' : 'player';
    }

    _checkFaint(target, isEnemyTarget) {
        if (target.hp > 0 || target.fainted) return false;
        target.fainted = true;
        this._showMessage(`💫 ${target.name} se debilitó.`, 1200);

        if (isEnemyTarget) {
            this.enemyActive = this.enemyTeam.findIndex(p => !p.fainted);
            if (this.enemyActive >= 0) {
                const next = this.enemyTeam[this.enemyActive];
                this._showMessage(`👤 ${this.gym.leader} envía a ${next.name}!`, 1100);
            }
        } else {
            this.playerActive = this.playerTeam.findIndex(p => !p.fainted);
            if (this.playerActive >= 0) {
                const next = this.playerTeam[this.playerActive];
                this._showMessage(`🔄 Adelante, ${next.name}!`, 1000);
            }
        }

        this._checkEnd();
        return true;
    }

    _showMessage(text, duration = 1000, done = null) {
        this.state = 'message';
        this.message = text;
        this.messageTimer = duration;
        if (done) setTimeout(done, duration + 50);
    }

    onClick(x, y) {
        if (this.state === 'ended' || this.state === 'message') return;

        const buttons = this.state === 'menu' ? this.menuButtons : this.optionButtons;
        const hit = buttons.find(b => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
        if (!hit) return;

        if (this.state === 'menu') {
            if (hit.key === 'fight') {
                this.state = 'attack';
            } else if (hit.key === 'pokemon') {
                this.state = 'switch';
            } else if (hit.key === 'run') {
                this._showMessage('🚫 ¡No puedes huir de un combate de Gimnasio!', 1100);
            }
            return;
        }

        if (this.state === 'attack') {
            const player = this.playerTeam[this.playerActive];
            const enemy = this.enemyTeam[this.enemyActive];
            if (!player || !enemy) return;
            this._performAttack(player, enemy, hit.attack, true);
            if (this._checkFaint(enemy, true)) return;
        }

        if (this.state === 'switch') {
            if (hit.index === this.playerActive) {
                this._showMessage('Ese Pokémon ya está en combate.', 900);
                return;
            }
            this.playerActive = hit.index;
            const active = this.playerTeam[this.playerActive];
            this._showMessage(`🔄 ¡${active.name}, te elijo a ti!`, 900);
            this.turn = 'enemy';
        }
    }

    onMouseMove() {}
    onRightClick() {}
    onKeyDown(key) {
        if (key === 'Escape' && this.state !== 'ended') {
            this.state = 'menu';
        }
    }

    render() {
        const ctx = this.ctx;
        ctx.fillStyle = '#d9f0c7';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H - MENU_HEIGHT);
        ctx.fillStyle = '#9bb07f';
        ctx.fillRect(0, CANVAS_H - MENU_HEIGHT, CANVAS_W, MENU_HEIGHT);

        this._drawArena();
        this._drawHud();
        this._drawBottomUI();
    }

    _drawArena() {
        const ctx = this.ctx;
        const enemy = this.enemyTeam[this.enemyActive];
        const player = this.playerTeam[this.playerActive];
        if (enemy) this._drawSprite(enemy, 690, 190, 132, true);
        if (player) this._drawSprite(player, 220, 320, 148, false);
    }

    _drawSprite(pokemon, x, y, size, flip = false) {
        const ctx = this.ctx;
        const img = ImageCache.get(getSpriteUrl(pokemon.pokemonId));
        ctx.save();
        if (flip) {
            ctx.translate(x, y);
            ctx.scale(-1, 1);
            if (img) ctx.drawImage(img, -size / 2, -size / 2, size, size);
        } else if (img) {
            ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
        }
        ctx.restore();
    }

    _drawHud() {
        const enemy = this.enemyTeam[this.enemyActive];
        const player = this.playerTeam[this.playerActive];
        if (enemy) this._drawHpBox(enemy, 500, 60, 320, true);
        if (player) this._drawHpBox(player, 60, 250, 340, false);
    }

    _drawHpBox(pokemon, x, y, w) {
        const ctx = this.ctx;
        ctx.fillStyle = '#f8f8f8';
        ctx.strokeStyle = '#303030';
        ctx.lineWidth = 2;
        ctx.fillRect(x, y, w, 92);
        ctx.strokeRect(x, y, w, 92);

        ctx.fillStyle = '#111';
        ctx.font = 'bold 20px monospace';
        ctx.fillText(`${pokemon.name}  Lv${pokemon.level}`, x + 16, y + 28);

        const pct = Math.max(0, pokemon.hp / pokemon.maxHp);
        ctx.fillStyle = '#222';
        ctx.fillRect(x + 16, y + 42, w - 32, 20);
        ctx.fillStyle = pct > 0.5 ? '#47b347' : pct > 0.25 ? '#d3b534' : '#d9534f';
        ctx.fillRect(x + 16, y + 42, (w - 32) * pct, 20);

        ctx.fillStyle = '#111';
        ctx.font = '15px monospace';
        ctx.fillText(`${pokemon.hp}/${pokemon.maxHp} HP`, x + 16, y + 78);
    }

    _drawBottomUI() {
        const ctx = this.ctx;
        const y = CANVAS_H - MENU_HEIGHT;

        ctx.fillStyle = '#f8f8f8';
        ctx.fillRect(0, y, CANVAS_W, MENU_HEIGHT);
        ctx.strokeStyle = '#2a2a2a';
        ctx.lineWidth = 3;
        ctx.strokeRect(0, y, CANVAS_W, MENU_HEIGHT);

        ctx.fillStyle = '#111';
        ctx.font = 'bold 20px monospace';
        ctx.fillText(this.message ?? 'Elige una acción.', 24, y + 34);

        this.menuButtons = [];
        this.optionButtons = [];

        if (this.state === 'menu') {
            this._drawButton({ key: 'fight', label: 'LUCHAR', x: 560, y: y + 18, w: 180, h: 50 });
            this._drawButton({ key: 'pokemon', label: 'POKÉMON', x: 750, y: y + 18, w: 180, h: 50 });
            this._drawButton({ key: 'run', label: 'HUIR', x: 655, y: y + 78, w: 180, h: 50 });
        } else if (this.state === 'attack') {
            const player = this.playerTeam[this.playerActive];
            const attacks = player?.attacks ?? [];
            attacks.slice(0, 4).forEach((atk, idx) => {
                const col = idx % 2;
                const row = Math.floor(idx / 2);
                this._drawOptionButton({ attack: atk, label: `${atk.emoji} ${atk.name}`, x: 520 + col * 210, y: y + 18 + row * 58, w: 200, h: 50 });
            });
        } else if (this.state === 'switch') {
            this.playerTeam.forEach((p, idx) => {
                if (p.fainted) return;
                this._drawOptionButton({ index: idx, label: `${p.name} Lv${p.level} (${p.hp}/${p.maxHp})`, x: 500, y: y + 14 + idx * 24, w: 430, h: 22 });
            });
        }
    }

    _drawButton(btn) {
        const ctx = this.ctx;
        ctx.fillStyle = '#e8e8f8';
        ctx.strokeStyle = '#2d3f75';
        ctx.lineWidth = 2;
        ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
        ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);
        ctx.fillStyle = '#1e2f66';
        ctx.font = 'bold 20px monospace';
        ctx.fillText(btn.label, btn.x + 18, btn.y + 32);
        this.menuButtons.push(btn);
    }

    _drawOptionButton(btn) {
        const ctx = this.ctx;
        ctx.fillStyle = '#f5f5ff';
        ctx.strokeStyle = '#47517a';
        ctx.lineWidth = 1.5;
        ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
        ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);
        ctx.fillStyle = '#111';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(btn.label, btn.x + 10, btn.y + Math.min(20, btn.h - 8));
        this.optionButtons.push(btn);
    }

    destroy() {
        this.ui.setStartWaveButton?.({ waveNum: 1, enabled: false, running: false, label: '▶ Lanzar Ronda 1' });
    }
}
