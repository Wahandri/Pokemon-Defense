// ─── Pokémon Data (Gen 1 only, IDs 1–151) ─────────────────────────────────────
// Tier pools for enemy spawning. All IDs are Gen 1 (≤151).

// Sprite path — local only (offline runtime after build script).
// Local files are served by `python3 -m http.server` without any bundler.
export function getSpriteUrl(id) {
    // Local sprites are downloaded by tools/build_sprites_gen1.py
    // Once downloaded they are served at this relative path:
    return `src/data/sprites/gen1/${id}.png`;
}

// ── Type assignments for Gen 1 Pokémon (partial, coherent) ───────────────────
export const POKEMON_TYPE = {
    // Grass starters & family
    1: 'grass', 2: 'grass', 3: 'grass',
    // Fire starters & family
    4: 'fire', 5: 'fire', 6: 'fire',
    // Water starters & family
    7: 'water', 8: 'water', 9: 'water',
    // Bugs (normal default)
    10: 'normal', 11: 'normal', 12: 'normal',
    13: 'poison', 14: 'poison', 15: 'poison',
    // Normal birds
    16: 'normal', 17: 'normal', 18: 'normal',
    // Normal rodents
    19: 'normal', 20: 'normal',
    21: 'normal', 22: 'normal',
    // Poison / etc
    23: 'poison', 24: 'poison',
    25: 'electric', 26: 'electric',
    27: 'normal', 28: 'normal',
    29: 'poison', 30: 'poison', 31: 'poison',
    32: 'poison', 33: 'poison', 34: 'poison',
    35: 'normal', 36: 'normal',
    37: 'fire', 38: 'fire',
    39: 'normal', 40: 'normal',
    41: 'poison', 42: 'poison',
    43: 'grass', 44: 'grass', 45: 'grass',
    46: 'grass', 47: 'grass',
    48: 'poison', 49: 'poison',
    50: 'normal', 51: 'normal',
    52: 'normal', 53: 'normal',
    54: 'water', 55: 'water',
    56: 'normal', 57: 'normal',
    58: 'fire', 59: 'fire',
    60: 'water', 61: 'water', 62: 'water',
    63: 'psychic', 64: 'psychic', 65: 'psychic',
    66: 'normal', 67: 'normal', 68: 'normal',
    69: 'grass', 70: 'grass', 71: 'grass',
    72: 'water', 73: 'water',
    74: 'rock', 75: 'rock', 76: 'rock',
    77: 'fire', 78: 'fire',
    79: 'water', 80: 'water',
    81: 'electric', 82: 'electric',
    83: 'normal',
    84: 'normal', 85: 'normal',
    86: 'water', 87: 'water',
    88: 'poison', 89: 'poison',
    90: 'water', 91: 'water',
    92: 'poison', 93: 'poison', 94: 'poison',
    95: 'rock',
    96: 'psychic', 97: 'psychic',
    98: 'water', 99: 'water',
    100: 'electric', 101: 'electric',
    102: 'grass', 103: 'grass',
    104: 'normal', 105: 'normal',
    106: 'normal', 107: 'normal',
    108: 'normal',
    109: 'poison', 110: 'poison',
    111: 'normal', 112: 'normal',
    113: 'normal',
    114: 'grass',
    115: 'normal',
    116: 'water', 117: 'water', 118: 'water', 119: 'water',
    120: 'water', 121: 'water',
    122: 'psychic',
    123: 'normal',
    124: 'psychic',
    125: 'electric',
    126: 'fire',
    127: 'normal',
    128: 'normal',
    129: 'water', 130: 'water',
    131: 'water',
    132: 'normal',
    133: 'normal', 134: 'water', 135: 'electric', 136: 'fire',
    137: 'normal',
    138: 'water', 139: 'water',
    140: 'water', 141: 'water',
    142: 'normal',
    143: 'normal',
    144: 'water', // Articuno → ice, closest mapped
    145: 'electric', // Zapdos
    146: 'fire',  // Moltres
    147: 'normal', 148: 'normal', 149: 'normal', // Dratini family (no dragon type in chart)
    150: 'psychic', // Mewtwo
    151: 'psychic', // Mew
};

// ── Tier pools (type key → array of { id, name }) ─────────────────────────────
export const POKEMON_POOLS = {

    // ── Tier 1: Comunes ─ early rounds ──────────────────────────────────────
    red: [
        { id: 10, name: 'Caterpie' },
        { id: 13, name: 'Weedle' },
        { id: 16, name: 'Pidgey' },
        { id: 19, name: 'Rattata' },
        { id: 21, name: 'Spearow' },
        { id: 35, name: 'Clefairy' },
        { id: 39, name: 'Jigglypuff' },
        { id: 43, name: 'Oddish' },
        { id: 41, name: 'Zubat' },
        { id: 52, name: 'Meowth' },
        { id: 129, name: 'Magikarp' },
    ],

    // ── Tier 2: Poco comunes ─────────────────────────────────────────────────
    blue: [
        { id: 54, name: 'Psyduck' },
        { id: 74, name: 'Geodude' },
        { id: 79, name: 'Slowpoke' },
        { id: 42, name: 'Golbat' },
        { id: 96, name: 'Drowzee' },
        { id: 98, name: 'Krabby' },
        { id: 58, name: 'Growlithe' },
        { id: 60, name: 'Poliwag' },
        { id: 115, name: 'Kangaskhan' },
        { id: 109, name: 'Koffing' },
    ],

    // ── Tier 3: Raros ────────────────────────────────────────────────────────
    green: [
        { id: 68, name: 'Machamp' },
        { id: 94, name: 'Gengar' },
        { id: 65, name: 'Alakazam' },
        { id: 112, name: 'Rhydon' },
        { id: 125, name: 'Electabuzz' },
        { id: 126, name: 'Magmar' },
        { id: 59, name: 'Arcanine' },
        { id: 76, name: 'Golem' },
        { id: 139, name: 'Omastar' },
        { id: 141, name: 'Kabutops' },
    ],

    // ── Tier 4: Épicos ───────────────────────────────────────────────────────
    t4: [
        { id: 149, name: 'Dragonite' },
        { id: 143, name: 'Snorlax' },
        { id: 130, name: 'Gyarados' },
        { id: 131, name: 'Lapras' },
        { id: 134, name: 'Vaporeon' },
        { id: 136, name: 'Flareon' },
        { id: 135, name: 'Jolteon' },
        { id: 144, name: 'Articuno' },
        { id: 145, name: 'Zapdos' },
        { id: 146, name: 'Moltres' },
    ],
};

// ── Tier metadata ─────────────────────────────────────────────────────────────
export const TIER_INFO = {
    red: { tier: 1, label: 'Común', stars: '★', color: '#e84040' },
    blue: { tier: 2, label: 'Poco Común', stars: '★★', color: '#3a8fff' },
    green: { tier: 3, label: 'Raro', stars: '★★★', color: '#2dbd55' },
    t4: { tier: 4, label: 'Épico', stars: '★★★★', color: '#c792ea' },
};

/** Pick a random Pokémon from the type's tier pool */
export function pickPokemon(type) {
    const pool = POKEMON_POOLS[type] ?? POKEMON_POOLS.red;
    return pool[Math.floor(Math.random() * pool.length)];
}

/** Get the type string for a given Pokémon ID */
export function getPokemonType(id) {
    return POKEMON_TYPE[id] ?? 'normal';
}
