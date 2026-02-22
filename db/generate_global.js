'use strict';

const fs = require('fs');
const path = require('path');

const DEMO_DIR = path.join(__dirname, '..', 'demo_data');

function loadJson(name) {
    return JSON.parse(fs.readFileSync(path.join(DEMO_DIR, name), 'utf-8'));
}

function saveJson(name, data) {
    fs.writeFileSync(path.join(DEMO_DIR, name), JSON.stringify(data, null, 2), 'utf-8');
}

// ─── Исходные наборы для стран и городов ───
const GLOBAL_REGIONS = [
    { id: 'ny', name: 'Нью-Йорк', country: 'США', city: 'Нью-Йорк' },
    { id: 'miami', name: 'Майами', country: 'США', city: 'Майами' },
    { id: 'la', name: 'Лос-Анджелес', country: 'США', city: 'Лос-Анджелес' },
    { id: 'chicago', name: 'Чикаго', country: 'США', city: 'Чикаго' },
    { id: 'dal', name: 'Даллас', country: 'США', city: 'Даллас' },
    { id: 'tor', name: 'Торонто', country: 'Канада', city: 'Торонто' },
    { id: 'mtl', name: 'Монреаль', country: 'Канада', city: 'Монреаль' },
    { id: 'lon', name: 'Лондон', country: 'Великобритания', city: 'Лондон' },
    { id: 'par', name: 'Париж', country: 'Франция', city: 'Париж' },
    { id: 'fra_city', name: 'Франкфурт-на-Майне', country: 'Германия', city: 'Франкфурт' },
    { id: 'ber', name: 'Берлин', country: 'Германия', city: 'Берлин' },
    { id: 'mad', name: 'Мадрид', country: 'Испания', city: 'Мадрид' },
    { id: 'mil', name: 'Милан', country: 'Италия', city: 'Милан' },
    { id: 'sto', name: 'Стокгольм', country: 'Швеция', city: 'Стокгольм' },
    { id: 'waw', name: 'Варшава', country: 'Польша', city: 'Варшава' },
    { id: 'ams_city', name: 'Амстердам', country: 'Нидерланды', city: 'Амстердам' },
    { id: 'hel_city', name: 'Хельсинки', country: 'Финляндия', city: 'Хельсинки' },
    { id: 'tok', name: 'Токио', country: 'Япония', city: 'Токио' },
    { id: 'osa', name: 'Осака', country: 'Япония', city: 'Осака' },
    { id: 'sin', name: 'Сингапур', country: 'Сингапур', city: 'Сингапур' },
    { id: 'hkg', name: 'Гонконг', country: 'Китай', city: 'Гонконг' },
    { id: 'syd', name: 'Сидней', country: 'Австралия', city: 'Сидней' },
    { id: 'mel', name: 'Мельбурн', country: 'Австралия', city: 'Мельбурн' },
    { id: 'bom', name: 'Мумбаи', country: 'Индия', city: 'Мумбаи' },
    { id: 'gru', name: 'Сан-Паулу', country: 'Бразилия', city: 'Сан-Паулу' },
    { id: 'dxb', name: 'Дубай', country: 'ОАЭ', city: 'Дубай' },
    { id: 'jnb', name: 'Йоханнесбург', country: 'ЮАР', city: 'Йоханнесбург' },
    { id: 'ala_city', name: 'Алматы', country: 'Казахстан', city: 'Алма-Ата' },
    { id: 'ast', name: 'Астана', country: 'Казахстан', city: 'Астана' },
    { id: 'tbs', name: 'Тбилиси', country: 'Грузия', city: 'Тбилиси' },
    { id: 'evn', name: 'Ереван', country: 'Армения', city: 'Ереван' }
];

// ─── Генераторы случайных значений ───
const BRAND_PREFIXES = ['Cloud', 'Mega', 'Fast', 'Net', 'Host', 'Server', 'Euro', 'Asia', 'Global', 'VPS', 'VDS', 'Byte', 'Giga', 'Ultra', 'Super', 'Hyper'];
const BRAND_SUFFIXES = ['Host', 'Node', 'VDS', 'Cloud', 'Space', 'Core', 'Net', 'Web', 'Server', 'Systems', 'Tech'];

