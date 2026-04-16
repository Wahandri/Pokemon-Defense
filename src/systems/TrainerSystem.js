// ─── TrainerSystem ─────────────────────────────────────────────────────────────
// Trainer progression: level/XP, pokéballs, coins, inventory,
// party (max 6, can be placed as towers), pcBox (unlimited storage), Pokédex.

import { EVOLUTION_CHAIN, xpToNextLevel } from '../data/balance.js';
import { getSpriteUrl } from '../data/pokemon.js';
import { getUnlockedAttacks } from '../data/pokemon_attacks.js';

export class TrainerSystem {
    constructor() {
        this.reset();
    }

    reset() {
        this.pokeballs = 3;
        this.coins = 0;
        this.trainerXP = 0;

        /** Inventory: array of { itemType: string, quantity: number } */
        this.inventory = [];

        /** party: max 6, these can be placed as towers on the map */
        this.party = [];
        /** pcBox: unlimited, all captured Pokémon */
        this.pcBox = [];

        /** Pokédex: Map<pokemonId, {name, count}> */
        this.pokedex = new Map();

        /** Badges: Set<badgeId> */
        this.badges = new Set();

        /** Zone capture counters: Map<zoneId, count> */
        this.capturesPerZone = new Map();
        /** Total captured (excluding starter) */
        this.totalCaptures = 0;

        /** Flag: next wave gives double XP to all towers */
        this.doubleXPNextWave = false;
        /** Total rounds survived */
        this.totalRounds = 0;
        /** Best streak (consecutive non-escaped waves) */
        this.bestStreak = 0;
        this._currentStreak = 0;
    }

    // ── Backward compat alias ─────────────────────────────────────────────────
    /** @deprecated use party directly */
    get backpack() { return this.party; }

    // ─── Starter ──────────────────────────────────────────────────────────────

    initStarter(starterKey, starterConfig) {
        const slot = {
            id: `starter_${starterKey}`,
            pokemonId: starterConfig.pokemonId,
            name: starterConfig.label,
            pokemonType: starterConfig.pokemonType,
            starterKey,
            placed: false,
            level: 5,
            xp: 0,
            currentAttackIdx: 0,
        };
        this.party.push(slot);
        this.pcBox.push({ ...slot });
        this.registerPokedex(starterConfig.pokemonId, starterConfig.label);
    }

    // ─── Capture ──────────────────────────────────────────────────────────────

