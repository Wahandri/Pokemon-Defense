// ─── Mystery Gift Item Pool ────────────────────────────────────────────────────
// Items dropped as mystery gifts during gameplay.
// tier: 'cheap' (70%), 'moderate' (25%), 'rare' (5%)
// effect: 'pokeball' | 'inventory' | 'doubleXP' | 'ppMax' | 'sellable' | 'cosmetic'

export const MYSTERY_ITEM_POOL = {
    cheap: [
        { itemType: 'Pokébola',   emoji: '🔴', sellValue: 25,  effect: 'pokeball',  description: '+1 Pokébola', qty: 1 },
        { itemType: 'Poción',     emoji: '💊', sellValue: 15,  effect: 'cosmetic',  description: 'Recupera HP (futuro)' },
        { itemType: 'Antídoto',   emoji: '💚', sellValue: 15,  effect: 'cosmetic',  description: 'Cura veneno (futuro)' },
        { itemType: 'Éter',       emoji: '🔵', sellValue: 20,  effect: 'cosmetic',  description: 'Restaura PP (futuro)' },
        { itemType: 'Repelente',  emoji: '🌀', sellValue: 20,  effect: 'cosmetic',  description: 'Repele débiles (futuro)' },
        { itemType: 'Baya Oran',  emoji: '🍊', sellValue: 18,  effect: 'cosmetic',  description: 'Cura leve (futuro)' },
    ],
    moderate: [
        { itemType: 'Superbola',      emoji: '🔵', sellValue: 75,  effect: 'pokeball',  description: '+1 Superbola', qty: 1 },
        { itemType: 'Thunder Stone',  emoji: '⚡', sellValue: 200, effect: 'inventory', description: 'Piedra Trueno (evolución)' },
        { itemType: 'Water Stone',    emoji: '💧', sellValue: 200, effect: 'inventory', description: 'Piedra Agua (evolución)' },
        { itemType: 'Fire Stone',     emoji: '🔥', sellValue: 200, effect: 'inventory', description: 'Piedra Fuego (evolución)' },
        { itemType: 'Leaf Stone',     emoji: '🍃', sellValue: 200, effect: 'inventory', description: 'Piedra Hoja (evolución)' },
        { itemType: 'Escudo Humo',    emoji: '💨', sellValue: 50,  effect: 'cosmetic',  description: 'Ralentiza enemigos (futuro)' },
        { itemType: 'Baya Sitrus',    emoji: '🍋', sellValue: 35,  effect: 'cosmetic',  description: 'Cura moderada (futuro)' },
        { itemType: 'Incienso Extraño', emoji: '🕯️', sellValue: 80, effect: 'doubleXP', description: '¡Doble XP próxima oleada!' },
    ],
    rare: [
        { itemType: 'Moon Stone',   emoji: '🌙', sellValue: 250, effect: 'inventory', description: 'Piedra Luna (evolución)' },
        { itemType: 'Link Cable',   emoji: '📡', sellValue: 300, effect: 'inventory', description: 'Cable Link (evolución)' },
        { itemType: 'Ultrabola',    emoji: '⚫', sellValue: 150, effect: 'pokeball',  description: '+1 Ultrabola', qty: 1 },
        { itemType: 'Revivir Max',  emoji: '💛', sellValue: 200, effect: 'cosmetic',  description: 'Revive Pokémon (futuro)' },
        { itemType: 'PP Máx',       emoji: '✨', sellValue: 180, effect: 'ppMax',     description: '+5% cadencia a un Pokémon' },
        { itemType: 'Ficha Casino', emoji: '🎰', sellValue: 500, effect: 'sellable',  description: 'Vale 500 💰 al vender' },
        { itemType: 'Master Ball',  emoji: '🟣', sellValue: 800, effect: 'pokeball',  description: '+1 Master Ball (captura garantizada)', qty: 1 },
    ],
};

/**
 * Pick a random mystery item from the pool based on rarity weights.
 * @returns {{ itemType, emoji, sellValue, effect, description, qty? }}
 */
export function rollMysteryItem() {
    const roll = Math.random();
    let pool;
    if (roll < 0.70) pool = MYSTERY_ITEM_POOL.cheap;
    else if (roll < 0.95) pool = MYSTERY_ITEM_POOL.moderate;
    else pool = MYSTERY_ITEM_POOL.rare;
    return pool[Math.floor(Math.random() * pool.length)];
}
