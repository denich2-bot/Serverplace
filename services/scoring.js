'use strict';

/**
 * Скоринг "лучшее совпадение" для офферов.
 * Формула (из ТЗ):
 *   price_score   (40%)
 *   rating_score  (20%)
 *   trial_score   (10%)
 *   region_match  (10%)
 *   network_score (10%)
 *   cpu_type_match(10%)
 */

function computeScore(offer, provider, params) {
    let score = 0;

    // price_score — чем дешевле, тем лучше (нормализация: 1 - price/maxPrice)
    const maxPrice = params._maxPrice || 50000;
    const priceNorm = 1 - Math.min(offer.promo_price_month / maxPrice, 1);
    score += priceNorm * 40;

    // rating_score — рейтинг провайдера / 5
    const ratingNorm = (provider.rating || 0) / 5;
    score += ratingNorm * 20;

    // trial_score — есть бесплатный тест
    if (offer.free_trial_available) {
        score += 10;
    }

    // region_match — совпадает ли регион с запрошенным
    if (params.region) {
        const offerRegions = safeParseArray(offer.regions);
        const requestedRegions = Array.isArray(params.region) ? params.region : [params.region];
        const has_match = requestedRegions.some(r => offerRegions.includes(r));
        if (has_match) score += 10;
    } else {
        score += 5; // нейтральный бонус если регион не указан
    }

    // network_score — нормализация по каналу
    const netNorm = Math.min(offer.bandwidth_mbps / 3000, 1);
    score += netNorm * 10;

    // cpu_type_match
    if (params.cpu_type && offer.cpu_type === params.cpu_type) {
        score += 10;
    } else if (!params.cpu_type) {
        score += 5;
    }

    return Math.round(score * 100) / 100;
}

function safeParseArray(val) {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
        try { return JSON.parse(val); } catch { return []; }
    }
    return [];
}

module.exports = { computeScore, safeParseArray };