    addCaptured(enemy, zoneId = null) {
        const slot = {
            id: `cap_${enemy.pokemonId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            pokemonId: enemy.pokemonId,
            name: enemy.pokemonName,
            pokemonType: enemy.pokemonType,
            starterKey: null,
            placed: false,
            level: Math.min(enemy.wildLevel ?? 1, 100),
            xp: 0,
            currentAttackIdx: 0,
        };

        this.pcBox.push(slot);

        let addedToParty = false;
        if (this.party.length < 6) {
            this.party.push({ ...slot, id: slot.id + '_p' });
            addedToParty = true;
        }

        this.totalCaptures++;
        if (zoneId) {
            this.capturesPerZone.set(zoneId, (this.capturesPerZone.get(zoneId) ?? 0) + 1);
        }

        return { addedToParty, sentToPC: !addedToParty };
    }

    addXP(amount = 0) {
        this.trainerXP = Math.max(0, this.trainerXP + Math.max(0, amount));
        return this.trainerXP;
    }

    onEnemyEscape(enemy) {
        if (!enemy?.weakened) return { applied: false, reason: 'notWeakened' };

        if (this.trainerXP >= 10) {
            this.trainerXP -= 10;
            return { applied: true, penalty: 'xp', amount: 10 };
        }

        if (this.pokeballs > 0) {
            this.pokeballs -= 1;
            return { applied: true, penalty: 'pokeball', amount: 1 };
        }

        return { applied: false, reason: 'noResources' };
    }

    // ─── Party ↔ PC Box management ────────────────────────────────────────────

    swapPartyPC(partyIdx, pcBoxIdx) {
        const partySlot = this.party[partyIdx] ?? null;
        const pcSlot = this.pcBox[pcBoxIdx] ?? null;
        if (!pcSlot) return false;
        if (partySlot?.placed) return false;

        if (partySlot) {
            this.party[partyIdx] = { ...pcSlot, placed: false };
            this.pcBox[pcBoxIdx] = { ...partySlot, placed: false };
        } else {
            if (this.party.length < 6) {
                this.party.push({ ...pcSlot, placed: false });
                this.pcBox.splice(pcBoxIdx, 1);
            }
        }
        return true;
    }

    removeFromParty(partyIdx) {
        const slot = this.party[partyIdx];
        if (!slot || slot.placed) return false;
        this.party.splice(partyIdx, 1);
        return true;
    }

    addToParty(pcBoxIdx) {
        if (this.party.length >= 6) return false;
        const slot = this.pcBox[pcBoxIdx];
        if (!slot) return false;
        this.party.push({ ...slot, id: slot.id + '_p', placed: false });
        return true;
    }

    // ─── Pokédex ──────────────────────────────────────────────────────────────

    registerPokedex(pokemonId, name) {
        if (this.pokedex.has(pokemonId)) {
            this.pokedex.get(pokemonId).count++;
        } else {
            this.pokedex.set(pokemonId, { name, count: 1 });
        }
    }

    // ─── Slot XP (tower Pokémon, levels 1-100) ────────────────────────────────

    addXPToSlot(slotId, amount) {
        const slot = this._findSlot(slotId);
        if (!slot) return { leveledUp: false };
        if ((slot.level ?? 1) >= 100) return { leveledUp: false };

        const effectiveAmount = this.doubleXPNextWave ? amount * 2 : amount;

        slot.level = slot.level ?? 1;
        slot.xp = (slot.xp ?? 0) + effectiveAmount;

        let leveledUp = false;
        let evolved = false;
        let newEvolution = null;

        while (slot.level < 100) {
            const needed = xpToNextLevel(slot.level);
            if (slot.xp < needed) break;
            slot.xp -= needed;
            slot.level++;
            leveledUp = true;

            // Auto-evolve on level-based evolutions
            const evoEntry = EVOLUTION_CHAIN[slot.pokemonId];
            if (evoEntry?.evolvesAtLevel === slot.level) {
                newEvolution = this._applyEvolution(slot);
                if (newEvolution.ok) evolved = true;
            }
        }

        return { leveledUp, newLevel: slot.level, evolved, newEvolution };
    }

    _applyEvolution(slot, evoOverride = null) {
        const evoEntry = evoOverride ?? EVOLUTION_CHAIN[slot.pokemonId];
        if (!evoEntry) return { ok: false };
        // Handle itemEvolutions (Eevee etc.)
        const evo = evoEntry.itemEvolutions ? null : evoEntry;
        if (!evo && !evoOverride) return { ok: false, reason: 'needItem' };
        const target = evo ?? evoOverride;
        this.registerPokedex(slot.pokemonId, slot.name);
        this.registerPokedex(target.evolvesTo, target.evolvedName);
        slot.pokemonId = target.evolvesTo;
        slot.name = target.evolvedName;
        slot.pokemonType = target.pokemonType;
        return { ok: true, newName: target.evolvedName, newId: target.evolvesTo, damageBonus: target.damageBonus ?? 1, rangeBonus: target.rangeBonus ?? 1, fireRateBonus: target.fireRateBonus ?? 1 };
    }

    canEvolve(slotId) {
        const slot = this._findSlot(slotId);
        if (!slot) return false;
        const evo = EVOLUTION_CHAIN[slot.pokemonId];
        return evo && evo.evolvesAtLevel && (slot.level ?? 1) >= evo.evolvesAtLevel;
    }

    evolveSlot(slotId) {
        const slot = this._findSlot(slotId);
        if (!slot) return { ok: false };
        return this._applyEvolution(slot);
    }

    /**
     * Use an evolution item on a Pokémon slot.
     * @param {string} slotId
     * @param {string} itemType — e.g. 'Thunder Stone'
     * @returns {{ ok: boolean, reason?: string, newName?: string, newId?: number }}
     */
    useItemOnSlot(slotId, itemType) {
        const slot = this._findSlot(slotId);
        if (!slot) return { ok: false, reason: 'noSlot' };

        const evoEntry = EVOLUTION_CHAIN[slot.pokemonId];
        if (!evoEntry) return { ok: false, reason: 'cantEvolve' };

        // Multi-item evolution (Eevee)
        let target = null;
        if (evoEntry.itemEvolutions) {
            target = evoEntry.itemEvolutions[itemType] ?? null;
        } else if (evoEntry.evolvesWithItem === itemType) {
            target = evoEntry;
        }

        if (!target) return { ok: false, reason: 'wrongItem' };

        // Check inventory
        const invEntry = this.inventory.find(i => i.itemType === itemType);
        if (!invEntry || invEntry.quantity <= 0) return { ok: false, reason: 'noItem' };

        // Consume item
        invEntry.quantity--;
        if (invEntry.quantity === 0) {
            this.inventory = this.inventory.filter(i => i.itemType !== itemType);
        }

        // Apply evolution
        const result = this._applyEvolution(slot, target);
        return result;
    }

    /** Returns unlocked attacks for a slot based on its current level */
    getUnlockedAttacksForSlot(slotId) {
        const slot = this._findSlot(slotId);
        if (!slot) return [];
        return getUnlockedAttacks(slot.pokemonType, slot.level ?? 1);
    }

    // ─── Badges ───────────────────────────────────────────────────────────────

    addBadge(badgeId) { this.badges.add(badgeId); }
    hasBadge(badgeId) { return this.badges.has(badgeId); }
    get badgeCount() { return this.badges.size; }

    // ─── Pokéballs ────────────────────────────────────────────────────────────

    usePokebal() {
        if (this.pokeballs <= 0) return false;
        this.pokeballs--;
        return true;
    }
    addPokeball(n = 1) { this.pokeballs += n; }

    // ─── Coins ────────────────────────────────────────────────────────────────

    addCoins(amount) { this.coins += Math.max(0, Math.floor(amount)); }
    spendCoins(amount) {
        if (this.coins < amount) return false;
        this.coins -= amount;
        return true;
    }
    getCoins() { return this.coins; }

    // ─── Inventory ────────────────────────────────────────────────────────────

    addToInventory(itemType, quantity = 1) {
        const existing = this.inventory.find(i => i.itemType === itemType);
        if (existing) {
            existing.quantity += quantity;
        } else {
            this.inventory.push({ itemType, quantity });
        }
    }

    removeFromInventory(itemType, quantity = 1) {
        const existing = this.inventory.find(i => i.itemType === itemType);
        if (!existing || existing.quantity < quantity) return false;
        existing.quantity -= quantity;
        if (existing.quantity === 0) {
            this.inventory = this.inventory.filter(i => i.itemType !== itemType);
        }
        return true;
    }

    getInventory() { return [...this.inventory]; }

    getInventoryCount(itemType) {
        return this.inventory.find(i => i.itemType === itemType)?.quantity ?? 0;
    }

    // ─── Tower placement tracking ─────────────────────────────────────────────

    markPlaced(slotId) { const s = this._findSlot(slotId); if (s) s.placed = true; }
    markReturned(slotId) { const s = this._findSlot(slotId); if (s) s.placed = false; }
    getAvailableSlots() { return this.party.filter(s => !s.placed); }

    returnAllToBackpack() {
        for (const slot of this.party) slot.placed = false;
    }

    getSlot(slotId) { return this._findSlot(slotId) ?? null; }
    _findSlot(slotId) {
        return this.party.find(s => s.id === slotId)
            ?? this.pcBox.find(s => s.id === slotId)
            ?? null;
    }

    getSlotSpriteUrl(slot) { return getSpriteUrl(slot.pokemonId); }
}
