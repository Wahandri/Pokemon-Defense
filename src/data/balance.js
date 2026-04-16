// ─── Balance Configuration ─────────────────────────────────────────────────────
// SINGLE SOURCE OF TRUTH. Edit only this file to tune gameplay.
// ────────────────────────────────────────────────────────────────────────────────

export const HP_SCALE = 1.10;
export const ATK_LEVEL_SCALE = 1.09;

export const TOWER_HP_BASE_MULT = 3.8;
export const TOWER_FAINT_BASE_COOLDOWN_MS = 5000;
export const TOWER_FAINT_PENALTY_MS = 3000;

// Wild level progression inspired by Pokémon Red early-game pacing.
const ROUND_LEVEL_TABLE = [3, 4, 6, 8, 10, 12, 14, 16, 18, 20];

// ── Enemy definitions (4 tiers of Pokémon, all Gen 1) ────────────────────────
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

// ── Helpers ────────────────────────────────────────────────────────────────────

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

// ── XP awarded per capture (trainer XP) ──────────────────────────────────────
export const XP_PER_TIER = {
    red: 12,
    blue: 25,
    green: 50,
    t4: 100,
};

// ── Tower level system (1-100) ────────────────────────────────────────────────

/**
 * XP needed to advance FROM level n to n+1.
 * Curve: fast early game, progressively harder.
 */
export function xpToNextLevel(level) {
    if (level >= 100) return Infinity;
    const n = level;
    if (n < 10) return 5 + n * 3;            // 8,11,14,17,20,23,26,29,32  (lv 1-9)
    if (n < 20) return 30 + (n - 10) * 10;   // 30,40,...,120              (lv 10-19)
    if (n < 40) return 130 + (n - 20) * 20;  // 130,150,...,510            (lv 20-39)
    if (n < 60) return 520 + (n - 40) * 35;  // 520,555,...,1215           (lv 40-59)
    return 1225 + (n - 60) * 50;             // 1225,...,3175              (lv 60-99)
}

/**
 * Incremental stat multipliers when reaching a new level.
 * Accumulatively: ~×3 dmg, ×1.5 range, ×2 fireRate at level 100.
 */
export function getLevelBonusMultipliers(level) {
    if (level <= 1) return { dmg: 1, range: 1, fireRate: 1 };
    // Big bonus at evolution-adjacent levels and milestones
    const bigLevels = new Set([7, 10, 16, 18, 20, 22, 24, 25, 26, 28, 30, 31, 32, 33, 34, 36, 37, 38, 40, 42, 55]);
    if (bigLevels.has(level)) return { dmg: 1.10, range: 1.05, fireRate: 1.07 };
    if (level % 10 === 0) return { dmg: 1.08, range: 1.04, fireRate: 1.06 };
    if (level % 5 === 0) return { dmg: 1.05, range: 1.02, fireRate: 1.04 };
    return { dmg: 1.02, range: 1.005, fireRate: 1.015 };
}

// ── XP gained by tower on weakening a wild Pokémon (only last attacker) ──────
export const XP_WEAKEN_TIER_MULT = { red: 1, blue: 1.5, green: 2, t4: 3 };

// ── Coin economy ──────────────────────────────────────────────────────────────
export const COIN_REWARD_PER_WAVE_BASE = 50;

/** Coins rewarded for completing wave waveNum. Perfect round: +50% bonus. */
export function coinsForWave(waveNum, perfect = false) {
    const base = Math.floor(COIN_REWARD_PER_WAVE_BASE + waveNum * 15);
    return perfect ? Math.floor(base * 1.5) : base;
}

