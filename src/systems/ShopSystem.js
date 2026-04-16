// ─── ShopSystem ────────────────────────────────────────────────────────────────
// Handles buy/sell transactions between the shop and the trainer.

import { getShopItemById } from '../data/shop_items.js';
import { MYSTERY_ITEM_POOL } from '../data/mystery_items.js';
import { getSpriteUrl } from '../data/pokemon.js';

export class ShopSystem {
    constructor(trainer) {
        this.trainer = trainer;
    }

    /**
     * Buy an item from the shop.
     * @param {string} itemId
     * @returns {{ ok: boolean, reason?: string }}
     */
    buy(itemId) {
        const shopItem = getShopItemById(itemId);
        if (!shopItem) return { ok: false, reason: 'notFound' };

        if (!this.trainer.spendCoins(shopItem.price)) {
            return { ok: false, reason: 'noMoney' };
        }

        switch (shopItem.category) {
            case 'pokeballs':
                this.trainer.addPokeball(1);
                break;
            case 'stones':
                this.trainer.addToInventory(shopItem.itemType, 1);
                break;
            case 'pokemon': {
                // Add to PC (or party if space)
                const slot = {
                    id: `shop_${shopItem.pokemonId}_${Date.now()}`,
                    pokemonId: shopItem.pokemonId,
                    name: shopItem.name,
                    pokemonType: shopItem.pokemonType,
                    starterKey: null,
                    placed: false,
                    level: shopItem.level ?? 5,
                    xp: 0,
                    currentAttackIdx: 0,
                };
                this.trainer.pcBox.push(slot);
                if (this.trainer.party.length < 6) {
                    this.trainer.party.push({ ...slot, id: slot.id + '_p' });
                }
                this.trainer.registerPokedex(shopItem.pokemonId, shopItem.name);
                break;
            }
        }

        return { ok: true, item: shopItem };
    }

    /**
     * Sell an inventory item.
     * @param {string} itemType
     * @param {number} quantity
     * @returns {{ ok: boolean, coinsGained?: number, reason?: string }}
     */
    sell(itemType, quantity = 1) {
        // Find sell value from mystery pool or shop catalog
        const sellValue = this._getSellValue(itemType);
        if (sellValue === null) return { ok: false, reason: 'notSellable' };

        if (!this.trainer.removeFromInventory(itemType, quantity)) {
            return { ok: false, reason: 'noItem' };
        }

        const total = sellValue * quantity;
        this.trainer.addCoins(total);
        return { ok: true, coinsGained: total };
    }

    _getSellValue(itemType) {
        // Check mystery pool
        for (const tier of Object.values(MYSTERY_ITEM_POOL)) {
            const entry = tier.find(i => i.itemType === itemType);
            if (entry) return entry.sellValue;
        }
        // Check shop stones at 50% of buy price
        const allStones = [
            { itemType: 'Thunder Stone', price: 400 },
            { itemType: 'Water Stone',   price: 400 },
            { itemType: 'Fire Stone',    price: 400 },
            { itemType: 'Leaf Stone',    price: 400 },
            { itemType: 'Moon Stone',    price: 500 },
            { itemType: 'Link Cable',    price: 600 },
        ];
        const stone = allStones.find(s => s.itemType === itemType);
        if (stone) return Math.floor(stone.price * 0.5);
        return null;
    }
}
