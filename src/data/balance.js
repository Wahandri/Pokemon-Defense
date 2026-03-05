// ─── Balance Configuration ─────────────────────────────────────────────────────
// SINGLE SOURCE OF TRUTH. Edit only this file to tune gameplay.
//
// HP(wave)     = round(HP_base × HP_SCALE^(wave-1))
// reward(wave) = max(reward_base, round(HP_wave × REWARD_FACTOR))
// ────────────────────────────────────────────────────────────────────────────────

export const HP_SCALE = 1.18;
export const REWARD_FACTOR = 0.28;
export const REWARD_MIN = 2;

export const WAVE_BONUS_BASE = 15;
export const WAVE_BONUS_PER_WAVE = 6;

export const START_MONEY = 200;
export const START_LIVES = 20;

// ── Enemy definitions (5 tiers of Pokémon) ───────────────────────────────────
// radius is bigger (sprite-size) so collision with Pokémon PNG feels natural
export const ENEMY_CONFIG = {
    red: {
        label: 'Tier 1 ★', HP_base: 10, reward_base: 3, speed: 92, damage: 1,
        color: '#e84040', accent: '#ff7070', radius: 18,
    },
    blue: {
        label: 'Tier 2 ★★', HP_base: 28, reward_base: 7, speed: 65, damage: 1,
        color: '#3a8fff', accent: '#80c0ff', radius: 20,
    },
    green: {
        label: 'Tier 3 ★★★', HP_base: 60, reward_base: 14, speed: 112, damage: 2,
        color: '#2dbd55', accent: '#70e890', radius: 20,
    },
    t4: {
        label: 'Tier 4 ★★★★', HP_base: 200, reward_base: 50, speed: 55, damage: 3,
        color: '#c792ea', accent: '#e8c8ff', radius: 22,
    },
    boss: {
        label: 'LEGENDARIO ★★★★★', HP_base: 1500, reward_base: 400, speed: 45, damage: 5,
        color: '#f47c3c', accent: '#ffb080', radius: 28,
    },
};