// ── Evolution chains — Gen 1, canonical levels ────────────────────────────────
// evolvesAtLevel  → auto-evolves when tower reaches that level
// evolvesWithItem → requires item from shop/inventory (no auto-evolve)
// itemEvolutions  → for Pokémon with multiple item evolutions (Eevee)
export const EVOLUTION_CHAIN = {
    // ── Starters ──────────────────────────────────────────────────────────────
    1:   { evolvesTo: 2,   evolvedName: 'Ivysaur',    pokemonType: 'grass',    evolvesAtLevel: 16,  damageBonus: 1.05, rangeBonus: 1.03, fireRateBonus: 1.03 },
    2:   { evolvesTo: 3,   evolvedName: 'Venusaur',   pokemonType: 'grass',    evolvesAtLevel: 32,  damageBonus: 1.08, rangeBonus: 1.05, fireRateBonus: 1.05 },
    4:   { evolvesTo: 5,   evolvedName: 'Charmeleon', pokemonType: 'fire',     evolvesAtLevel: 16,  damageBonus: 1.05, rangeBonus: 1.03, fireRateBonus: 1.03 },
    5:   { evolvesTo: 6,   evolvedName: 'Charizard',  pokemonType: 'fire',     evolvesAtLevel: 36,  damageBonus: 1.08, rangeBonus: 1.05, fireRateBonus: 1.05 },
    7:   { evolvesTo: 8,   evolvedName: 'Wartortle',  pokemonType: 'water',    evolvesAtLevel: 16,  damageBonus: 1.05, rangeBonus: 1.03, fireRateBonus: 1.03 },
    8:   { evolvesTo: 9,   evolvedName: 'Blastoise',  pokemonType: 'water',    evolvesAtLevel: 36,  damageBonus: 1.08, rangeBonus: 1.05, fireRateBonus: 1.05 },
    // ── Bug ───────────────────────────────────────────────────────────────────
    10:  { evolvesTo: 11,  evolvedName: 'Metapod',    pokemonType: 'bug',      evolvesAtLevel: 7,   damageBonus: 1.05, rangeBonus: 1.03, fireRateBonus: 1.03 },
    11:  { evolvesTo: 12,  evolvedName: 'Butterfree', pokemonType: 'bug',      evolvesAtLevel: 10,  damageBonus: 1.08, rangeBonus: 1.05, fireRateBonus: 1.05 },
    13:  { evolvesTo: 14,  evolvedName: 'Kakuna',     pokemonType: 'bug',      evolvesAtLevel: 7,   damageBonus: 1.05, rangeBonus: 1.03, fireRateBonus: 1.03 },
    14:  { evolvesTo: 15,  evolvedName: 'Beedrill',   pokemonType: 'bug',      evolvesAtLevel: 10,  damageBonus: 1.08, rangeBonus: 1.05, fireRateBonus: 1.05 },
    // ── Normal/Flying ─────────────────────────────────────────────────────────
    16:  { evolvesTo: 17,  evolvedName: 'Pidgeotto',  pokemonType: 'normal',   evolvesAtLevel: 18,  damageBonus: 1.05, rangeBonus: 1.03, fireRateBonus: 1.03 },
    17:  { evolvesTo: 18,  evolvedName: 'Pidgeot',    pokemonType: 'normal',   evolvesAtLevel: 36,  damageBonus: 1.08, rangeBonus: 1.05, fireRateBonus: 1.05 },
    19:  { evolvesTo: 20,  evolvedName: 'Raticate',   pokemonType: 'normal',   evolvesAtLevel: 20,  damageBonus: 1.05, rangeBonus: 1.03, fireRateBonus: 1.03 },
    21:  { evolvesTo: 22,  evolvedName: 'Fearow',     pokemonType: 'normal',   evolvesAtLevel: 20,  damageBonus: 1.05, rangeBonus: 1.03, fireRateBonus: 1.03 },
    // ── Poison ────────────────────────────────────────────────────────────────
    23:  { evolvesTo: 24,  evolvedName: 'Arbok',      pokemonType: 'poison',   evolvesAtLevel: 22,  damageBonus: 1.05, rangeBonus: 1.03, fireRateBonus: 1.03 },
    // ── Electric ──────────────────────────────────────────────────────────────
    25:  { evolvesTo: 26,  evolvedName: 'Raichu',     pokemonType: 'electric', evolvesWithItem: 'Thunder Stone', damageBonus: 1.08, rangeBonus: 1.05, fireRateBonus: 1.05 },
    // ── Ground ────────────────────────────────────────────────────────────────
    27:  { evolvesTo: 28,  evolvedName: 'Sandslash',  pokemonType: 'ground',   evolvesAtLevel: 22,  damageBonus: 1.05, rangeBonus: 1.03, fireRateBonus: 1.03 },
    // ── Nidoran ───────────────────────────────────────────────────────────────
    29:  { evolvesTo: 30,  evolvedName: 'Nidorina',   pokemonType: 'poison',   evolvesAtLevel: 16,  damageBonus: 1.05, rangeBonus: 1.03, fireRateBonus: 1.03 },
    30:  { evolvesTo: 31,  evolvedName: 'Nidoqueen',  pokemonType: 'poison',   evolvesWithItem: 'Moon Stone', damageBonus: 1.08, rangeBonus: 1.05, fireRateBonus: 1.05 },
    32:  { evolvesTo: 33,  evolvedName: 'Nidorino',   pokemonType: 'poison',   evolvesAtLevel: 16,  damageBonus: 1.05, rangeBonus: 1.03, fireRateBonus: 1.03 },
    33:  { evolvesTo: 34,  evolvedName: 'Nidoking',   pokemonType: 'poison',   evolvesWithItem: 'Moon Stone', damageBonus: 1.08, rangeBonus: 1.05, fireRateBonus: 1.05 },
    // ── Normal (Fairy-like) ────────────────────────────────────────────────────
    35:  { evolvesTo: 36,  evolvedName: 'Clefable',   pokemonType: 'normal',   evolvesWithItem: 'Moon Stone', damageBonus: 1.08, rangeBonus: 1.05, fireRateBonus: 1.05 },
    37:  { evolvesTo: 38,  evolvedName: 'Ninetales',  pokemonType: 'fire',     evolvesWithItem: 'Fire Stone',  damageBonus: 1.08, rangeBonus: 1.05, fireRateBonus: 1.05 },
    39:  { evolvesTo: 40,  evolvedName: 'Wigglytuff', pokemonType: 'normal',   evolvesWithItem: 'Moon Stone', damageBonus: 1.08, rangeBonus: 1.05, fireRateBonus: 1.05 },
    // ── Bug (Paras, Venonat) ──────────────────────────────────────────────────
    46:  { evolvesTo: 47,  evolvedName: 'Parasect',   pokemonType: 'bug',      evolvesAtLevel: 24,  damageBonus: 1.05, rangeBonus: 1.03, fireRateBonus: 1.03 },
    48:  { evolvesTo: 49,  evolvedName: 'Venomoth',   pokemonType: 'bug',      evolvesAtLevel: 31,  damageBonus: 1.05, rangeBonus: 1.03, fireRateBonus: 1.03 },
    // ── Ground ────────────────────────────────────────────────────────────────
    50:  { evolvesTo: 51,  evolvedName: 'Dugtrio',    pokemonType: 'ground',   evolvesAtLevel: 26,  damageBonus: 1.05, rangeBonus: 1.03, fireRateBonus: 1.03 },
    // ── Normal ────────────────────────────────────────────────────────────────
    52:  { evolvesTo: 53,  evolvedName: 'Persian',    pokemonType: 'normal',   evolvesAtLevel: 28,  damageBonus: 1.05, rangeBonus: 1.03, fireRateBonus: 1.03 },
    54:  { evolvesTo: 55,  evolvedName: 'Golduck',    pokemonType: 'water',    evolvesAtLevel: 33,  damageBonus: 1.05, rangeBonus: 1.03, fireRateBonus: 1.03 },
    56:  { evolvesTo: 57,  evolvedName: 'Primeape',   pokemonType: 'fighting', evolvesAtLevel: 28,  damageBonus: 1.05, rangeBonus: 1.03, fireRateBonus: 1.03 },
    // ── Fire ──────────────────────────────────────────────────────────────────
    58:  { evolvesTo: 59,  evolvedName: 'Arcanine',   pokemonType: 'fire',     evolvesWithItem: 'Fire Stone', damageBonus: 1.08, rangeBonus: 1.05, fireRateBonus: 1.05 },
    // ── Water ─────────────────────────────────────────────────────────────────
    60:  { evolvesTo: 61,  evolvedName: 'Poliwhirl',  pokemonType: 'water',    evolvesAtLevel: 25,  damageBonus: 1.05, rangeBonus: 1.03, fireRateBonus: 1.03 },
    61:  { evolvesTo: 62,  evolvedName: 'Poliwrath',  pokemonType: 'water',    evolvesWithItem: 'Water Stone', damageBonus: 1.08, rangeBonus: 1.05, fireRateBonus: 1.05 },
    // ── Psychic ───────────────────────────────────────────────────────────────
    63:  { evolvesTo: 64,  evolvedName: 'Kadabra',    pokemonType: 'psychic',  evolvesAtLevel: 16,  damageBonus: 1.05, rangeBonus: 1.03, fireRateBonus: 1.03 },
    64:  { evolvesTo: 65,  evolvedName: 'Alakazam',   pokemonType: 'psychic',  evolvesWithItem: 'Link Cable', damageBonus: 1.08, rangeBonus: 1.05, fireRateBonus: 1.05 },
    // ── Fighting ──────────────────────────────────────────────────────────────
    66:  { evolvesTo: 67,  evolvedName: 'Machoke',    pokemonType: 'fighting', evolvesAtLevel: 28,  damageBonus: 1.05, rangeBonus: 1.03, fireRateBonus: 1.03 },
    67:  { evolvesTo: 68,  evolvedName: 'Machamp',    pokemonType: 'fighting', evolvesWithItem: 'Link Cable', damageBonus: 1.08, rangeBonus: 1.05, fireRateBonus: 1.05 },
    // ── Grass ─────────────────────────────────────────────────────────────────
    69:  { evolvesTo: 70,  evolvedName: 'Weepinbell', pokemonType: 'grass',    evolvesAtLevel: 21,  damageBonus: 1.05, rangeBonus: 1.03, fireRateBonus: 1.03 },
    70:  { evolvesTo: 71,  evolvedName: 'Victreebel', pokemonType: 'grass',    evolvesWithItem: 'Leaf Stone', damageBonus: 1.08, rangeBonus: 1.05, fireRateBonus: 1.05 },
    // ── Water (Tentacool) ─────────────────────────────────────────────────────
    72:  { evolvesTo: 73,  evolvedName: 'Tentacruel', pokemonType: 'water',    evolvesAtLevel: 30,  damageBonus: 1.05, rangeBonus: 1.03, fireRateBonus: 1.03 },
    // ── Rock/Ground ───────────────────────────────────────────────────────────
    74:  { evolvesTo: 75,  evolvedName: 'Graveler',   pokemonType: 'rock',     evolvesAtLevel: 25,  damageBonus: 1.05, rangeBonus: 1.03, fireRateBonus: 1.03 },
    75:  { evolvesTo: 76,  evolvedName: 'Golem',      pokemonType: 'rock',     evolvesWithItem: 'Link Cable', damageBonus: 1.08, rangeBonus: 1.05, fireRateBonus: 1.05 },
    // ── Fire (Ponyta) ─────────────────────────────────────────────────────────
    77:  { evolvesTo: 78,  evolvedName: 'Rapidash',   pokemonType: 'fire',     evolvesAtLevel: 40,  damageBonus: 1.05, rangeBonus: 1.03, fireRateBonus: 1.03 },
    // ── Water (Slowpoke) ──────────────────────────────────────────────────────
    79:  { evolvesTo: 80,  evolvedName: 'Slowbro',    pokemonType: 'water',    evolvesAtLevel: 37,  damageBonus: 1.05, rangeBonus: 1.03, fireRateBonus: 1.03 },
    // ── Electric ──────────────────────────────────────────────────────────────
    81:  { evolvesTo: 82,  evolvedName: 'Magneton',   pokemonType: 'electric', evolvesAtLevel: 30,  damageBonus: 1.05, rangeBonus: 1.03, fireRateBonus: 1.03 },
    // ── Normal/Flying ─────────────────────────────────────────────────────────
    84:  { evolvesTo: 85,  evolvedName: 'Dodrio',     pokemonType: 'normal',   evolvesAtLevel: 31,  damageBonus: 1.05, rangeBonus: 1.03, fireRateBonus: 1.03 },
    // ── Water ─────────────────────────────────────────────────────────────────
    86:  { evolvesTo: 87,  evolvedName: 'Dewgong',    pokemonType: 'water',    evolvesAtLevel: 34,  damageBonus: 1.05, rangeBonus: 1.03, fireRateBonus: 1.03 },
    // ── Poison ────────────────────────────────────────────────────────────────
    88:  { evolvesTo: 89,  evolvedName: 'Muk',        pokemonType: 'poison',   evolvesAtLevel: 38,  damageBonus: 1.05, rangeBonus: 1.03, fireRateBonus: 1.03 },
    // ── Water (Stone) ─────────────────────────────────────────────────────────
    90:  { evolvesTo: 91,  evolvedName: 'Cloyster',   pokemonType: 'water',    evolvesWithItem: 'Water Stone', damageBonus: 1.08, rangeBonus: 1.05, fireRateBonus: 1.05 },
    // ── Ghost ─────────────────────────────────────────────────────────────────
    92:  { evolvesTo: 93,  evolvedName: 'Haunter',    pokemonType: 'ghost',    evolvesAtLevel: 25,  damageBonus: 1.05, rangeBonus: 1.03, fireRateBonus: 1.03 },
    93:  { evolvesTo: 94,  evolvedName: 'Gengar',     pokemonType: 'ghost',    evolvesWithItem: 'Link Cable', damageBonus: 1.08, rangeBonus: 1.05, fireRateBonus: 1.05 },
    // ── Psychic ───────────────────────────────────────────────────────────────
    96:  { evolvesTo: 97,  evolvedName: 'Hypno',      pokemonType: 'psychic',  evolvesAtLevel: 26,  damageBonus: 1.05, rangeBonus: 1.03, fireRateBonus: 1.03 },
    // ── Water ─────────────────────────────────────────────────────────────────
    98:  { evolvesTo: 99,  evolvedName: 'Kingler',    pokemonType: 'water',    evolvesAtLevel: 28,  damageBonus: 1.05, rangeBonus: 1.03, fireRateBonus: 1.03 },
    // ── Electric ──────────────────────────────────────────────────────────────
    100: { evolvesTo: 101, evolvedName: 'Electrode',  pokemonType: 'electric', evolvesAtLevel: 30,  damageBonus: 1.05, rangeBonus: 1.03, fireRateBonus: 1.03 },
    // ── Grass (Stone) ─────────────────────────────────────────────────────────
    102: { evolvesTo: 103, evolvedName: 'Exeggutor',  pokemonType: 'grass',    evolvesWithItem: 'Leaf Stone', damageBonus: 1.08, rangeBonus: 1.05, fireRateBonus: 1.05 },
    // ── Ground ────────────────────────────────────────────────────────────────
    104: { evolvesTo: 105, evolvedName: 'Marowak',    pokemonType: 'ground',   evolvesAtLevel: 28,  damageBonus: 1.05, rangeBonus: 1.03, fireRateBonus: 1.03 },
    // ── Poison ────────────────────────────────────────────────────────────────
    109: { evolvesTo: 110, evolvedName: 'Weezing',    pokemonType: 'poison',   evolvesAtLevel: 35,  damageBonus: 1.05, rangeBonus: 1.03, fireRateBonus: 1.03 },
    // ── Rock/Ground ───────────────────────────────────────────────────────────
    111: { evolvesTo: 112, evolvedName: 'Rhydon',     pokemonType: 'ground',   evolvesAtLevel: 42,  damageBonus: 1.05, rangeBonus: 1.03, fireRateBonus: 1.03 },
    // ── Water ─────────────────────────────────────────────────────────────────
    116: { evolvesTo: 117, evolvedName: 'Seadra',     pokemonType: 'water',    evolvesAtLevel: 32,  damageBonus: 1.05, rangeBonus: 1.03, fireRateBonus: 1.03 },
    118: { evolvesTo: 119, evolvedName: 'Seaking',    pokemonType: 'water',    evolvesAtLevel: 33,  damageBonus: 1.05, rangeBonus: 1.03, fireRateBonus: 1.03 },
    // ── Water (Stone) ─────────────────────────────────────────────────────────
    120: { evolvesTo: 121, evolvedName: 'Starmie',    pokemonType: 'water',    evolvesWithItem: 'Water Stone', damageBonus: 1.08, rangeBonus: 1.05, fireRateBonus: 1.05 },
    // ── Water (Magikarp) ──────────────────────────────────────────────────────
    129: { evolvesTo: 130, evolvedName: 'Gyarados',   pokemonType: 'water',    evolvesAtLevel: 20,  damageBonus: 1.08, rangeBonus: 1.05, fireRateBonus: 1.05 },
    // ── Eevee (multi-item evolution) ─────────────────────────────────────────
    133: {
        itemEvolutions: {
            'Water Stone':   { evolvesTo: 134, evolvedName: 'Vaporeon',  pokemonType: 'water',    damageBonus: 1.08, rangeBonus: 1.05, fireRateBonus: 1.05 },
            'Thunder Stone': { evolvesTo: 135, evolvedName: 'Jolteon',   pokemonType: 'electric', damageBonus: 1.08, rangeBonus: 1.05, fireRateBonus: 1.05 },
            'Fire Stone':    { evolvesTo: 136, evolvedName: 'Flareon',   pokemonType: 'fire',     damageBonus: 1.08, rangeBonus: 1.05, fireRateBonus: 1.05 },
        },
    },
    // ── Water (Fossils) ───────────────────────────────────────────────────────
    138: { evolvesTo: 139, evolvedName: 'Omastar',    pokemonType: 'water',    evolvesAtLevel: 40,  damageBonus: 1.05, rangeBonus: 1.03, fireRateBonus: 1.03 },
    140: { evolvesTo: 141, evolvedName: 'Kabutops',   pokemonType: 'water',    evolvesAtLevel: 40,  damageBonus: 1.05, rangeBonus: 1.03, fireRateBonus: 1.03 },
    // ── Dragon ────────────────────────────────────────────────────────────────
    147: { evolvesTo: 148, evolvedName: 'Dragonair',  pokemonType: 'dragon',   evolvesAtLevel: 30,  damageBonus: 1.05, rangeBonus: 1.03, fireRateBonus: 1.03 },
    148: { evolvesTo: 149, evolvedName: 'Dragonite',  pokemonType: 'dragon',   evolvesAtLevel: 55,  damageBonus: 1.10, rangeBonus: 1.08, fireRateBonus: 1.08 },
};

