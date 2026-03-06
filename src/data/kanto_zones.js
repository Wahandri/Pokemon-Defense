// ─── Kanto Zones Dataset (Complete MVP — 8 Gyms) ─────────────────────────────
// All playable zones/routes/gyms in Kanto story order.
// Each zone has its own waypoints (simple paths), encounter list, and unlock rule.
//
// Waypoint coordinate system: pixel coords on the 960×640 canvas.
// Use gridToPixel(col+0.5, row+0.5, CELL=40) → each cell = 40px.

import { CANVAS_W, CANVAS_H } from '../utils/constants.js';

// ─── Shared waypoint templates ────────────────────────────────────────────────
// Keep paths simple: left→right with 1-2 turns.
// y values: rows 2,4,6,8,10,12 → y = 90,170,250,330,410,490 approx.

const PATH_STRAIGHT_TOP = [
    { x: 0, y: 130 }, { x: 960, y: 130 },
];
const PATH_S_CURVE = [
    { x: 0, y: 100 },
    { x: 300, y: 100 }, { x: 300, y: 280 },
    { x: 700, y: 280 }, { x: 700, y: 440 },
    { x: 960, y: 440 },
];
const PATH_Z_SHORT = [
    { x: 0, y: 120 },
    { x: 400, y: 120 }, { x: 400, y: 320 },
    { x: 960, y: 320 },
];
const PATH_Z_LONG = [
    { x: 0, y: 80 },
    { x: 280, y: 80 }, { x: 280, y: 240 },
    { x: 600, y: 240 }, { x: 600, y: 400 },
    { x: 840, y: 400 }, { x: 840, y: 540 },
    { x: 960, y: 540 },
];
const PATH_LOOP_MID = [
    { x: 0, y: 200 },
    { x: 240, y: 200 }, { x: 240, y: 80 },
    { x: 720, y: 80 }, { x: 720, y: 360 },
    { x: 240, y: 360 }, { x: 240, y: 520 },
    { x: 960, y: 520 },
];
const PATH_GYM = [
    { x: 0, y: 200 },
    { x: 440, y: 200 }, { x: 440, y: 440 },
    { x: 960, y: 440 },
];
const PATH_CAVE = [
    { x: 0, y: 120 },
    { x: 200, y: 120 }, { x: 200, y: 280 },
    { x: 500, y: 280 }, { x: 500, y: 120 },
    { x: 760, y: 120 }, { x: 760, y: 400 },
    { x: 960, y: 400 },
];
const PATH_LONG_WINDING = [
    { x: 0, y: 80 },
    { x: 320, y: 80 }, { x: 320, y: 200 },
    { x: 640, y: 200 }, { x: 640, y: 360 },
    { x: 320, y: 360 }, { x: 320, y: 520 },
    { x: 960, y: 520 },
];
const PATH_ISLAND = [
    { x: 0, y: 160 },
    { x: 200, y: 160 }, { x: 200, y: 400 },
    { x: 500, y: 400 }, { x: 500, y: 160 },
    { x: 760, y: 160 }, { x: 760, y: 520 },
    { x: 960, y: 520 },
];

// ─── Zone definitions ─────────────────────────────────────────────────────────

