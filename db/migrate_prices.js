'use strict';

/**
 * Миграция: цены /3, скидка 20%, промо "-50% от ServerPlace" для 70 провайдеров.
 * Запуск: node db/migrate_prices.js
 */

const fs = require('fs');
const path = require('path');

const DEMO_DIR = path.join(__dirname, '..', 'demo_data');

function loadJson(name) {
    return JSON.parse(fs.readFileSync(path.join(DEMO_DIR, name), 'utf-8'));
}
function saveJson(name, data) {
    fs.writeFileSync(path.join(DEMO_DIR, name), JSON.stringify(data, null, 2), 'utf-8');
}

// ─── 1. Offers: promo_price /3, market_price = promo/0.8 ───
console.log('[migrate] Обработка цен в offers.json...');
const offers = loadJson('offers.json');
for (const o of offers) {
    const newPromo = Math.round((o.promo_price_month / 3) * 100) / 100;
    const newMarket = Math.round((newPromo / 0.8) * 100) / 100;
    o.promo_price_month = newPromo;
    o.market_price_month = newMarket;
}
saveJson('offers.json', offers);
console.log(`[migrate] Офферы: ${offers.length} — цены обновлены (÷3, скидка 20%)`);

// ─── 2. Providers: промо "-50% от ServerPlace" для первых 70 ───
console.log('[migrate] Обработка промо в providers.json...');
const providers = loadJson('providers.json');
for (let i = 0; i < providers.length; i++) {
    if (i < 70) {
        providers[i].promo = {
            label: '-50% от ServerPlace',
            discount_percent: 50,
            until: '2026-12-31'
        };
    } else {
        providers[i].promo = {
            label: '',
            discount_percent: 0,
            until: ''
        };
    }
}
saveJson('providers.json', providers);
console.log(`[migrate] Провайдеры: 70 с промо "-50% от ServerPlace", 70 без промо`);

console.log('[migrate] Готово! Запустите npm run seed.');