// ── Starter Tower configs (Pokémon as towers) ─────────────────────────────────
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
export const TYPE_CHART = {
    fire:     { grass: 1.5, water: 0.65, fire: 1.0, normal: 1.0, psychic: 1.0, poison: 1.0, rock: 0.65, electric: 1.0 },
    grass:    { water: 1.5, fire: 0.65,  grass: 1.0, normal: 1.0, psychic: 1.0, poison: 0.65, rock: 1.0, electric: 1.0 },
    water:    { fire: 1.5,  grass: 0.65, water: 1.0, normal: 1.0, psychic: 1.0, poison: 1.0, rock: 1.5, electric: 0.65 },
    normal:   {},
    psychic:  {},
    poison:   {},
    rock:     { fire: 1.5, water: 0.65 },
    electric: { water: 1.5, grass: 0.65 },
    ghost:    { normal: 0.5, psychic: 2.0 },
    dragon:   { dragon: 1.2 },
    fighting: { normal: 1.5, rock: 1.5 },
    ground:   { electric: 2.0, rock: 1.5 },
    bug:      { grass: 1.2, poison: 0.65 },
};

export function typeMultiplier(attackerType, defenderType) {
    if (!attackerType || !defenderType) return 1.0;
    return TYPE_CHART[attackerType]?.[defenderType] ?? 1.0;
}