function randomEl(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomNum(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max) {
    const val = Math.random() * (max - min) + min;
    return parseFloat(val.toFixed(2));
}

function generateName() {
    let name = randomEl(BRAND_PREFIXES) + randomEl(BRAND_SUFFIXES);
    if (Math.random() > 0.7) {
        name += ' ' + randomEl(['US', 'EU', 'Global', 'Pro', 'Lite', 'Plus']);
    }
    return name;
}

// ─── Базовые конфигурации офферов (Start, Mini, Basic, Pro, Business, Enterprise) ───
const OFFER_TEMPLATES = [
    { name: 'Start', vcpu: 1, ram: 1, disk: 20, bw: 100, traf: 1, basePrice: 150 },
    { name: 'Mini', vcpu: 1, ram: 2, disk: 40, bw: 200, traf: 2, basePrice: 250 },
    { name: 'Basic', vcpu: 2, ram: 4, disk: 60, bw: 300, traf: 3, basePrice: 500 },
    { name: 'Pro', vcpu: 4, ram: 8, disk: 120, bw: 1000, traf: 5, basePrice: 1000 },
    { name: 'Business', vcpu: 8, ram: 16, disk: 240, bw: 1000, traf: 8, basePrice: 2000 },
    { name: 'Enterprise', vcpu: 16, ram: 32, disk: 480, bw: 3000, traf: 12, basePrice: 4000 }
];

const CPU_OPTIONS = [
    { type: 'Shared', brand: 'Intel', line: 'Xeon', model: 'Xeon Silver 4314' },
    { type: 'Shared', brand: 'AMD', line: 'EPYC', model: 'EPYC 7543P' },
    { type: 'HighFreq', brand: 'Intel', line: 'Xeon', model: 'Xeon Gold 6338N' },
    { type: 'HighFreq', brand: 'AMD', line: 'EPYC', model: 'EPYC 9654' },
    { type: 'Dedicated', brand: 'AMD', line: 'EPYC', model: 'EPYC 7763' },
    { type: 'Dedicated', brand: 'Intel', line: 'Xeon', model: 'Xeon Platinum 8358' }
];

const PROVIDER_COUNT = 30; // Добавим 30 глобальных провайдеров

console.log('[global] Загрузка текущих данных...');
const regionsData = loadJson('regions.json');
const providersData = loadJson('providers.json');
const offersData = loadJson('offers.json');
const reviewsData = loadJson('reviews.json');

// 1. Добавим глобальные регионы, если их еще нет
const existingRegionIds = new Set(regionsData.map(r => r.id));
const addedRegionIds = [];
for (const r of GLOBAL_REGIONS) {
    if (!existingRegionIds.has(r.id)) {
        regionsData.push(r);
        addedRegionIds.push(r.id);
        existingRegionIds.add(r.id);
    }
}
console.log(`[global] Добавлено ${addedRegionIds.length} новых регионов (городов мира).`);

// 2. Генерация провайдеров
const startProvId = parseInt(providersData[providersData.length - 1].id.replace('p', ''), 10) + 1;
const startOfferId = parseInt(offersData[offersData.length - 1].id.replace('o', ''), 10) + 1;
const startReviewId = parseInt(reviewsData[reviewsData.length - 1].id.replace('r', ''), 10) + 1;

let currProvId = startProvId;
let currOfferId = startOfferId;
let currReviewId = startReviewId;

let newOffersCount = 0;
let newReviewsCount = 0;

for (let i = 0; i < PROVIDER_COUNT; i++) {
    const pIdStr = 'p' + String(currProvId).padStart(3, '0');
    currProvId++;

    let name;
    let attempts = 0;
    while (true) {
        name = generateName();
        const slug = name.toLowerCase().replace(/\\s+/g, '-');
        const exists = providersData.find(p => p.slug === slug);
        if (!exists) break;
        attempts++;
        if (attempts > 50) {
            name += ' ' + Math.floor(Math.random() * 1000);
            break;
        }
    }
    const isPromo = Math.random() > 0.5;

    // Выбираем 2-5 случайных регионов из новых добавленных
    const pRegions = [];
    const numRegions = randomNum(2, 5);
    for (let k = 0; k < numRegions; k++) {
        pRegions.push(randomEl(GLOBAL_REGIONS).id);
    }

    const providerObj = {
        "id": pIdStr,
        "name": name,
        "slug": name.toLowerCase().replace(/\\s+/g, '-'),
        "url": `https://${name.toLowerCase().replace(/\\s+/g, '')}.com`,
        "logo_hint": {
            "type": "initials",
            "text": name.substring(0, 2).toUpperCase(),
            "seed": Math.floor(Math.random() * 20)
        },
        "rating": randomFloat(4.0, 4.9),
        "rating_count": randomNum(10, 500),
        "has_free_trial": Math.random() > 0.7,
        "trial_days": 3,
        "regions": [...new Set(pRegions)],
        "cpu_brands": ["Intel", "AMD"],
        "support": {
            "email": `support@${name.toLowerCase().replace(/\\s+/g, '')}.com`,
            "phone": "+1 800 " + randomNum(100, 999) + " " + randomNum(1000, 9999)
        },
        "promo": isPromo ? {
            "label": "-50% от ServerPlace",
            "discount_percent": 50,
            "end_date": "2026-12-31"
        } : null,
        "about_short": "Глобальный облачный провайдер с дата-центрами уровня Tier III. Надежное оборудование и отличная связность.",
        "aliases": []
    };

    providersData.push(providerObj);

    // Генерация офферов для провайдера
    const priceMultiplier = randomFloat(0.8, 1.3);

    for (const tpl of OFFER_TEMPLATES) {
        const oIdStr = 'o' + String(currOfferId).padStart(5, '0');
        currOfferId++;

        const cpuOpt = randomEl(CPU_OPTIONS);
        const diskType = Math.random() > 0.5 ? 'nvme' : 'ssd';

        let marketPrice = tpl.basePrice * priceMultiplier;
        let promoPrice = isPromo ? (marketPrice * 0.8) : marketPrice; // У нас в БД market=promo/0.8

        const offerObj = {
            "id": oIdStr,
            "provider_id": pIdStr,
            "name": `${tpl.name} ${tpl.vcpu}×vCPU / ${tpl.ram} ГБ`,
            "billing": "month",
            "currency": "RUB",
            "market_price_month": parseFloat(marketPrice.toFixed(2)),
            "promo_price_month": parseFloat(promoPrice.toFixed(2)),
            "promo_label": isPromo ? "Акция −20%" : "",
            "resources": {
                "vcpu": tpl.vcpu,
                "ram_gb": tpl.ram,
                "cpu": cpuOpt,
                "disks": [
                    { "role": "system", "type": diskType, "size_gb": tpl.disk }
                ],
                "network": {
                    "bandwidth_mbps": tpl.bw,
                    "traffic_limit_tb": tpl.traf
                },
                "ipv4_included": Math.random() > 0.2,
                "ipv6_included": true,
                "ddos_protection": Math.random() > 0.5,
                "sla_percent": randomEl([99.9, 99.95, 99.98]),
                "virtualization": randomEl(['KVM', 'VMware', 'OpenStack'])
            },
            "availability": {
                "regions": providerObj.regions,
                "pools": ["gl-1a", "gl-1b"]
            },
            "free_trial": {
                "available": providerObj.has_free_trial,
                "days": providerObj.has_free_trial ? 3 : 0,
                "conditions": ""
            },
            "links": {
                "order_url": providerObj.url,
                "docs_url": providerObj.url + '/docs'
            },
            "updated_at": "2026-02-22"
        };
        offersData.push(offerObj);
        newOffersCount++;
    }

    // Генерация отзывов
    const numReviews = randomNum(1, 3);
    for (let r = 0; r < numReviews; r++) {
        const rIdStr = 'r' + String(currReviewId).padStart(4, '0');
        currReviewId++;

        reviewsData.push({
            "id": rIdStr,
            "provider_id": pIdStr,
            "user_display_name": `User${randomNum(1000, 9999)}`,
            "user_role": randomEl(["Разработчик", "Сисадмин", "Владелец бизнеса", "Фрилансер"]),
            "rating": randomFloat(4.0, 5.0),
            "title": "Надёжный провайдер",
            "pros": ["Стабильность", "Глобальные локации"],
            "cons": [],
            "use_case": randomEl(["для VPN", "для сайта", "пет-проект", "база данных"]),
            "text": "Отличный зарубежный дата-центр, пинг устраивает, аптайм 100%.",
            "created_at": `2026-01-${String(randomNum(1, 28)).padStart(2, '0')}`,
            "verified": true,
            "likes": randomNum(0, 50)
        });
        newReviewsCount++;
    }
}

console.log(`[global] Добавлено ${PROVIDER_COUNT} новых провайдеров.`);
console.log(`[global] Добавлено ${newOffersCount} новых офферов.`);
console.log(`[global] Добавлено ${newReviewsCount} новых отзывов.`);

saveJson('regions.json', regionsData);
saveJson('providers.json', providersData);
saveJson('offers.json', offersData);
saveJson('reviews.json', reviewsData);

console.log('[global] Готово! Запустите npm run seed для обновления SQLite.');
