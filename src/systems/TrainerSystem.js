// ─── TrainerSystem ─────────────────────────────────────────────────────────────
// Trainer progression: level/XP, pokéballs, rareCandy, badges,
// party (max 6, can be placed as towers), pcBox (unlimited storage), Pokédex.

import { EVOLUTION_CHAIN, TOWER_XP_TO_NEXT } from '../data/balance.js';
import { getSpriteUrl } from '../data/pokemon.js';
import { getUnlockedAttacks } from '../data/pokemon_attacks.js';

export class TrainerSystem {
    constructor() {
        this.reset();
    }

    reset() {
        this.pokeballs = 3;
        this.rareCandy = 0;
        this.trainerXP = 0;

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
            level: 1,
            xp: 0,
            currentAttackIdx: 0,
        };
        this.party.push(slot);
        this.pcBox.push({ ...slot });
        this.registerPokedex(starterConfig.pokemonId, starterConfig.label);
    }

    // ─── Capture ──────────────────────────────────────────────────────────────

    /**
     * Add a captured enemy to pcBox (always) and party if not full.
     * @param {import('../entities/Enemy.js').Enemy} enemy
     * @param {string} [zoneId]  - zone where it was captured
     */
    addCaptured(enemy, zoneId = null) {
        const slot = {
            id: `cap_${enemy.pokemonId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            pokemonId: enemy.pokemonId,
            name: enemy.pokemonName,
            pokemonType: enemy.pokemonType,
            starterKey: null,
            placed: false,
            level: Math.min(enemy.wildLevel ?? 1, 10),
            xp: 0,
            currentAttackIdx: 0,
        };

        // Always add to pcBox
        this.pcBox.push(slot);

        // Add to party if there's room
        let addedToParty = false;
        if (this.party.length < 6) {
            this.party.push({ ...slot, id: slot.id + '_p' });
            addedToParty = true;
        }

        // Track captures
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

    /**
     * Swap a party slot with a pcBox slot.
     * "Empty" party slot is represented by null at that index.
     */
    swapPartyPC(partyIdx, pcBoxIdx) {
        const partySlot = this.party[partyIdx] ?? null;
        const pcSlot = this.pcBox[pcBoxIdx] ?? null;
        if (!pcSlot) return false;

        // Can't swap a placed Pokémon
        if (partySlot?.placed) return false;

        if (partySlot) {
            // Swap
            this.party[partyIdx] = { ...pcSlot, placed: false };
            this.pcBox[pcBoxIdx] = { ...partySlot, placed: false };
        } else {
            // Move pcBox → party (if party has < 6 real slots)
            if (this.party.length < 6) {
                this.party.push({ ...pcSlot, placed: false });
                this.pcBox.splice(pcBoxIdx, 1);
            }
        }
        return true;
    }

    /** Remove from party (return to pcBox) */
    removeFromParty(partyIdx) {
        const slot = this.party[partyIdx];
        if (!slot || slot.placed) return false;
        this.party.splice(partyIdx, 1);
        // It stays in pcBox already (duplicate reference)
        return true;
    }

    /** Move a pcBox Pokémon into the party (if party < 6) */
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

    // ─── Slot XP (tower Pokémon, levels 1-10) ────────────────────────────────

    addXPToSlot(slotId, amount) {
        const slot = this._findSlot(slotId);
        if (!slot) return { leveledUp: false };
        if ((slot.level ?? 1) >= 10) return { leveledUp: false };

        slot.level = slot.level ?? 1;
        slot.xp = (slot.xp ?? 0) + amount;

        let leveledUp = false;
        let evolved = false;
        let newEvolution = null;

        while (slot.level < 10) {
            const needed = TOWER_XP_TO_NEXT[slot.level - 1]; // index 0 = level 1 → level 2
            if (slot.xp < needed) break;
            slot.xp -= needed;
            slot.level++;
            leveledUp = true;

            // Auto-evolve at levels 4 and 7
            const evo = EVOLUTION_CHAIN[slot.pokemonId];
            if (evo?.evolvesAtLevel === slot.level) {
                newEvolution = this._applyEvolution(slot);
                if (newEvolution.ok) evolved = true;
            }
        }

        return { leveledUp, newLevel: slot.level, evolved, newEvolution };
    }

    _applyEvolution(slot) {
        const evo = EVOLUTION_CHAIN[slot.pokemonId];
        if (!evo) return { ok: false };
        this.registerPokedex(slot.pokemonId, slot.name);
        this.registerPokedex(evo.evolvesTo, evo.evolvedName);
        slot.pokemonId = evo.evolvesTo;
        slot.name = evo.evolvedName;
        slot.pokemonType = evo.pokemonType;
        return { ok: true, newName: evo.evolvedName, newId: evo.evolvesTo };
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

    useRareCandyOnSlot(slotId) {
        if (this.rareCandy <= 0) return { ok: false, reason: 'noCandy' };
        const slot = this._findSlot(slotId);
        if (!slot) return { ok: false };
        if ((slot.level ?? 1) >= 10) return { ok: false, reason: 'maxLevel' };
        this.rareCandy--;
        const result = this.addXPToSlot(slotId, TOWER_XP_TO_NEXT[slot.level - 1] ?? 999);
        return { ok: true, ...result };
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