/** @type {import('./kanto_zones.js').KantoZone[]} */
export const KANTO_ZONES = [

    // ══ PART 1 — Pewter Area ══════════════════════════════════════════════════

    {
        id: 'route1',
        name: 'Ruta 1',
        type: 'zone',
        emoji: '🌿',
        recommendedLevel: 1,
        bgColor: '#1c3320',
        waypoints: PATH_STRAIGHT_TOP,
        encounters: [
            { speciesId: 19, name: 'Rattata', pokemonType: 'normal', tier: 'red' },
            { speciesId: 16, name: 'Pidgey', pokemonType: 'normal', tier: 'red' },
            { speciesId: 10, name: 'Caterpie', pokemonType: 'bug', tier: 'red' },
        ],
        roundRules: { minSpawn: 1, maxSpawn: 3, baseDelay: 1000 },
        unlockRule: { type: 'always' },
    },

    {
        id: 'viridian_forest',
        name: 'Bosque Verde',
        type: 'zone',
        emoji: '🌲',
        recommendedLevel: 3,
        bgColor: '#0e2210',
        waypoints: PATH_Z_SHORT,
        encounters: [
            { speciesId: 10, name: 'Caterpie', pokemonType: 'bug', tier: 'red' },
            { speciesId: 13, name: 'Weedle', pokemonType: 'poison', tier: 'red' },
            { speciesId: 25, name: 'Pikachu', pokemonType: 'electric', tier: 'blue' },
        ],
        roundRules: { minSpawn: 2, maxSpawn: 4, baseDelay: 900 },
        unlockRule: { type: 'capture_from', zoneId: 'route1', count: 3 },
    },

    {
        id: 'pewter_gym',
        name: 'Gimnasio Roca',
        type: 'gym',
        emoji: '🏅',
        recommendedLevel: 5,
        bgColor: '#18140c',
        waypoints: PATH_GYM,
        leader: 'Brock',
        badgeId: 'roca',
        badgeName: 'Medalla Roca',
        encounters: [],
        waves: [
            [{ speciesId: 74, name: 'Geodude', pokemonType: 'rock', tier: 'blue' }],
            [{ speciesId: 74, name: 'Geodude', pokemonType: 'rock', tier: 'blue' }],
            [{ speciesId: 95, name: 'Onix', pokemonType: 'rock', tier: 'green' }],
        ],
        roundRules: { minSpawn: 1, maxSpawn: 1, baseDelay: 1200 },
        unlockRule: { type: 'total_captures', count: 5 },
    },

    // ══ PART 2 — Cerulean Area ════════════════════════════════════════════════

    {
        id: 'route3',
        name: 'Ruta 3',
        type: 'zone',
        emoji: '🌄',
        recommendedLevel: 8,
        bgColor: '#1c2e18',
        waypoints: PATH_Z_SHORT,
        encounters: [
            { speciesId: 39, name: 'Jigglypuff', pokemonType: 'normal', tier: 'blue' },
            { speciesId: 23, name: 'Ekans', pokemonType: 'poison', tier: 'blue' },
            { speciesId: 27, name: 'Sandshrew', pokemonType: 'ground', tier: 'blue' },
            { speciesId: 21, name: 'Spearow', pokemonType: 'normal', tier: 'blue' },
        ],
        roundRules: { minSpawn: 2, maxSpawn: 5, baseDelay: 850 },
        unlockRule: { type: 'badge', badgeId: 'roca' },
    },

    {
        id: 'mt_moon',
        name: 'Monte Luna',
        type: 'zone',
        emoji: '🌙',
        recommendedLevel: 10,
        bgColor: '#0c0c1a',
        waypoints: PATH_CAVE,
        encounters: [
            { speciesId: 41, name: 'Zubat', pokemonType: 'poison', tier: 'blue' },
            { speciesId: 46, name: 'Paras', pokemonType: 'bug', tier: 'blue' },
            { speciesId: 35, name: 'Clefairy', pokemonType: 'normal', tier: 'blue' },
            { speciesId: 74, name: 'Geodude', pokemonType: 'rock', tier: 'blue' },
        ],
        roundRules: { minSpawn: 3, maxSpawn: 6, baseDelay: 800 },
        unlockRule: { type: 'capture_from', zoneId: 'route3', count: 4 },
    },

    {
        id: 'cerulean_gym',
        name: 'Gimnasio Agua',
        type: 'gym',
        emoji: '💧',
        recommendedLevel: 12,
        bgColor: '#0a1a2e',
        waypoints: PATH_GYM,
        leader: 'Misty',
        badgeId: 'cascada',
        badgeName: 'Medalla Cascada',
        encounters: [],
        waves: [
            [{ speciesId: 120, name: 'Staryu', pokemonType: 'water', tier: 'blue' }],
            [{ speciesId: 120, name: 'Staryu', pokemonType: 'water', tier: 'blue' }],
            [{ speciesId: 121, name: 'Starmie', pokemonType: 'psychic', tier: 'green' }],
        ],
        roundRules: { minSpawn: 1, maxSpawn: 1, baseDelay: 1100 },
        unlockRule: { type: 'capture_from', zoneId: 'mt_moon', count: 5 },
    },

    // ══ PART 3 — Vermilion Area ═══════════════════════════════════════════════

    {
        id: 'route6',
        name: 'Ruta 6',
        type: 'zone',
        emoji: '🛤️',
        recommendedLevel: 14,
        bgColor: '#1a2414',
        waypoints: PATH_S_CURVE,
        encounters: [
            { speciesId: 43, name: 'Oddish', pokemonType: 'grass', tier: 'blue' },
            { speciesId: 52, name: 'Meowth', pokemonType: 'normal', tier: 'blue' },
            { speciesId: 60, name: 'Poliwag', pokemonType: 'water', tier: 'blue' },
            { speciesId: 16, name: 'Pidgey', pokemonType: 'normal', tier: 'blue' },
        ],
        roundRules: { minSpawn: 3, maxSpawn: 6, baseDelay: 800 },
        unlockRule: { type: 'badge', badgeId: 'cascada' },
    },

    {
        id: 'vermilion_gym',
        name: 'Gimnasio Trueno',
        type: 'gym',
        emoji: '⚡',
        recommendedLevel: 18,
        bgColor: '#12100a',
        waypoints: PATH_GYM,
        leader: 'Lt. Surge',
        badgeId: 'trueno',
        badgeName: 'Medalla Trueno',
        encounters: [],
        waves: [
            [{ speciesId: 100, name: 'Voltorb', pokemonType: 'electric', tier: 'blue' }],
            [{ speciesId: 100, name: 'Voltorb', pokemonType: 'electric', tier: 'blue' }],
            [{ speciesId: 26, name: 'Raichu', pokemonType: 'electric', tier: 'green' }],
        ],
        roundRules: { minSpawn: 1, maxSpawn: 1, baseDelay: 1000 },
        unlockRule: { type: 'level', level: 15 },
    },

    // ══ PART 4 — Rock Tunnel / Celadon Area ══════════════════════════════════

    {
        id: 'rock_tunnel',
        name: 'Túnel Roca',
        type: 'zone',
        emoji: '🪨',
        recommendedLevel: 20,
        bgColor: '#14100c',
        waypoints: PATH_LONG_WINDING,
        encounters: [
            { speciesId: 41, name: 'Zubat', pokemonType: 'poison', tier: 'blue' },
            { speciesId: 74, name: 'Geodude', pokemonType: 'rock', tier: 'blue' },
            { speciesId: 66, name: 'Machop', pokemonType: 'fighting', tier: 'blue' },
            { speciesId: 104, name: 'Cubone', pokemonType: 'ground', tier: 'blue' },
        ],
        roundRules: { minSpawn: 3, maxSpawn: 7, baseDelay: 780 },
        unlockRule: { type: 'badge', badgeId: 'trueno' },
    },

    {
        id: 'celadon_gym',
        name: 'Gimnasio Planta',
        type: 'gym',
        emoji: '🌸',
        recommendedLevel: 24,
        bgColor: '#0a1a0a',
        waypoints: PATH_GYM,
        leader: 'Erika',
        badgeId: 'arco_iris',
        badgeName: 'Medalla Arco Iris',
        encounters: [],
        waves: [
            [{ speciesId: 71, name: 'Victreebel', pokemonType: 'grass', tier: 'blue' }],
            [{ speciesId: 45, name: 'Vileplume', pokemonType: 'grass', tier: 'blue' }],
            [{ speciesId: 44, name: 'Gloom', pokemonType: 'grass', tier: 'green' }],
            [{ speciesId: 45, name: 'Vileplume', pokemonType: 'grass', tier: 'green' }],
        ],
        roundRules: { minSpawn: 1, maxSpawn: 1, baseDelay: 1000 },
        unlockRule: { type: 'badge', badgeId: 'trueno' },
    },

    // ══ PART 5 — Fuchsia Area (Koga) ═════════════════════════════════════════

    {
        id: 'route14',
        name: 'Ruta 14-15',
        type: 'zone',
        emoji: '🦟',
        recommendedLevel: 26,
        bgColor: '#1a1a28',
        waypoints: PATH_Z_LONG,
        encounters: [
            { speciesId: 88, name: 'Grimer', pokemonType: 'poison', tier: 'blue' },
            { speciesId: 42, name: 'Golbat', pokemonType: 'poison', tier: 'blue' },
            { speciesId: 109, name: 'Koffing', pokemonType: 'poison', tier: 'blue' },
            { speciesId: 72, name: 'Tentacool', pokemonType: 'water', tier: 'blue' },
        ],
        roundRules: { minSpawn: 4, maxSpawn: 8, baseDelay: 760 },
        unlockRule: { type: 'badge', badgeId: 'arco_iris' },
    },

    {
        id: 'fuchsia_gym',
        name: 'Gimnasio Veneno',
        type: 'gym',
        emoji: '☠️',
        recommendedLevel: 30,
        bgColor: '#120a18',
        waypoints: PATH_GYM,
        leader: 'Koga',
        badgeId: 'alma',
        badgeName: 'Medalla Alma',
        encounters: [],
        waves: [
            [{ speciesId: 89, name: 'Muk', pokemonType: 'poison', tier: 'blue' }],
            [{ speciesId: 42, name: 'Golbat', pokemonType: 'poison', tier: 'blue' }],
            [{ speciesId: 110, name: 'Weezing', pokemonType: 'poison', tier: 'green' }],
            [{ speciesId: 89, name: 'Muk', pokemonType: 'poison', tier: 'green' }],
        ],
        roundRules: { minSpawn: 1, maxSpawn: 1, baseDelay: 1000 },
        unlockRule: { type: 'badge', badgeId: 'arco_iris' },
    },

    // ══ PART 6 — Saffron Area (Sabrina) ═══════════════════════════════════════

    {
        id: 'route16',
        name: 'Ruta 16',
        type: 'zone',
        emoji: '🚲',
        recommendedLevel: 32,
        bgColor: '#0e1820',
        waypoints: PATH_S_CURVE,
        encounters: [
            { speciesId: 63, name: 'Abra', pokemonType: 'psychic', tier: 'blue' },
            { speciesId: 79, name: 'Slowpoke', pokemonType: 'water', tier: 'blue' },
            { speciesId: 92, name: 'Gastly', pokemonType: 'ghost', tier: 'blue' },
            { speciesId: 132, name: 'Ditto', pokemonType: 'normal', tier: 'blue' },
        ],
        roundRules: { minSpawn: 4, maxSpawn: 8, baseDelay: 750 },
        unlockRule: { type: 'badge', badgeId: 'alma' },
    },

    {
        id: 'saffron_gym',
        name: 'Gimnasio Psíquico',
        type: 'gym',
        emoji: '🌀',
        recommendedLevel: 38,
        bgColor: '#1a0a18',
        waypoints: PATH_GYM,
        leader: 'Sabrina',
        badgeId: 'pantano',
        badgeName: 'Medalla Pantano',
        encounters: [],
        waves: [
            [{ speciesId: 64, name: 'Kadabra', pokemonType: 'psychic', tier: 'green' }],
            [{ speciesId: 122, name: 'Mr. Mime', pokemonType: 'psychic', tier: 'green' }],
            [{ speciesId: 65, name: 'Alakazam', pokemonType: 'psychic', tier: 't4' }],
        ],
        roundRules: { minSpawn: 1, maxSpawn: 1, baseDelay: 1000 },
        unlockRule: { type: 'badge', badgeId: 'alma' },
    },

    // ══ PART 7 — Cinnabar Island (Blaine) ════════════════════════════════════

    {
        id: 'seafoam',
        name: 'Islas Heladitas',
        type: 'zone',
        emoji: '🧊',
        recommendedLevel: 40,
        bgColor: '#0a0c1a',
        waypoints: PATH_LOOP_MID,
        encounters: [
            { speciesId: 86, name: 'Seel', pokemonType: 'water', tier: 'green' },
            { speciesId: 91, name: 'Cloyster', pokemonType: 'water', tier: 'green' },
            { speciesId: 131, name: 'Lapras', pokemonType: 'water', tier: 'green' },
            { speciesId: 54, name: 'Psyduck', pokemonType: 'water', tier: 'blue' },
        ],
        roundRules: { minSpawn: 4, maxSpawn: 9, baseDelay: 740 },
        unlockRule: { type: 'badge', badgeId: 'pantano' },
    },

    {
        id: 'cinnabar_gym',
        name: 'Gimnasio Fuego',
        type: 'gym',
        emoji: '🔥',
        recommendedLevel: 46,
        bgColor: '#200c04',
        waypoints: PATH_GYM,
        leader: 'Blaine',
        badgeId: 'volcan',
        badgeName: 'Medalla Volcán',
        encounters: [],
        waves: [
            [{ speciesId: 59, name: 'Arcanine', pokemonType: 'fire', tier: 'green' }],
            [{ speciesId: 78, name: 'Rapidash', pokemonType: 'fire', tier: 'green' }],
            [{ speciesId: 126, name: 'Magmar', pokemonType: 'fire', tier: 'green' }],
            [{ speciesId: 59, name: 'Arcanine', pokemonType: 'fire', tier: 't4' }],
        ],
        roundRules: { minSpawn: 1, maxSpawn: 1, baseDelay: 1000 },
        unlockRule: { type: 'badge', badgeId: 'pantano' },
    },

    // ══ PART 8 — Viridian City (Giovanni / Final) ════════════════════════════

    {
        id: 'victory_road',
        name: 'Camino Victoria',
        type: 'zone',
        emoji: '⚔️',
        recommendedLevel: 48,
        bgColor: '#100a08',
        waypoints: PATH_ISLAND,
        encounters: [
            { speciesId: 111, name: 'Rhyhorn', pokemonType: 'ground', tier: 'green' },
            { speciesId: 112, name: 'Rhydon', pokemonType: 'ground', tier: 'green' },
            { speciesId: 66, name: 'Machop', pokemonType: 'fighting', tier: 'green' },
            { speciesId: 127, name: 'Pinsir', pokemonType: 'bug', tier: 'green' },
            { speciesId: 130, name: 'Gyarados', pokemonType: 'water', tier: 't4' },
        ],
        roundRules: { minSpawn: 5, maxSpawn: 12, baseDelay: 700 },
        unlockRule: { type: 'badge', badgeId: 'volcan' },
    },

    {
        id: 'viridian_gym',
        name: 'Gimnasio Tierra (Giovanni)',
        type: 'gym',
        emoji: '🌍',
        recommendedLevel: 52,
        bgColor: '#0a0808',
        waypoints: PATH_GYM,
        leader: 'Giovanni',
        badgeId: 'tierra',
        badgeName: 'Medalla Tierra',
        encounters: [],
        waves: [
            [{ speciesId: 111, name: 'Rhyhorn', pokemonType: 'ground', tier: 'green' }],
            [{ speciesId: 28, name: 'Sandslash', pokemonType: 'ground', tier: 'green' }],
            [{ speciesId: 112, name: 'Rhydon', pokemonType: 'ground', tier: 't4' }],
            [{ speciesId: 31, name: 'Nidoqueen', pokemonType: 'ground', tier: 't4' }],
            [{ speciesId: 34, name: 'Nidoking', pokemonType: 'ground', tier: 't4' }],
        ],
        roundRules: { minSpawn: 1, maxSpawn: 1, baseDelay: 1000 },
        unlockRule: { type: 'badge', badgeId: 'volcan' },
    },
];

// ─── Unlock logic ─────────────────────────────────────────────────────────────

/**
 * Check whether a zone is accessible given the trainer's current state.
 * @param {object} zone
 * @param {import('../systems/TrainerSystem.js').TrainerSystem} trainer
 * @returns {boolean}
 */
export function isZoneUnlocked(zone, trainer) {
    const rule = zone.unlockRule;
    if (!rule) return true;
    switch (rule.type) {
        case 'always':
            return true;
        case 'capture_from': {
            const count = trainer.capturesPerZone?.get(rule.zoneId) ?? 0;
            return count >= rule.count;
        }
        case 'total_captures':
            return (trainer.totalCaptures ?? 0) >= rule.count;
        case 'badge':
            return trainer.hasBadge?.(rule.badgeId) ?? false;
        case 'level':
            return (trainer.level ?? 1) >= (rule.level ?? 1);
        default:
            return false;
    }
}
