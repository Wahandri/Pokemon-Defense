// ─── Pokémon Tower Config ─────────────────────────────────────────────────────
// Per-Pokémon configuration for use as a tower (party slot).
// Defines: base stats, type, and special-move assignment.
//
// For species not explicitly listed, use getDefaultTowerConfig(speciesId, type).

import { specialKeyForType, ABILITIES } from './abilities.js';

/** Explicit configs for frequently-used Pokémon */
const EXPLICIT_CONFIGS = {
    // ── Starters ──────────────────────────────────────────────────────────────
    1: { name: 'Bulbasaur', type: 'grass', baseRange: 120, baseFireRate: 0.8, baseDamage: 12, special: 'ROOT_STOP', cooldown: 13000 },
    2: { name: 'Ivysaur', type: 'grass', baseRange: 130, baseFireRate: 0.9, baseDamage: 16, special: 'SLOW_FIELD', cooldown: 11000 },
    3: { name: 'Venusaur', type: 'grass', baseRange: 145, baseFireRate: 1.0, baseDamage: 22, special: 'ROOT_STOP', cooldown: 10000 },
    4: { name: 'Charmander', type: 'fire', baseRange: 110, baseFireRate: 0.85, baseDamage: 13, special: 'BURN_DOT', cooldown: 7000 },
    5: { name: 'Charmeleon', type: 'fire', baseRange: 120, baseFireRate: 1.0, baseDamage: 18, special: 'BURN_DOT', cooldown: 6500 },
    6: { name: 'Charizard', type: 'fire', baseRange: 135, baseFireRate: 1.1, baseDamage: 28, special: 'METEOR_RAIN', cooldown: 14000 },
    7: { name: 'Squirtle', type: 'water', baseRange: 130, baseFireRate: 0.8, baseDamage: 12, special: 'SLOW_FIELD', cooldown: 11000 },
    8: { name: 'Wartortle', type: 'water', baseRange: 140, baseFireRate: 0.9, baseDamage: 16, special: 'WAVE_PUSH', cooldown: 10000 },
    9: { name: 'Blastoise', type: 'water', baseRange: 150, baseFireRate: 1.0, baseDamage: 24, special: 'AOE_BLAST', cooldown: 8000 },
    // ── Bug types ─────────────────────────────────────────────────────────────
    10: { name: 'Caterpie', type: 'bug', baseRange: 90, baseFireRate: 0.7, baseDamage: 8, special: 'SNIPE_MARK', cooldown: 6000 },
    11: { name: 'Metapod', type: 'bug', baseRange: 90, baseFireRate: 0.6, baseDamage: 9, special: 'SHIELD_SELF', cooldown: 20000 },
    12: { name: 'Butterfree', type: 'bug', baseRange: 140, baseFireRate: 1.0, baseDamage: 14, special: 'PSY_STUN', cooldown: 10000 },
    13: { name: 'Weedle', type: 'poison', baseRange: 90, baseFireRate: 0.75, baseDamage: 9, special: 'POISON_DOT', cooldown: 8000 },
    14: { name: 'Kakuna', type: 'poison', baseRange: 90, baseFireRate: 0.6, baseDamage: 10, special: 'POISON_DOT', cooldown: 8000 },
    15: { name: 'Beedrill', type: 'poison', baseRange: 130, baseFireRate: 1.1, baseDamage: 16, special: 'PIERCE_SHOT', cooldown: 9000 },
    // ── Flying ────────────────────────────────────────────────────────────────
    16: { name: 'Pidgey', type: 'normal', baseRange: 110, baseFireRate: 0.8, baseDamage: 10, special: 'MULTI_SHOT', cooldown: 7000 },
    17: { name: 'Pidgeotto', type: 'normal', baseRange: 130, baseFireRate: 0.9, baseDamage: 14, special: 'MULTI_SHOT', cooldown: 7000 },
    18: { name: 'Pidgeot', type: 'normal', baseRange: 145, baseFireRate: 1.0, baseDamage: 20, special: 'KNOCKBACK', cooldown: 9000 },
    // ── Normal ────────────────────────────────────────────────────────────────
    19: { name: 'Rattata', type: 'normal', baseRange: 100, baseFireRate: 0.9, baseDamage: 9, special: 'PIERCE_SHOT', cooldown: 9000 },
    20: { name: 'Raticate', type: 'normal', baseRange: 110, baseFireRate: 1.0, baseDamage: 14, special: 'ARMOR_SHRED', cooldown: 10000 },
    21: { name: 'Spearow', type: 'normal', baseRange: 110, baseFireRate: 0.85, baseDamage: 11, special: 'MULTI_SHOT', cooldown: 7000 },
    22: { name: 'Fearow', type: 'normal', baseRange: 130, baseFireRate: 0.95, baseDamage: 16, special: 'PIERCE_SHOT', cooldown: 9000 },
    // ── Poison ────────────────────────────────────────────────────────────────
    23: { name: 'Ekans', type: 'poison', baseRange: 110, baseFireRate: 0.75, baseDamage: 11, special: 'POISON_DOT', cooldown: 8000 },
    24: { name: 'Arbok', type: 'poison', baseRange: 130, baseFireRate: 0.85, baseDamage: 18, special: 'ROOT_STOP', cooldown: 13000 },
    // ── Electric ──────────────────────────────────────────────────────────────
    25: { name: 'Pikachu', type: 'electric', baseRange: 130, baseFireRate: 1.0, baseDamage: 14, special: 'CHAIN_LIGHTNING', cooldown: 8000 },
    26: { name: 'Raichu', type: 'electric', baseRange: 145, baseFireRate: 1.1, baseDamage: 20, special: 'CHAIN_LIGHTNING', cooldown: 7000 },
    // ── Ground ────────────────────────────────────────────────────────────────
    27: { name: 'Sandshrew', type: 'ground', baseRange: 100, baseFireRate: 0.75, baseDamage: 11, special: 'WAVE_PUSH', cooldown: 10000 },
    28: { name: 'Sandslash', type: 'ground', baseRange: 120, baseFireRate: 0.9, baseDamage: 17, special: 'KNOCKBACK', cooldown: 9000 },
    // ── Common Wilds ────────────────────────────────────────────────────────
    35: { name: 'Clefairy', type: 'normal', baseRange: 120, baseFireRate: 0.8, baseDamage: 11, special: 'HEAL_TOWER', cooldown: 15000 },
    36: { name: 'Clefable', type: 'normal', baseRange: 140, baseFireRate: 0.9, baseDamage: 16, special: 'HEAL_TOWER', cooldown: 13000 },
    37: { name: 'Vulpix', type: 'fire', baseRange: 110, baseFireRate: 0.85, baseDamage: 12, special: 'BURN_DOT', cooldown: 7000 },
    38: { name: 'Ninetales', type: 'fire', baseRange: 135, baseFireRate: 1.0, baseDamage: 20, special: 'CONFUSE_WANDER', cooldown: 12000 },
    39: { name: 'Jigglypuff', type: 'normal', baseRange: 115, baseFireRate: 0.8, baseDamage: 10, special: 'PSY_STUN', cooldown: 10000 },
    40: { name: 'Wigglytuff', type: 'normal', baseRange: 130, baseFireRate: 0.9, baseDamage: 15, special: 'CONFUSE_WANDER', cooldown: 12000 },
    41: { name: 'Zubat', type: 'poison', baseRange: 120, baseFireRate: 0.85, baseDamage: 10, special: 'CONFUSE_WANDER', cooldown: 12000 },
    42: { name: 'Golbat', type: 'poison', baseRange: 145, baseFireRate: 1.0, baseDamage: 16, special: 'ARMOR_SHRED', cooldown: 10000 },
    43: { name: 'Oddish', type: 'grass', baseRange: 105, baseFireRate: 0.75, baseDamage: 10, special: 'SLOW_FIELD', cooldown: 11000 },
    44: { name: 'Gloom', type: 'grass', baseRange: 115, baseFireRate: 0.85, baseDamage: 14, special: 'POISON_DOT', cooldown: 8000 },
    45: { name: 'Vileplume', type: 'grass', baseRange: 130, baseFireRate: 0.9, baseDamage: 20, special: 'SLOW_FIELD', cooldown: 10000 },
    46: { name: 'Paras', type: 'bug', baseRange: 100, baseFireRate: 0.7, baseDamage: 10, special: 'ROOT_STOP', cooldown: 13000 },
    47: { name: 'Parasect', type: 'bug', baseRange: 120, baseFireRate: 0.8, baseDamage: 16, special: 'ROOT_STOP', cooldown: 12000 },
    50: { name: 'Diglett', type: 'ground', baseRange: 90, baseFireRate: 1.0, baseDamage: 9, special: 'KNOCKBACK', cooldown: 9000 },
    51: { name: 'Dugtrio', type: 'ground', baseRange: 110, baseFireRate: 1.1, baseDamage: 16, special: 'WAVE_PUSH', cooldown: 10000 },
    52: { name: 'Meowth', type: 'normal', baseRange: 100, baseFireRate: 0.85, baseDamage: 10, special: 'SNIPE_MARK', cooldown: 6000 },
    56: { name: 'Mankey', type: 'fighting', baseRange: 100, baseFireRate: 0.9, baseDamage: 12, special: 'KNOCKBACK', cooldown: 9000 },
    57: { name: 'Primeape', type: 'fighting', baseRange: 120, baseFireRate: 1.0, baseDamage: 18, special: 'AOE_BLAST', cooldown: 8000 },
    58: { name: 'Growlithe', type: 'fire', baseRange: 110, baseFireRate: 0.85, baseDamage: 12, special: 'BURN_DOT', cooldown: 7000 },
    59: { name: 'Arcanine', type: 'fire', baseRange: 140, baseFireRate: 1.1, baseDamage: 24, special: 'METEOR_RAIN', cooldown: 14000 },
    60: { name: 'Poliwag', type: 'water', baseRange: 110, baseFireRate: 0.8, baseDamage: 10, special: 'SLOW_FIELD', cooldown: 11000 },
    61: { name: 'Poliwhirl', type: 'water', baseRange: 125, baseFireRate: 0.9, baseDamage: 16, special: 'WAVE_PUSH', cooldown: 10000 },
    62: { name: 'Poliwrath', type: 'water', baseRange: 140, baseFireRate: 1.0, baseDamage: 22, special: 'KNOCKBACK', cooldown: 9000 },
    63: { name: 'Abra', type: 'psychic', baseRange: 140, baseFireRate: 0.8, baseDamage: 13, special: 'PSY_STUN', cooldown: 10000 },
    64: { name: 'Kadabra', type: 'psychic', baseRange: 155, baseFireRate: 0.9, baseDamage: 18, special: 'CONFUSE_WANDER', cooldown: 12000 },
    65: { name: 'Alakazam', type: 'psychic', baseRange: 170, baseFireRate: 1.0, baseDamage: 26, special: 'PSY_STUN', cooldown: 9000 },
    66: { name: 'Machop', type: 'fighting', baseRange: 100, baseFireRate: 0.8, baseDamage: 12, special: 'KNOCKBACK', cooldown: 9000 },
    67: { name: 'Machoke', type: 'fighting', baseRange: 115, baseFireRate: 0.9, baseDamage: 17, special: 'WAVE_PUSH', cooldown: 10000 },
    68: { name: 'Machamp', type: 'fighting', baseRange: 130, baseFireRate: 1.0, baseDamage: 26, special: 'AOE_BLAST', cooldown: 8000 },
    70: { name: 'Weepinbell', type: 'grass', baseRange: 120, baseFireRate: 0.85, baseDamage: 14, special: 'SLOW_FIELD', cooldown: 11000 },
    71: { name: 'Victreebel', type: 'grass', baseRange: 140, baseFireRate: 0.95, baseDamage: 22, special: 'ROOT_STOP', cooldown: 12000 },
    72: { name: 'Tentacool', type: 'water', baseRange: 120, baseFireRate: 0.85, baseDamage: 12, special: 'POISON_DOT', cooldown: 8000 },
    74: { name: 'Geodude', type: 'rock', baseRange: 90, baseFireRate: 0.7, baseDamage: 14, special: 'AOE_BLAST', cooldown: 8000 },
    75: { name: 'Graveler', type: 'rock', baseRange: 100, baseFireRate: 0.8, baseDamage: 20, special: 'AOE_BLAST', cooldown: 7500 },
    76: { name: 'Golem', type: 'rock', baseRange: 115, baseFireRate: 0.9, baseDamage: 28, special: 'WAVE_PUSH', cooldown: 10000 },
    78: { name: 'Rapidash', type: 'fire', baseRange: 130, baseFireRate: 1.2, baseDamage: 20, special: 'BURN_DOT', cooldown: 6000 },
    79: { name: 'Slowpoke', type: 'water', baseRange: 110, baseFireRate: 0.6, baseDamage: 13, special: 'PSY_STUN', cooldown: 10000 },
    80: { name: 'Slowbro', type: 'water', baseRange: 130, baseFireRate: 0.75, baseDamage: 20, special: 'CONFUSE_WANDER', cooldown: 12000 },
    88: { name: 'Grimer', type: 'poison', baseRange: 90, baseFireRate: 0.7, baseDamage: 11, special: 'POISON_DOT', cooldown: 8000 },
    89: { name: 'Muk', type: 'poison', baseRange: 110, baseFireRate: 0.85, baseDamage: 19, special: 'SLOW_FIELD', cooldown: 11000 },
    90: { name: 'Shellder', type: 'water', baseRange: 100, baseFireRate: 0.75, baseDamage: 12, special: 'FREEZE_STUN', cooldown: 12000 },
    91: { name: 'Cloyster', type: 'water', baseRange: 120, baseFireRate: 0.85, baseDamage: 20, special: 'FREEZE_STUN', cooldown: 11000 },
    92: { name: 'Gastly', type: 'ghost', baseRange: 130, baseFireRate: 0.85, baseDamage: 12, special: 'CONFUSE_WANDER', cooldown: 12000 },
    93: { name: 'Haunter', type: 'ghost', baseRange: 145, baseFireRate: 0.9, baseDamage: 18, special: 'PSY_STUN', cooldown: 10000 },
    94: { name: 'Gengar', type: 'ghost', baseRange: 165, baseFireRate: 1.0, baseDamage: 27, special: 'CONFUSE_WANDER', cooldown: 11000 },
    95: { name: 'Onix', type: 'rock', baseRange: 100, baseFireRate: 0.7, baseDamage: 18, special: 'AOE_BLAST', cooldown: 8000 },
    100: { name: 'Voltorb', type: 'electric', baseRange: 120, baseFireRate: 1.0, baseDamage: 12, special: 'AOE_BLAST', cooldown: 8000 },
    101: { name: 'Electrode', type: 'electric', baseRange: 135, baseFireRate: 1.15, baseDamage: 18, special: 'CHAIN_LIGHTNING', cooldown: 7000 },
    106: { name: 'Hitmonlee', type: 'fighting', baseRange: 115, baseFireRate: 1.0, baseDamage: 18, special: 'KNOCKBACK', cooldown: 9000 },
    109: { name: 'Koffing', type: 'poison', baseRange: 110, baseFireRate: 0.8, baseDamage: 13, special: 'POISON_DOT', cooldown: 8000 },
    110: { name: 'Weezing', type: 'poison', baseRange: 130, baseFireRate: 0.9, baseDamage: 20, special: 'SLOW_FIELD', cooldown: 11000 },
    111: { name: 'Rhyhorn', type: 'ground', baseRange: 100, baseFireRate: 0.75, baseDamage: 16, special: 'WAVE_PUSH', cooldown: 10000 },
    112: { name: 'Rhydon', type: 'ground', baseRange: 120, baseFireRate: 0.85, baseDamage: 24, special: 'KNOCKBACK', cooldown: 9000 },
    113: { name: 'Chansey', type: 'normal', baseRange: 140, baseFireRate: 0.7, baseDamage: 10, special: 'HEAL_TOWER', cooldown: 12000 },
    116: { name: 'Horsea', type: 'water', baseRange: 110, baseFireRate: 0.85, baseDamage: 11, special: 'SLOW_FIELD', cooldown: 11000 },
    117: { name: 'Seadra', type: 'water', baseRange: 130, baseFireRate: 0.95, baseDamage: 17, special: 'WAVE_PUSH', cooldown: 10000 },
    118: { name: 'Goldeen', type: 'water', baseRange: 110, baseFireRate: 0.8, baseDamage: 11, special: 'SLOW_FIELD', cooldown: 11000 },
    119: { name: 'Seaking', type: 'water', baseRange: 125, baseFireRate: 0.9, baseDamage: 17, special: 'WAVE_PUSH', cooldown: 10000 },
    120: { name: 'Staryu', type: 'water', baseRange: 130, baseFireRate: 0.95, baseDamage: 14, special: 'CAPTURE_NET', cooldown: 5000 },
    121: { name: 'Starmie', type: 'psychic', baseRange: 155, baseFireRate: 1.05, baseDamage: 22, special: 'PSY_STUN', cooldown: 9000 },
    123: { name: 'Scyther', type: 'bug', baseRange: 140, baseFireRate: 1.1, baseDamage: 20, special: 'MULTI_SHOT', cooldown: 7000 },
    124: { name: 'Jynx', type: 'ice', baseRange: 140, baseFireRate: 0.9, baseDamage: 18, special: 'FREEZE_STUN', cooldown: 12000 },
    125: { name: 'Electabuzz', type: 'electric', baseRange: 140, baseFireRate: 1.05, baseDamage: 20, special: 'CHAIN_LIGHTNING', cooldown: 7500 },
    126: { name: 'Magmar', type: 'fire', baseRange: 135, baseFireRate: 1.0, baseDamage: 20, special: 'BURN_DOT', cooldown: 6500 },
    127: { name: 'Pinsir', type: 'bug', baseRange: 120, baseFireRate: 1.05, baseDamage: 22, special: 'KNOCKBACK', cooldown: 9000 },
    128: { name: 'Tauros', type: 'normal', baseRange: 130, baseFireRate: 1.1, baseDamage: 22, special: 'WAVE_PUSH', cooldown: 10000 },
    129: { name: 'Magikarp', type: 'water', baseRange: 80, baseFireRate: 0.5, baseDamage: 4, special: 'CAPTURE_NET', cooldown: 5000 },
    130: { name: 'Gyarados', type: 'water', baseRange: 160, baseFireRate: 1.1, baseDamage: 32, special: 'AOE_BLAST', cooldown: 7000 },
    131: { name: 'Lapras', type: 'water', baseRange: 155, baseFireRate: 0.9, baseDamage: 24, special: 'FREEZE_STUN', cooldown: 11000 },
    132: { name: 'Ditto', type: 'normal', baseRange: 120, baseFireRate: 0.9, baseDamage: 14, special: 'CONFUSE_WANDER', cooldown: 12000 },
    133: { name: 'Eevee', type: 'normal', baseRange: 110, baseFireRate: 0.85, baseDamage: 12, special: 'SPEED_BUFF', cooldown: 12000 },
    134: { name: 'Vaporeon', type: 'water', baseRange: 145, baseFireRate: 0.95, baseDamage: 20, special: 'HEAL_TOWER', cooldown: 13000 },
    135: { name: 'Jolteon', type: 'electric', baseRange: 155, baseFireRate: 1.15, baseDamage: 22, special: 'CHAIN_LIGHTNING', cooldown: 7000 },
    136: { name: 'Flareon', type: 'fire', baseRange: 140, baseFireRate: 1.05, baseDamage: 22, special: 'BURN_DOT', cooldown: 6500 },
    137: { name: 'Porygon', type: 'normal', baseRange: 145, baseFireRate: 1.0, baseDamage: 20, special: 'SHIELD_SELF', cooldown: 20000 },
    143: { name: 'Snorlax', type: 'normal', baseRange: 120, baseFireRate: 0.7, baseDamage: 24, special: 'AOE_BLAST', cooldown: 8000 },
    147: { name: 'Dratini', type: 'dragon', baseRange: 130, baseFireRate: 0.85, baseDamage: 14, special: 'METEOR_RAIN', cooldown: 14000 },
    148: { name: 'Dragonair', type: 'dragon', baseRange: 150, baseFireRate: 0.95, baseDamage: 22, special: 'ROOT_STOP', cooldown: 12000 },
    149: { name: 'Dragonite', type: 'dragon', baseRange: 175, baseFireRate: 1.1, baseDamage: 36, special: 'METEOR_RAIN', cooldown: 12000 },
};

/**
 * Get tower config for a given speciesId + pokemonType.
 * Falls back to type-based heuristic if not in explicit table.
 */
export function getTowerConfig(speciesId, pokemonType = 'normal') {
    if (EXPLICIT_CONFIGS[speciesId]) return EXPLICIT_CONFIGS[speciesId];

    // Generic fallback by type
    const specialKey = specialKeyForType(pokemonType);
    const ability = ABILITIES[specialKey];
    return {
        name: `Pokémon #${speciesId}`,
        type: pokemonType,
        baseRange: 110,
        baseFireRate: 0.8,
        baseDamage: 10,
        special: specialKey,
        cooldown: ability?.cooldownMs ?? 10000,
    };
}

export { EXPLICIT_CONFIGS };