// ── Tower / Trainer definitions (Team Rocket) ─────────────────────────────────
export const TOWER_CONFIG = {

    // ─── Grunt ♀ – lanza pokéball rápida ─────────────────────────────────────
    dart: {
        label: 'Grunt ♀', emoji: '🚀', cost: 100,
        color: '#cc0000', glowColor: '#ff3333', bgColor: '#1a0000',
        range: 130, fireRate: 1.2, damage: 10, projSpeed: 380,
        upgrades: [
            [
                { key: 'A', label: 'Pokéball Afilada', cost: 80, mods: { damage: { mul: 1.6 } } },
                { key: 'B', label: 'Lanzamiento Largo', cost: 70, mods: { range: { mul: 1.35 } } },
            ],
            [
                { key: 'A', label: 'Pokéball Élite', cost: 130, mods: { damage: { mul: 1.8 }, fireRate: { mul: 1.2 } } },
                { key: 'B', label: 'Ráfaga de Rockets', cost: 115, mods: { range: { mul: 1.5 }, fireRate: { mul: 1.3 } } },
            ],
        ],
    },

    // ─── Grunt ♂ – pokéball pesada, daño de área ──────────────────────────────
    cannon: {
        label: 'Grunt ♂', emoji: '💣', cost: 175,
        color: '#e3b341', glowColor: '#e3b341', bgColor: '#2a1f00',
        range: 120, fireRate: 0.35, damage: 55, projSpeed: 200,
        areaRadius: 60,
        upgrades: [
            [
                { key: 'A', label: 'Megaball Pesada', cost: 120, mods: { damage: { mul: 1.7 } } },
                { key: 'B', label: 'Cañón TR Largo', cost: 110, mods: { range: { mul: 1.3 }, areaRadius: { mul: 1.3 } } },
            ],
            [
                { key: 'A', label: 'Bomba Cluster TR', cost: 200, mods: { damage: { mul: 2.0 }, areaRadius: { mul: 1.4 } } },
                { key: 'B', label: 'Obús del Equipo R', cost: 185, mods: { range: { mul: 1.4 }, fireRate: { mul: 1.5 } } },
            ],
        ],
    },

    // ─── Jessie – frisa pokémon con pokéball de hielo ─────────────────────────
    ice: {
        label: 'Jessie', emoji: '💜', cost: 120,
        color: '#a5d8ff', glowColor: '#a5d8ff', bgColor: '#1a1040',
        range: 110, fireRate: 0.65, damage: 5, projSpeed: 280,
        slowAmount: 0.38, slowDuration: 2200,
        upgrades: [
            [
                { key: 'A', label: 'Bola Ártica Jessie', cost: 85, mods: { slowAmount: { add: -0.12, min: 0.12 } } },
                { key: 'B', label: 'Largo Alcance Rosa', cost: 90, mods: { range: { mul: 1.4 } } },
            ],
            [
                { key: 'A', label: 'Tormenta de Jessie', cost: 145, mods: { slowAmount: { add: -0.10, min: 0.05 }, slowDuration: { mul: 1.6 } } },
                { key: 'B', label: 'Estilo Blizzard', cost: 155, mods: { range: { mul: 1.6 }, fireRate: { mul: 1.4 } } },
            ],
        ],
    },

    // ─── James – disparo élite de largo alcance ────────────────────────────────
    sniper: {
        label: 'James', emoji: '🌹', cost: 250,
        color: '#6ab0ff', glowColor: '#6ab0ff', bgColor: '#001030',
        range: 320, fireRate: 0.45, damage: 80, projSpeed: 700,
        upgrades: [
            [
                { key: 'A', label: 'Pokéball Perforadora', cost: 175, mods: { damage: { mul: 1.7 } } },
                { key: 'B', label: 'Mira de James', cost: 160, mods: { range: { mul: 1.4 }, fireRate: { mul: 1.2 } } },
            ],
            [
                { key: 'A', label: 'Ultraball Dorada', cost: 280, mods: { damage: { mul: 2.2 } } },
                { key: 'B', label: 'Fusil del Equipo R', cost: 260, mods: { range: { mul: 1.5 }, fireRate: { mul: 1.5 }, projSpeed: { mul: 1.5 } } },
            ],
        ],
    },

    // ─── Meowth – arañazos rápidos, penetran enemigos ─────────────────────────
    laser: {
        label: 'Meowth', emoji: '🪙', cost: 300,
        color: '#f0c050', glowColor: '#ffd700', bgColor: '#1a1500',
        range: 180, fireRate: 4.0, damage: 8, projSpeed: 900,
        pierceCount: 3,
        upgrades: [
            [
                { key: 'A', label: 'Uñas Pay Day', cost: 200, mods: { damage: { mul: 1.6 }, pierceCount: { add: 2 } } },
                { key: 'B', label: 'Sprint de Meowth', cost: 190, mods: { range: { mul: 1.35 }, fireRate: { mul: 1.3 } } },
            ],
            [
                { key: 'A', label: 'Pay Day Devastador', cost: 320, mods: { damage: { mul: 2.0 }, pierceCount: { add: 3 } } },
                { key: 'B', label: 'Velocidad Crítica', cost: 300, mods: { range: { mul: 1.5 }, fireRate: { mul: 1.5 } } },
            ],
        ],
    },

    // ─── Giovanni – artillería suprema del Team Rocket ────────────────────────
    mortar: {
        label: 'Giovanni', emoji: '😼', cost: 400,
        color: '#444', glowColor: '#888', bgColor: '#0a0a0a',
        range: 350, fireRate: 0.22, damage: 140, projSpeed: 160,
        areaRadius: 90,
        upgrades: [
            [
                { key: 'A', label: 'Bomba de Giovanni', cost: 280, mods: { damage: { mul: 1.8 }, areaRadius: { mul: 1.3 } } },
                { key: 'B', label: 'Red del Jefe TR', cost: 250, mods: { range: { mul: 1.4 }, fireRate: { mul: 1.4 } } },
            ],
            [
                { key: 'A', label: 'Megabomba del Jefe', cost: 450, mods: { damage: { mul: 2.5 }, areaRadius: { mul: 1.5 } } },
                { key: 'B', label: 'Batería Suprema TR', cost: 400, mods: { fireRate: { mul: 2.0 }, range: { mul: 1.3 } } },
            ],
        ],
    },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export function calcHP(type, wave) {
    const def = ENEMY_CONFIG[type];
    if (!def) throw new Error(`Unknown enemy type: ${type}`);
    return Math.max(1, Math.round(def.HP_base * Math.pow(HP_SCALE, wave - 1)));
}

export function calcReward(type, wave) {
    const def = ENEMY_CONFIG[type];
    const hp = calcHP(type, wave);
    return Math.max(def.reward_base, Math.round(hp * REWARD_FACTOR));
}

export function applyMod(value, mod) {
    let v = value;
    if (mod.mul !== undefined) v *= mod.mul;
    if (mod.add !== undefined) v += mod.add;
    if (mod.min !== undefined) v = Math.max(mod.min, v);
    if (mod.max !== undefined) v = Math.min(mod.max, v);
    return v;
}

export function calcWaveBonus(wave) {
    return WAVE_BONUS_BASE + wave * WAVE_BONUS_PER_WAVE;
}
