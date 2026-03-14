// ─── Balance Configuration ─────────────────────────────────────────────────────
// SINGLE SOURCE OF TRUTH. Edit only this file to tune gameplay.
//
// HP(wave)     = round(HP_base × HP_SCALE^(wave-1))
// ────────────────────────────────────────────────────────────────────────────────

export const HP_SCALE = 1.10;
export const ATK_LEVEL_SCALE = 1.09;

// Wild level progression inspired by Pokémon Red early-game pacing.
const ROUND_LEVEL_TABLE = [3, 4, 6, 8, 10, 12, 14, 16, 18, 20];

// ── Enemy definitions (4 tiers of Pokémon, all Gen 1) ────────────────────────
// No reward_base — economy is now XP-based, not money-based
export const ENEMY_CONFIG = {
    red: {
        label: 'Tier 1 ★', HP_base: 8, speed: 75, damage: 1,
        color: '#e84040', accent: '#ff7070', radius: 18,
    },
    blue: {
        label: 'Tier 2 ★★', HP_base: 22, speed: 58, damage: 1,
        color: '#3a8fff', accent: '#80c0ff', radius: 20,
    },
    green: {
        label: 'Tier 3 ★★★', HP_base: 55, speed: 95, damage: 2,
        color: '#2dbd55', accent: '#70e890', radius: 20,
    },
    t4: {
        label: 'Tier 4 ★★★★', HP_base: 180, speed: 48, damage: 3,
        color: '#c792ea', accent: '#e8c8ff', radius: 22,
    },
};

// ── Helper ────────────────────────────────────────────────────────────────────

export function getWildLevelForRound(roundNum) {
    if (roundNum <= ROUND_LEVEL_TABLE.length) return ROUND_LEVEL_TABLE[roundNum - 1];
    return ROUND_LEVEL_TABLE[ROUND_LEVEL_TABLE.length - 1] + (roundNum - ROUND_LEVEL_TABLE.length) * 2;
}

export function getPokemonLevelMultiplier(level = 1) {
    return Math.pow(ATK_LEVEL_SCALE, Math.max(0, level - 1));
}

export function xpToReachPokemonLevel(level) {
    const lv = Math.max(1, Math.min(100, Math.floor(level)));
    return Math.pow(lv, 3);
}

export function calcHP(type, wave, wildLevel = getWildLevelForRound(wave)) {
    const def = ENEMY_CONFIG[type];
    if (!def) throw new Error(`Unknown enemy type: ${type}`);
    const waveScale = Math.pow(HP_SCALE, wave - 1);
    const levelScale = Math.pow(1.08, Math.max(0, wildLevel - 1));
    return Math.max(1, Math.round(def.HP_base * waveScale * levelScale));
}

export function applyMod(value, mod) {
    let v = value;
    if (mod.mul !== undefined) v *= mod.mul;
    if (mod.add !== undefined) v += mod.add;
    if (mod.min !== undefined) v = Math.max(mod.min, v);
    if (mod.max !== undefined) v = Math.min(mod.max, v);
    return v;
}

// ── XP awarded per capture ────────────────────────────────────────────────────
export const XP_PER_TIER = {
    red: 12,
    blue: 25,
    green: 50,
    t4: 100,
};


