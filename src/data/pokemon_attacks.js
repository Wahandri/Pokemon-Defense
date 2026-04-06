// ─── Attack Catalog by Pokémon Type ────────────────────────────────────────────
// Each type has 4 attacks unlocked progressively (level 1 / 2 / 4 / 7).
// mode: 'single' | 'slow' | 'dot' | 'multi' | 'pierce' | 'aoe'
// Multipliers are relative to the tower's base stats at that moment.

export const TYPE_ATTACKS = {
    grass: [
        { id: 'tackle',     name: 'Placaje',      emoji: '💥', mode: 'single', dmgMult: 1.0,  unlockLv: 1 },
        { id: 'vine_whip',  name: 'Látigo Cepa',  emoji: '🌿', mode: 'slow',   dmgMult: 1.0,  slowAmt: 0.40, slowDur: 1500, unlockLv: 2 },
        { id: 'razor_leaf', name: 'Hoja Navaja',  emoji: '🍃', mode: 'multi',  dmgMult: 0.85, multiCount: 3, unlockLv: 4 },
        { id: 'solar_beam', name: 'Rayo Solar',   emoji: '☀️',  mode: 'single', dmgMult: 2.2,  rangeMult: 1.3, unlockLv: 7 },
    ],
    fire: [
        { id: 'scratch',      name: 'Arañazo',      emoji: '💥', mode: 'single', dmgMult: 1.0,  unlockLv: 1 },
        { id: 'ember',        name: 'Ascuas',        emoji: '🔥', mode: 'dot',    dmgMult: 0.8,  dotDmg: 3, dotDur: 2000, unlockLv: 2 },
        { id: 'flamethrower', name: 'Lanzallamas',   emoji: '🌋', mode: 'pierce', dmgMult: 1.1,  pierceCount: 3, unlockLv: 4 },
        { id: 'fire_blast',   name: 'Deflagración',  emoji: '💣', mode: 'aoe',    dmgMult: 1.3,  aoeRadius: 65, unlockLv: 7 },
    ],
    water: [
        { id: 'tackle',     name: 'Placaje',       emoji: '💥', mode: 'single', dmgMult: 1.0,  unlockLv: 1 },
        { id: 'water_gun',  name: 'Pistola Agua',  emoji: '💧', mode: 'slow',   dmgMult: 1.0,  slowAmt: 0.45, slowDur: 1800, unlockLv: 2 },
        { id: 'bubble',     name: 'Burbuja',       emoji: '🫧', mode: 'multi',  dmgMult: 0.8,  multiCount: 3, slowAmt: 0.3, slowDur: 1000, unlockLv: 4 },
        { id: 'hydro_pump', name: 'Hidrobomba',    emoji: '🌊', mode: 'single', dmgMult: 1.9,  rangeMult: 1.25, unlockLv: 7 },
    ],
    electric: [
        { id: 'tackle',       name: 'Placaje',      emoji: '💥', mode: 'single', dmgMult: 1.0,  unlockLv: 1 },
        { id: 'thundershock', name: 'Impactrueno',  emoji: '⚡', mode: 'slow',   dmgMult: 1.1,  slowAmt: 0.30, slowDur: 1200, unlockLv: 2 },
        { id: 'discharge',    name: 'Descarga',     emoji: '⚡', mode: 'multi',  dmgMult: 0.85, multiCount: 3, unlockLv: 4 },
        { id: 'thunder',      name: 'Rayo',         emoji: '🌩️', mode: 'single', dmgMult: 2.0,  rangeMult: 1.2, unlockLv: 7 },
    ],
    psychic: [
        { id: 'tackle',    name: 'Placaje',     emoji: '💥', mode: 'single', dmgMult: 1.0,  unlockLv: 1 },
        { id: 'confusion', name: 'Confusión',   emoji: '🔮', mode: 'dot',    dmgMult: 0.9,  dotDmg: 2, dotDur: 2500, unlockLv: 2 },
        { id: 'psybeam',   name: 'Psicorrayo',  emoji: '💜', mode: 'pierce', dmgMult: 1.0,  pierceCount: 3, unlockLv: 4 },
        { id: 'psy_blast', name: 'Psíquico',    emoji: '🧠', mode: 'aoe',    dmgMult: 1.3,  aoeRadius: 55, unlockLv: 7 },
    ],
    poison: [
        { id: 'tackle',       name: 'Placaje',      emoji: '💥', mode: 'single', dmgMult: 1.0,  unlockLv: 1 },
        { id: 'poison_sting', name: 'Picotazo V.',  emoji: '🟣', mode: 'dot',    dmgMult: 0.9,  dotDmg: 2, dotDur: 3000, unlockLv: 2 },
        { id: 'sludge',       name: 'Lodo',         emoji: '☣️', mode: 'multi',  dmgMult: 0.85, multiCount: 2, dotDmg: 1.5, dotDur: 2000, unlockLv: 4 },
        { id: 'gunk_shot',    name: 'Bola Basura',  emoji: '💥', mode: 'aoe',    dmgMult: 1.2,  aoeRadius: 55, unlockLv: 7 },
    ],
    rock: [
        { id: 'tackle',     name: 'Placaje',     emoji: '💥', mode: 'single', dmgMult: 1.0,  unlockLv: 1 },
        { id: 'rock_throw', name: 'Lanzarroca',  emoji: '🪨', mode: 'single', dmgMult: 1.3,  unlockLv: 2 },
        { id: 'rock_slide', name: 'Avalancha',   emoji: '💥', mode: 'multi',  dmgMult: 1.0,  multiCount: 3, unlockLv: 4 },
        { id: 'stone_edge', name: 'Pedrada',     emoji: '⚔️', mode: 'pierce', dmgMult: 1.5,  pierceCount: 3, unlockLv: 7 },
    ],
    ground: [
        { id: 'tackle',       name: 'Placaje',      emoji: '💥', mode: 'single', dmgMult: 1.0,  unlockLv: 1 },
        { id: 'mud_slap',     name: 'Golpe Barro',  emoji: '🌫️', mode: 'slow',   dmgMult: 1.0,  slowAmt: 0.35, slowDur: 1400, unlockLv: 2 },
        { id: 'magnitude',    name: 'Magnitud',     emoji: '🌍', mode: 'aoe',    dmgMult: 0.9,  aoeRadius: 50, unlockLv: 4 },
        { id: 'earthquake',   name: 'Terremoto',    emoji: '🌋', mode: 'aoe',    dmgMult: 1.6,  aoeRadius: 80, unlockLv: 7 },
    ],
    fighting: [
        { id: 'tackle',     name: 'Placaje',      emoji: '💥', mode: 'single', dmgMult: 1.0,  unlockLv: 1 },
        { id: 'karate_chop',name: 'Golpe Kárate', emoji: '🥊', mode: 'single', dmgMult: 1.4,  unlockLv: 2 },
        { id: 'rolling_kick',name: 'Pat. Ronda',  emoji: '🦵', mode: 'multi',  dmgMult: 1.1,  multiCount: 2, unlockLv: 4 },
        { id: 'close_combat',name: 'Combate',     emoji: '💢', mode: 'single', dmgMult: 2.4,  unlockLv: 7 },
    ],
    ghost: [
        { id: 'tackle',     name: 'Placaje',      emoji: '💥', mode: 'single', dmgMult: 1.0,  unlockLv: 1 },
        { id: 'lick',       name: 'Lametazo',     emoji: '👻', mode: 'dot',    dmgMult: 0.9,  dotDmg: 2.5, dotDur: 2200, unlockLv: 2 },
        { id: 'shadow_ball',name: 'Bola Sombra',  emoji: '🌑', mode: 'pierce', dmgMult: 1.2,  pierceCount: 3, unlockLv: 4 },
        { id: 'nightmare',  name: 'Pesadilla',    emoji: '🌙', mode: 'aoe',    dmgMult: 1.1,  aoeRadius: 60, dotDmg: 3, dotDur: 3000, unlockLv: 7 },
    ],
    bug: [
        { id: 'tackle',      name: 'Placaje',      emoji: '💥', mode: 'single', dmgMult: 1.0,  unlockLv: 1 },
        { id: 'string_shot',  name: 'Disparo Hilo', emoji: '🕸️', mode: 'slow',   dmgMult: 0.7,  slowAmt: 0.5, slowDur: 2000, unlockLv: 2 },
        { id: 'bug_bite',     name: 'Picadura',     emoji: '🐛', mode: 'single', dmgMult: 1.5,  unlockLv: 4 },
        { id: 'signal_beam',  name: 'Onda Señal',   emoji: '✨', mode: 'multi',  dmgMult: 1.1,  multiCount: 3, unlockLv: 7 },
    ],
    normal: [
        { id: 'tackle',     name: 'Placaje',    emoji: '💥', mode: 'single', dmgMult: 1.0,  unlockLv: 1 },
        { id: 'headbutt',   name: 'Cabezazo',   emoji: '💢', mode: 'single', dmgMult: 1.35, unlockLv: 2 },
        { id: 'swift',      name: 'Rapidez',    emoji: '⭐', mode: 'multi',  dmgMult: 0.85, multiCount: 3, unlockLv: 4 },
        { id: 'hyper_beam', name: 'Hiperrayo',  emoji: '💫', mode: 'single', dmgMult: 2.2,  rangeMult: 1.2, unlockLv: 7 },
    ],
};

/**
 * Returns all 4 attacks for a given Pokémon type.
 * Falls back to 'normal' if the type is unknown.
 */
export function getAttacksForType(pokemonType) {
    return TYPE_ATTACKS[pokemonType] ?? TYPE_ATTACKS.normal;
}

/**
 * Returns only the attacks a tower can currently use at a given level.
 */
export function getUnlockedAttacks(pokemonType, level) {
    return getAttacksForType(pokemonType).filter(a => a.unlockLv <= (level ?? 1));
}

/** Mode display labels (human readable) */
export const MODE_LABELS = {
    single: 'Directo',
    slow:   'Ralentizar',
    dot:    'Veneno/Quema',
    multi:  'Multi-objetivo',
    pierce: 'Perforar',
    aoe:    'Área',
};
