// ─── ShopModal ─────────────────────────────────────────────────────────────────
// DOM-based shop modal. Call open(trainer, shopSystem, onUpdate) to show.

import { SHOP_CATALOG } from '../data/shop_items.js';
import { getSpriteUrl } from '../data/pokemon.js';

export class ShopModal {
    constructor() {
        this._el = null;
        this._activeTab = 'buy';
        this._buySubTab = 'pokeballs';
        this._onUpdate = null;
        this._trainer = null;
        this._shop = null;
        this._build();
    }

    _build() {
        const el = document.createElement('div');
        el.id = 'shop-modal';
        el.className = 'modal-overlay hidden';
        el.innerHTML = `
          <div class="modal-panel shop-panel">
            <div class="modal-header">
              <span class="modal-title">🛒 TIENDA</span>
              <button class="modal-close" id="shop-close">✕</button>
            </div>
            <div class="shop-coins-bar" id="shop-coins-bar">💰 0</div>
            <div class="modal-tabs" id="shop-tabs">
              <button class="modal-tab active" data-tab="buy">Comprar</button>
              <button class="modal-tab" data-tab="sell">Vender</button>
            </div>
            <div class="shop-sub-tabs" id="shop-sub-tabs">
              <button class="shop-sub-tab active" data-sub="pokeballs">Pokébolas</button>
              <button class="shop-sub-tab" data-sub="stones">Evolución</button>
              <button class="shop-sub-tab" data-sub="pokemon">Pokémon</button>
            </div>
            <div class="shop-body" id="shop-body"></div>
          </div>
        `;
        document.body.appendChild(el);
        this._el = el;

        el.querySelector('#shop-close').addEventListener('click', () => this.close());
        el.addEventListener('click', (e) => { if (e.target === el) this.close(); });

        el.querySelector('#shop-tabs').addEventListener('click', (e) => {
            const tab = e.target.dataset.tab;
            if (!tab) return;
            this._activeTab = tab;
            el.querySelectorAll('.modal-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
            el.querySelector('#shop-sub-tabs').style.display = tab === 'buy' ? 'flex' : 'none';
            this._render();
        });

        el.querySelector('#shop-sub-tabs').addEventListener('click', (e) => {
            const sub = e.target.dataset.sub;
            if (!sub) return;
            this._buySubTab = sub;
            el.querySelectorAll('.shop-sub-tab').forEach(b => b.classList.toggle('active', b.dataset.sub === sub));
            this._render();
        });
    }

    open(trainer, shopSystem, onUpdate) {
        this._trainer = trainer;
        this._shop = shopSystem;
        this._onUpdate = onUpdate;
        this._el.classList.remove('hidden');
        this._render();
    }

    close() {
        this._el.classList.add('hidden');
    }

    _render() {
        const body = this._el.querySelector('#shop-body');
        const coinsBar = this._el.querySelector('#shop-coins-bar');
        coinsBar.textContent = `💰 ${this._trainer.coins}`;

        if (this._activeTab === 'buy') {
            this._renderBuy(body);
        } else {
            this._renderSell(body);
        }
    }

    _renderBuy(body) {
        const items = SHOP_CATALOG[this._buySubTab] ?? [];
        body.innerHTML = '';

        for (const item of items) {
            const canAfford = this._trainer.coins >= item.price;
            const card = document.createElement('div');
            card.className = `shop-card${canAfford ? '' : ' shop-card-unaffordable'}`;

            let preview = '';
            if (item.category === 'pokemon') {
                preview = `<img src="${getSpriteUrl(item.pokemonId)}" width="40" height="40" style="image-rendering:pixelated" alt="${item.name}">`;
            } else {
                preview = `<span style="font-size:28px;line-height:1">${item.emoji}</span>`;
            }

            card.innerHTML = `
              <div class="shop-card-preview">${preview}</div>
              <div class="shop-card-info">
                <div class="shop-card-name">${item.emoji} ${item.name}</div>
                <div class="shop-card-desc">${item.description}</div>
              </div>
              <div class="shop-card-right">
                <div class="shop-card-price${canAfford ? '' : ' shop-price-unaffordable'}">💰 ${item.price}</div>
                <button class="shop-buy-btn${canAfford ? '' : ' disabled'}" data-id="${item.id}" ${canAfford ? '' : 'disabled'}>Comprar</button>
              </div>
            `;
            body.appendChild(card);
        }

        body.addEventListener('click', (e) => {
            const btn = e.target.closest('.shop-buy-btn');
            if (!btn || btn.disabled) return;
            const result = this._shop.buy(btn.dataset.id);
            if (result.ok) {
                const msg = document.getElementById('msg');
                if (msg) {
                    msg.textContent = `✅ ¡${result.item.name} comprado!`;
                    msg.classList.add('show');
                    clearTimeout(this._msgTimer);
                    this._msgTimer = setTimeout(() => msg.classList.remove('show'), 2000);
                }
                this._onUpdate?.();
                this._render();
            } else {
                const coinsBar = this._el.querySelector('#shop-coins-bar');
                coinsBar.style.color = '#f85149';
                setTimeout(() => coinsBar.style.color = '', 600);
            }
        }, { once: true });
    }

    _renderSell(body) {
        const inventory = this._trainer.getInventory();
        body.innerHTML = '';

        if (inventory.length === 0) {
            body.innerHTML = '<div class="shop-empty">No tienes objetos para vender.</div>';
            return;
        }

        for (const invItem of inventory) {
            const sellValue = this._shop._getSellValue(invItem.itemType);
            if (sellValue === null) continue;

            const card = document.createElement('div');
            card.className = 'shop-card';
            card.innerHTML = `
              <div class="shop-card-preview" style="font-size:24px">📦</div>
              <div class="shop-card-info">
                <div class="shop-card-name">${invItem.itemType}</div>
                <div class="shop-card-desc">Cantidad: ${invItem.quantity}</div>
              </div>
              <div class="shop-card-right">
                <div class="shop-card-price">💰 ${sellValue} c/u</div>
                <button class="shop-buy-btn" data-type="${invItem.itemType}">Vender 1</button>
              </div>
            `;
            body.appendChild(card);
        }

        if (body.children.length === 0) {
            body.innerHTML = '<div class="shop-empty">No tienes objetos vendibles.</div>';
            return;
        }

        body.addEventListener('click', (e) => {
            const btn = e.target.closest('.shop-buy-btn');
            if (!btn) return;
            const result = this._shop.sell(btn.dataset.type, 1);
            if (result.ok) {
                const msg = document.getElementById('msg');
                if (msg) {
                    msg.textContent = `💰 +${result.coinsGained} vendido`;
                    msg.classList.add('show');
                    clearTimeout(this._msgTimer);
                    this._msgTimer = setTimeout(() => msg.classList.remove('show'), 2000);
                }
                this._onUpdate?.();
                this._render();
            }
        }, { once: true });
    }
}