// ── Evolution chains (starters + common Gen 1 wild Pokémon) ─────────────────
// xpRequired: XP this tower's slot needs to reach before allowing manual evolve
// damageBonus: multiplier applied to tower.damage on evolution (stack-safe ×mult)
// rangeBonus / fireRateBonus: similar
export const EVOLUTION_CHAIN = {
    // ── Starters ──────────────────────────────────────────────────────────────
    1: { evolvesTo: 2, evolvedName: 'Ivysaur', pokemonType: 'grass', xpRequired: 60, damageBonus: 1.3, rangeBonus: 1.1, fireRateBonus: 1.0 },
    2: { evolvesTo: 3, evolvedName: 'Venusaur', pokemonType: 'grass', xpRequired: 130, damageBonus: 1.5, rangeBonus: 1.2, fireRateBonus: 1.1 },
    4: { evolvesTo: 5, evolvedName: 'Charmeleon', pokemonType: 'fire', xpRequired: 60, damageBonus: 1.3, rangeBonus: 1.0, fireRateBonus: 1.15 },
    5: { evolvesTo: 6, evolvedName: 'Charizard', pokemonType: 'fire', xpRequired: 130, damageBonus: 1.6, rangeBonus: 1.2, fireRateBonus: 1.2 },
    7: { evolvesTo: 8, evolvedName: 'Wartortle', pokemonType: 'water', xpRequired: 60, damageBonus: 1.3, rangeBonus: 1.1, fireRateBonus: 1.0 },
    8: { evolvesTo: 9, evolvedName: 'Blastoise', pokemonType: 'water', xpRequired: 130, damageBonus: 1.5, rangeBonus: 1.25, fireRateBonus: 1.1 },
    // ── Bug types ─────────────────────────────────────────────────────────────
    10: { evolvesTo: 11, evolvedName: 'Metapod', pokemonType: 'bug', xpRequired: 30, damageBonus: 1.1, rangeBonus: 1.0, fireRateBonus: 1.0 },
    11: { evolvesTo: 12, evolvedName: 'Butterfree', pokemonType: 'bug', xpRequired: 70, damageBonus: 1.4, rangeBonus: 1.2, fireRateBonus: 1.15 },
    13: { evolvesTo: 14, evolvedName: 'Kakuna', pokemonType: 'bug', xpRequired: 30, damageBonus: 1.1, rangeBonus: 1.0, fireRateBonus: 1.0 },
    14: { evolvesTo: 15, evolvedName: 'Beedrill', pokemonType: 'bug', xpRequired: 70, damageBonus: 1.4, rangeBonus: 1.1, fireRateBonus: 1.3 },
    // ── Normal/Flying ─────────────────────────────────────────────────────────
    16: { evolvesTo: 17, evolvedName: 'Pidgeotto', pokemonType: 'normal', xpRequired: 50, damageBonus: 1.25, rangeBonus: 1.15, fireRateBonus: 1.1 },
    17: { evolvesTo: 18, evolvedName: 'Pidgeot', pokemonType: 'normal', xpRequired: 110, damageBonus: 1.5, rangeBonus: 1.3, fireRateBonus: 1.2 },
    19: { evolvesTo: 20, evolvedName: 'Raticate', pokemonType: 'normal', xpRequired: 45, damageBonus: 1.3, rangeBonus: 1.0, fireRateBonus: 1.25 },
    21: { evolvesTo: 22, evolvedName: 'Fearow', pokemonType: 'normal', xpRequired: 55, damageBonus: 1.35, rangeBonus: 1.2, fireRateBonus: 1.1 },
    // ── Poison ────────────────────────────────────────────────────────────────
    23: { evolvesTo: 24, evolvedName: 'Arbok', pokemonType: 'poison', xpRequired: 55, damageBonus: 1.35, rangeBonus: 1.1, fireRateBonus: 1.0 },
    // ── Electric ──────────────────────────────────────────────────────────────
    25: { evolvesTo: 26, evolvedName: 'Raichu', pokemonType: 'electric', xpRequired: 50, damageBonus: 1.4, rangeBonus: 1.1, fireRateBonus: 1.2 },
    // ── Ground ────────────────────────────────────────────────────────────────
    27: { evolvesTo: 28, evolvedName: 'Sandslash', pokemonType: 'ground', xpRequired: 50, damageBonus: 1.35, rangeBonus: 1.0, fireRateBonus: 1.1 },
    // ── Normal/Fairy ──────────────────────────────────────────────────────────
    35: { evolvesTo: 36, evolvedName: 'Clefable', pokemonType: 'normal', xpRequired: 60, damageBonus: 1.4, rangeBonus: 1.15, fireRateBonus: 1.0 },
    // ── Fire ──────────────────────────────────────────────────────────────────
    37: { evolvesTo: 38, evolvedName: 'Ninetales', pokemonType: 'fire', xpRequired: 65, damageBonus: 1.4, rangeBonus: 1.2, fireRateBonus: 1.1 },
    // ── Jigglypuff ────────────────────────────────────────────────────────────
    39: { evolvesTo: 40, evolvedName: 'Wigglytuff', pokemonType: 'normal', xpRequired: 55, damageBonus: 1.3, rangeBonus: 1.1, fireRateBonus: 1.0 },
    // ── Fighting ──────────────────────────────────────────────────────────────
    66: { evolvesTo: 67, evolvedName: 'Machoke', pokemonType: 'fighting', xpRequired: 55, damageBonus: 1.35, rangeBonus: 1.0, fireRateBonus: 1.1 },
    67: { evolvesTo: 68, evolvedName: 'Machamp', pokemonType: 'fighting', xpRequired: 120, damageBonus: 1.6, rangeBonus: 1.1, fireRateBonus: 1.2 },
    // ── Ghost ─────────────────────────────────────────────────────────────────
    92: { evolvesTo: 93, evolvedName: 'Haunter', pokemonType: 'ghost', xpRequired: 55, damageBonus: 1.3, rangeBonus: 1.2, fireRateBonus: 1.1 },
    93: { evolvesTo: 94, evolvedName: 'Gengar', pokemonType: 'ghost', xpRequired: 120, damageBonus: 1.6, rangeBonus: 1.25, fireRateBonus: 1.25 },
    // ── Rock/Ground ───────────────────────────────────────────────────────────
    74: { evolvesTo: 75, evolvedName: 'Graveler', pokemonType: 'rock', xpRequired: 55, damageBonus: 1.3, rangeBonus: 1.0, fireRateBonus: 1.0 },
    75: { evolvesTo: 76, evolvedName: 'Golem', pokemonType: 'rock', xpRequired: 120, damageBonus: 1.6, rangeBonus: 1.1, fireRateBonus: 1.0 },
    // ── Water ─────────────────────────────────────────────────────────────────
    60: { evolvesTo: 61, evolvedName: 'Poliwhirl', pokemonType: 'water', xpRequired: 55, damageBonus: 1.3, rangeBonus: 1.1, fireRateBonus: 1.1 },
    79: { evolvesTo: 80, evolvedName: 'Slowbro', pokemonType: 'water', xpRequired: 60, damageBonus: 1.3, rangeBonus: 1.2, fireRateBonus: 1.0 },
    116: { evolvesTo: 117, evolvedName: 'Seadra', pokemonType: 'water', xpRequired: 50, damageBonus: 1.35, rangeBonus: 1.15, fireRateBonus: 1.1 },
    129: { evolvesTo: 130, evolvedName: 'Gyarados', pokemonType: 'water', xpRequired: 100, damageBonus: 1.8, rangeBonus: 1.3, fireRateBonus: 1.15 },
    // ── Eevee ─────────────────────────────────────────────────────────────────
    133: { evolvesTo: 136, evolvedName: 'Flareon', pokemonType: 'fire', xpRequired: 70, damageBonus: 1.5, rangeBonus: 1.0, fireRateBonus: 1.2 },
};

