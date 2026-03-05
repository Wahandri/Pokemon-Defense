// ─── Pokémon Tier Data ────────────────────────────────────────────────────────
// Each enemy type maps to a pool of Pokémon from that tier.
// Stats (HP, speed, reward) still come from balance.js ENEMY_CONFIG.
// This file only provides: id (for sprite), name (for display), tier label.

// Sprite CDN — static files, no API call needed (CORS-friendly GitHub raw)
export function getSpriteUrl(id) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

// ── Tier pools (type key → array of { id, name }) ─────────────────────────────
export const POKEMON_POOLS = {

    // ── Tier 1: Comunes ─ waves 1-5 ─────────────────────────────────────────
    red: [
        { id: 129, name: 'Magikarp' },
        { id: 10, name: 'Caterpie' },
        { id: 13, name: 'Weedle' },
        { id: 16, name: 'Pidgey' },
        { id: 19, name: 'Rattata' },
        { id: 21, name: 'Spearow' },
        { id: 161, name: 'Sentret' },
        { id: 163, name: 'Hoothoot' },
        { id: 43, name: 'Oddish' },
        { id: 41, name: 'Zubat' },
    ],

    // ── Tier 2: Poco comunes ─ waves 6-12 ───────────────────────────────────
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

    // ── Tier 3: Raros ─ waves 13-20 ─────────────────────────────────────────
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

    // ── Tier 4: Épicos ─ waves 21-30 ────────────────────────────────────────
    t4: [
        { id: 149, name: 'Dragonite' },
        { id: 143, name: 'Snorlax' },
        { id: 130, name: 'Gyarados' },
        { id: 131, name: 'Lapras' },
        { id: 134, name: 'Vaporeon' },
        { id: 136, name: 'Flareon' },
        { id: 135, name: 'Jolteon' },
        { id: 248, name: 'Tyranitar' },
        { id: 230, name: 'Kingdra' },
        { id: 373, name: 'Salamence' },
    ],

    // ── Tier 5: Legendarios ─ Boss waves ────────────────────────────────────
    boss: [
        { id: 150, name: 'Mewtwo' },
        { id: 151, name: 'Mew' },
        { id: 144, name: 'Articuno' },
        { id: 145, name: 'Zapdos' },
        { id: 146, name: 'Moltres' },
        { id: 249, name: 'Lugia' },
        { id: 250, name: 'Ho-Oh' },
        { id: 384, name: 'Rayquaza' },
    ],
};

// ── Tier metadata (for UI labels) ────────────────────────────────────────────
export const TIER_INFO = {
    red: { tier: 1, label: 'Común', stars: '★', color: '#e84040' },
    blue: { tier: 2, label: 'Poco Común', stars: '★★', color: '#3a8fff' },
    green: { tier: 3, label: 'Raro', stars: '★★★', color: '#2dbd55' },
    t4: { tier: 4, label: 'Épico', stars: '★★★★', color: '#c792ea' },
    boss: { tier: 5, label: 'Legendario', stars: '★★★★★', color: '#f47c3c' },
};

/** Pick a random Pokémon from the type's tier pool */
export function pickPokemon(type) {
    const pool = POKEMON_POOLS[type] ?? POKEMON_POOLS.red;
    return pool[Math.floor(Math.random() * pool.length)];
}

/** Get boss pokemon by wave number (cycles) */
export function pickBoss(wave) {
    const pool = POKEMON_POOLS.boss;
    return pool[wave % pool.length];
}
