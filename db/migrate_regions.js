'use strict';

const fs = require('fs');
const path = require('path');
const DEMO = path.join(__dirname, '..', 'demo_data');

function loadJson(name) { return JSON.parse(fs.readFileSync(path.join(DEMO, name), 'utf-8')); }
function saveJson(name, data) { fs.writeFileSync(path.join(DEMO, name), JSON.stringify(data, null, 2), 'utf-8'); }

function hash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h = h & h; }
    return Math.abs(h);
}

const newRegions = ['ams', 'fra', 'hel', 'ala', 'ist'];

// ─── Offers: ~30% get an extra foreign region ───
const offers = loadJson('offers.json');
for (const o of offers) {
    const h = hash(o.id);
    const avail = o.availability || {};
    const regions = avail.regions || [];
    if (h % 3 === 0) {
        const extra = newRegions[h % newRegions.length];
        if (!regions.includes(extra)) regions.push(extra);
        avail.regions = regions;
        o.availability = avail;
    }
}
saveJson('offers.json', offers);
const foreignOffers = offers.filter(o => (o.availability && o.availability.regions || []).some(r => newRegions.includes(r))).length;
console.log('[regions] Офферы с зарубежными регионами:', foreignOffers);

// ─── Providers: ~40% get foreign regions ───
const providers = loadJson('providers.json');
for (const p of providers) {
    const h = hash(p.id);
    const regions = p.regions || [];
    if (h % 5 < 2) {
        const extra = newRegions[h % newRegions.length];
        if (!regions.includes(extra)) regions.push(extra);
        p.regions = regions;
    }
}
saveJson('providers.json', providers);
const foreignProviders = providers.filter(p => (p.regions || []).some(r => newRegions.includes(r))).length;
console.log('[regions] Провайдеры с зарубежными регионами:', foreignProviders);
console.log('[regions] Готово!');