// ── Starter Tower configs (Pokémon as towers) ─────────────────────────────────
// pokemonType: used for type effectiveness
export const STARTER_TOWER_CONFIG = {
    bulbasaur: {
        label: 'Bulbasaur',
        pokemonId: 1,
        pokemonType: 'grass',
        emoji: '🌿',
        color: '#78c850',
        glowColor: '#a8e890',
        bgColor: '#1a3010',
        range: 120,
        fireRate: 0.8,
        damage: 12,
        projSpeed: 300,
    },
    charmander: {
        label: 'Charmander',
        pokemonId: 4,
        pokemonType: 'fire',
        emoji: '🔥',
        color: '#f08030',
        glowColor: '#f8a050',
        bgColor: '#301a00',
        range: 110,
        fireRate: 1.1,
        damage: 14,
        projSpeed: 360,
    },
    squirtle: {
        label: 'Squirtle',
        pokemonId: 7,
        pokemonType: 'water',
        emoji: '💧',
        color: '#6890f0',
        glowColor: '#98b8f8',
        bgColor: '#0a102a',
        range: 130,
        fireRate: 0.7,
        damage: 11,
        projSpeed: 280,
        slowAmount: 0.55,
        slowDuration: 1800,
    },
};

// ── Type effectiveness chart ───────────────────────────────────────────────────
// FIRE > GRASS > WATER > FIRE
export const TYPE_CHART = {
    fire: { grass: 1.5, water: 0.65, fire: 1.0, normal: 1.0, psychic: 1.0, poison: 1.0, rock: 0.65, electric: 1.0 },
    grass: { water: 1.5, fire: 0.65, grass: 1.0, normal: 1.0, psychic: 1.0, poison: 0.65, rock: 1.0, electric: 1.0 },
    water: { fire: 1.5, grass: 0.65, water: 1.0, normal: 1.0, psychic: 1.0, poison: 1.0, rock: 1.5, electric: 0.65 },
    normal: {},
    psychic: {},
    poison: {},
    rock: { fire: 1.5, water: 0.65 },
    electric: { water: 1.5, grass: 0.65 },
};

export function typeMultiplier(attackerType, defenderType) {
    if (!attackerType || !defenderType) return 1.0;
    return TYPE_CHART[attackerType]?.[defenderType] ?? 1.0;
}
