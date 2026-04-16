// ─── Shop Items Catalog ────────────────────────────────────────────────────────

export const SHOP_CATALOG = {
    pokeballs: [
        { id: 'pokeball',   name: 'Pokébola',   emoji: '🔴', price: 50,   description: 'Captura Pokémon salvajes básicos.',      category: 'pokeballs' },
        { id: 'superball',  name: 'Superbola',  emoji: '🔵', price: 150,  description: 'Mayor tasa de captura.',                  category: 'pokeballs' },
        { id: 'ultraball',  name: 'Ultrabola',  emoji: '⚫', price: 300,  description: 'Alta tasa de captura.',                   category: 'pokeballs' },
    ],
    stones: [
        { id: 'thunder_stone', name: 'Thunder Stone', emoji: '⚡', price: 400, description: 'Pikachu→Raichu · Eevee→Jolteon',        category: 'stones', itemType: 'Thunder Stone' },
        { id: 'water_stone',   name: 'Water Stone',   emoji: '💧', price: 400, description: 'Shellder→Cloyster · Eevee→Vaporeon',    category: 'stones', itemType: 'Water Stone'   },
        { id: 'fire_stone',    name: 'Fire Stone',    emoji: '🔥', price: 400, description: 'Vulpix→Ninetales · Eevee→Flareon',      category: 'stones', itemType: 'Fire Stone'    },
        { id: 'leaf_stone',    name: 'Leaf Stone',    emoji: '🍃', price: 400, description: 'Weepinbell→Victreebel · Exeggcute→Exeggutor', category: 'stones', itemType: 'Leaf Stone' },
        { id: 'moon_stone',    name: 'Moon Stone',    emoji: '🌙', price: 500, description: 'Nidorina→Nidoqueen · Clefairy→Clefable', category: 'stones', itemType: 'Moon Stone'   },
        { id: 'link_cable',    name: 'Link Cable',    emoji: '📡', price: 600, description: 'Kadabra→Alakazam · Machoke→Machamp · Graveler→Golem · Haunter→Gengar', category: 'stones', itemType: 'Link Cable' },
    ],
    pokemon: [
        { id: 'shop_eevee',      name: 'Eevee',      emoji: '🦊', price: 800,  description: '3 evoluciones posibles con piedras',   category: 'pokemon', pokemonId: 133, pokemonType: 'normal',  level: 5 },
        { id: 'shop_jynx',       name: 'Jynx',       emoji: '❄️', price: 600,  description: 'Tipo Psíquico/Hielo, gran alcance',     category: 'pokemon', pokemonId: 124, pokemonType: 'psychic', level: 5 },
        { id: 'shop_electabuzz', name: 'Electabuzz', emoji: '⚡', price: 600,  description: 'Eléctrico veloz con alto daño',         category: 'pokemon', pokemonId: 125, pokemonType: 'electric',level: 5 },
        { id: 'shop_magmar',     name: 'Magmar',     emoji: '🔥', price: 600,  description: 'Fuego intenso, cadencia alta',          category: 'pokemon', pokemonId: 126, pokemonType: 'fire',    level: 5 },
        { id: 'shop_scyther',    name: 'Scyther',    emoji: '🦗', price: 700,  description: 'Bug veloz con ataque multi-objetivo',   category: 'pokemon', pokemonId: 123, pokemonType: 'bug',     level: 5 },
        { id: 'shop_pinsir',     name: 'Pinsir',     emoji: '🦀', price: 700,  description: 'Bug poderoso con aplastante ataque',    category: 'pokemon', pokemonId: 127, pokemonType: 'bug',     level: 5 },
        { id: 'shop_porygon',    name: 'Porygon',    emoji: '🤖', price: 1200, description: 'Tipo Normal digital, ataque láser',     category: 'pokemon', pokemonId: 137, pokemonType: 'normal',  level: 5 },
        { id: 'shop_ditto',      name: 'Ditto',      emoji: '💜', price: 900,  description: 'Copia el tipo del enemigo más cercano', category: 'pokemon', pokemonId: 132, pokemonType: 'normal',  level: 5 },
        { id: 'shop_lapras',     name: 'Lapras',     emoji: '🐋', price: 1000, description: 'Agua/Hielo con gran HP y rango',        category: 'pokemon', pokemonId: 131, pokemonType: 'water',   level: 5 },
        { id: 'shop_snorlax',    name: 'Snorlax',    emoji: '😴', price: 1100, description: 'Torre AoE muy duradera y potente',      category: 'pokemon', pokemonId: 143, pokemonType: 'normal',  level: 5 },
    ],
};

/** All items flattened for lookup by id */
export function getShopItemById(id) {
    for (const category of Object.values(SHOP_CATALOG)) {
        const found = category.find(i => i.id === id);
        if (found) return found;
    }
    return null;
}
