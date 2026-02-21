'use strict';

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getDb } = require('../db/database');
const { computeScore, safeParseArray } = require('../services/scoring');
const { sendLeadNotification } = require('../services/telegram');
const { rateLimit } = require('../middleware/rateLimit');

// ─── In-memory cache helper ───
const _cache = {};

function cached(key, ttlMs, computeFn) {
    const entry = _cache[key];
    const now = Date.now();
    if (entry && (now - entry.ts) < ttlMs) {
        return entry.value;
    }
    const value = computeFn();
    _cache[key] = { value, ts: now };
    return value;
}

// ─── Prepared statements (lazy singleton per db instance) ───
let _stmts = null;
let _stmtsDb = null;

function getStmts() {
    const db = getDb();
    if (_stmts && _stmtsDb === db) return _stmts;
    _stmts = {
        minPrice: db.prepare('SELECT MIN(promo_price_month) as min_price FROM offers WHERE provider_id = ?'),
        regionsList: db.prepare('SELECT * FROM regions ORDER BY name'),
        providerCount: db.prepare('SELECT COUNT(*) as c FROM providers'),
        offerCount: db.prepare('SELECT COUNT(*) as c FROM offers'),
        reviewCount: db.prepare('SELECT COUNT(*) as c FROM reviews'),
        topProviders: db.prepare('SELECT * FROM providers ORDER BY rating DESC LIMIT 8'),
        offerById: db.prepare(`
            SELECT o.*, p.name as provider_name, p.slug as provider_slug,
                   p.rating as provider_rating, p.rating_count as provider_rating_count,
                   p.logo_hint_text, p.logo_hint_seed, p.about_short as provider_about,
                   p.has_free_trial as provider_trial, p.trial_days as provider_trial_days,
                   p.url as provider_url
            FROM offers o JOIN providers p ON o.provider_id = p.id
            WHERE o.id = ?
        `),
        reviewsByProvider: db.prepare('SELECT * FROM reviews WHERE provider_id = ? ORDER BY created_at DESC LIMIT 5'),
        providerBySlug: db.prepare('SELECT * FROM providers WHERE slug = ?'),
        offersByProvider: db.prepare('SELECT * FROM offers WHERE provider_id = ? ORDER BY promo_price_month ASC LIMIT 20'),
        reviewsByProviderFull: db.prepare('SELECT * FROM reviews WHERE provider_id = ? ORDER BY created_at DESC LIMIT 10'),
        reviewCountByProvider: db.prepare('SELECT COUNT(*) as c FROM reviews WHERE provider_id = ?'),
        providerById: db.prepare('SELECT * FROM providers WHERE id = ?'),
        offerByIdSimple: db.prepare('SELECT * FROM offers WHERE id = ?'),
    };
    _stmtsDb = db;
    return _stmts;
}

// ─── ETag helper ───
function sendWithEtag(res, data) {
    const json = JSON.stringify(data);
    const etag = '"' + crypto.createHash('md5').update(json).digest('hex').substring(0, 16) + '"';
    res.set('ETag', etag);
    res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
    res.type('json').send(json);
}

// ─── GET /api/regions ───
router.get('/regions', (req, res) => {
    const stmts = getStmts();
    const regions = stmts.regionsList.all();
    sendWithEtag(res, regions);
});

// ─── GET /api/providers ───
router.get('/providers', (req, res) => {
    const db = getDb();
    const stmts = getStmts();
    const { query, region, trial, min_rating, page, limit } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const offset = (pageNum - 1) * limitNum;

    let sql = 'SELECT * FROM providers WHERE 1=1';
    const params = [];

    if (query) {
        sql += ' AND (name LIKE ? OR slug LIKE ?)';
        params.push(`%${query}%`, `%${query}%`);
    }
    if (region) {
        sql += ' AND regions LIKE ?';
        params.push(`%"${region}"%`);
    }
    if (trial === 'true' || trial === '1') {
        sql += ' AND has_free_trial = 1';
    }
    if (min_rating) {
        sql += ' AND rating >= ?';
        params.push(parseFloat(min_rating));
    }

    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const total = db.prepare(countSql).get(...params).total;

    sql += ' ORDER BY rating DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const providers = db.prepare(sql).all(...params);

    for (const p of providers) {
        const row = stmts.minPrice.get(p.id);
        p.min_price = row?.min_price || null;
        p.regions = safeParseArray(p.regions);
        p.cpu_brands = safeParseArray(p.cpu_brands);
        p.aliases = safeParseArray(p.aliases);
    }

    sendWithEtag(res, { providers, total, page: pageNum, pages: Math.ceil(total / limitNum) });
});

// ─── GET /api/providers/:slug ───
router.get('/providers/:slug', (req, res) => {
    const stmts = getStmts();
    const provider = stmts.providerBySlug.get(req.params.slug);
    if (!provider) return res.status(404).json({ error: 'Провайдер не найден' });

    provider.regions = safeParseArray(provider.regions);
    provider.cpu_brands = safeParseArray(provider.cpu_brands);
    provider.aliases = safeParseArray(provider.aliases);

    const offers = stmts.offersByProvider.all(provider.id);
    for (const o of offers) {
        o.regions = safeParseArray(o.regions);
        o.pools = safeParseArray(o.pools);
        o.disks_json = safeParseArray(o.disks_json);
    }

    const reviews = stmts.reviewsByProviderFull.all(provider.id);
    for (const r of reviews) {
        r.pros = safeParseArray(r.pros);
        r.cons = safeParseArray(r.cons);
    }

    sendWithEtag(res, { provider, offers, reviews });
});

// ─── GET /api/offers/search ─── (main configurator endpoint)
router.get('/offers/search', (req, res) => {
    const db = getDb();
    const {
        vcpu, ram_gb, disk_size_gb, disk_type,
        cpu_type, cpu_brand,
        bandwidth_mbps, traffic_limit_tb,
        region, virtualization,
        trial, ddos, ipv4,
        sort, page, limit
    } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    let whereSql = ' WHERE 1=1';
    const params = [];

    if (vcpu) { whereSql += ' AND o.vcpu >= ?'; params.push(parseInt(vcpu)); }
    if (ram_gb) { whereSql += ' AND o.ram_gb >= ?'; params.push(parseInt(ram_gb)); }
    if (disk_size_gb) { whereSql += ' AND o.disk_system_size_gb >= ?'; params.push(parseInt(disk_size_gb)); }
    if (disk_type && disk_type !== 'any') { whereSql += ' AND o.disk_system_type = ?'; params.push(disk_type); }
    if (cpu_type && cpu_type !== 'any') { whereSql += ' AND o.cpu_type = ?'; params.push(cpu_type); }
    if (cpu_brand && cpu_brand !== 'any') { whereSql += ' AND o.cpu_brand = ?'; params.push(cpu_brand); }
    if (bandwidth_mbps) { whereSql += ' AND o.bandwidth_mbps >= ?'; params.push(parseInt(bandwidth_mbps)); }
    if (traffic_limit_tb) { whereSql += ' AND o.traffic_limit_tb >= ?'; params.push(parseFloat(traffic_limit_tb)); }
    if (region) { whereSql += ' AND o.regions LIKE ?'; params.push(`%"${region}"%`); }
    if (virtualization && virtualization !== 'any') { whereSql += ' AND o.virtualization = ?'; params.push(virtualization); }
    if (trial === 'true' || trial === '1') { whereSql += ' AND o.free_trial_available = 1'; }
    if (ddos === 'true' || ddos === '1') { whereSql += ' AND o.ddos_protection = 1'; }
    if (ipv4 === 'true' || ipv4 === '1') { whereSql += ' AND o.ipv4_included = 1'; }

    // Count total
    const countSql = `SELECT COUNT(*) as total FROM offers o JOIN providers p ON o.provider_id = p.id${whereSql}`;
    const total = db.prepare(countSql).get(...params).total;

    let sql = `SELECT o.*, p.name as provider_name, p.slug as provider_slug,
             p.rating as provider_rating, p.rating_count as provider_rating_count,
             p.logo_hint_text, p.logo_hint_seed,
             p.has_free_trial as provider_trial, p.trial_days as provider_trial_days
             FROM offers o
             JOIN providers p ON o.provider_id = p.id${whereSql}`;

    // Sorting
    const sortMap = {
        'price_asc': 'o.promo_price_month ASC',
        'price_desc': 'o.promo_price_month DESC',
        'rating': 'p.rating DESC',
        'traffic': 'o.traffic_limit_tb DESC',
        'bandwidth': 'o.bandwidth_mbps DESC',
        'trial': 'o.free_trial_available DESC, o.free_trial_days DESC'
    };

    if (sort && sortMap[sort]) {
        sql += ` ORDER BY ${sortMap[sort]}`;
    } else {
        sql += ' ORDER BY o.promo_price_month ASC';
    }

    sql += ' LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    let offers = db.prepare(sql).all(...params);

    // Parse JSON fields
    for (const o of offers) {
        o.regions = safeParseArray(o.regions);
        o.pools = safeParseArray(o.pools);
        o.disks_json = safeParseArray(o.disks_json);
    }

    // Best match scoring if no specific sort
    if (!sort || sort === 'best') {
        const maxPrice = offers.length > 0 ? Math.max(...offers.map(o => o.promo_price_month)) : 50000;
        for (const o of offers) {
            o._score = computeScore(o, { rating: o.provider_rating }, {
                ...req.query,
                _maxPrice: maxPrice
            });
        }
        offers.sort((a, b) => b._score - a._score);
    }

    // Count unique providers
    const providerIds = new Set(offers.map(o => o.provider_id));

    sendWithEtag(res, {
        offers,
        total,
        provider_count: providerIds.size,
        page: pageNum,
        pages: Math.ceil(total / limitNum)
    });
});

// ─── GET /api/offers/:id ───
router.get('/offers/:id', (req, res) => {
    const stmts = getStmts();
    const offer = stmts.offerById.get(req.params.id);
    if (!offer) return res.status(404).json({ error: 'Оффер не найден' });

    offer.regions = safeParseArray(offer.regions);
    offer.pools = safeParseArray(offer.pools);
    offer.disks_json = safeParseArray(offer.disks_json);

    const reviews = stmts.reviewsByProvider.all(offer.provider_id);
    for (const r of reviews) {
        r.pros = safeParseArray(r.pros);
        r.cons = safeParseArray(r.cons);
    }

    sendWithEtag(res, { offer, reviews });
});

// ─── GET /api/reviews ───
router.get('/reviews', (req, res) => {
    const db = getDb();
    const { provider_id, sort, verified, page, limit } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    let sql = `SELECT r.*, p.name as provider_name, p.slug as provider_slug
             FROM reviews r JOIN providers p ON r.provider_id = p.id WHERE 1=1`;
    const params = [];

    if (provider_id) { sql += ' AND r.provider_id = ?'; params.push(provider_id); }
    if (verified === 'true' || verified === '1') { sql += ' AND r.verified = 1'; }

    const countSql = sql.replace(/SELECT r\.\*.*?FROM/, 'SELECT COUNT(*) as total FROM');
    const total = db.prepare(countSql).get(...params).total;

    const sortMap = {
        'new': 'r.created_at DESC',
        'helpful': 'r.likes DESC',
        'rating': 'r.rating DESC'
    };
    sql += ` ORDER BY ${sortMap[sort] || 'r.created_at DESC'}`;
    sql += ' LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const reviews = db.prepare(sql).all(...params);
    for (const r of reviews) {
        r.pros = safeParseArray(r.pros);
        r.cons = safeParseArray(r.cons);
    }

    sendWithEtag(res, { reviews, total, page: pageNum, pages: Math.ceil(total / limitNum) });
});

// ─── GET /api/blog ───
router.get('/blog', (req, res) => {
    const db = getDb();
    const { page, limit } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 12));
    const offset = (pageNum - 1) * limitNum;

    const total = db.prepare("SELECT COUNT(*) as total FROM content_pages WHERE type = 'article'").get().total;
    const articles = db.prepare(
        "SELECT * FROM content_pages WHERE type = 'article' ORDER BY published_at DESC LIMIT ? OFFSET ?"
    ).all(limitNum, offset);

    for (const a of articles) {
        a.tags = safeParseArray(a.tags);
    }

    sendWithEtag(res, { articles, total, page: pageNum, pages: Math.ceil(total / limitNum) });
});

// ─── GET /api/blog/:slug ───
router.get('/blog/:slug', (req, res) => {
    const db = getDb();
    const article = db.prepare(
        "SELECT * FROM content_pages WHERE slug = ? AND type = 'article'"
    ).get(req.params.slug);

    if (!article) return res.status(404).json({ error: 'Статья не найдена' });
    article.tags = safeParseArray(article.tags);
    sendWithEtag(res, article);
});

// ─── GET /api/faq ───
router.get('/faq', (req, res) => {
    const db = getDb();
    const faq = db.prepare("SELECT * FROM content_pages WHERE type = 'faq' ORDER BY id").all();
    sendWithEtag(res, faq);
});

// ─── POST /api/leads ─── (rate limited: 3 per 10 min per IP)
router.post('/leads', rateLimit(3, 10 * 60 * 1000), (req, res) => {
    const db = getDb();
    const stmts = getStmts();
    const { provider_id, offer_id, config_snapshot, email, phone, utm, page_url, referrer, honeypot } = req.body;

    // Honeypot check
    if (honeypot) {
        console.warn(`[leads] Honeypot triggered from IP ${req.ip}`);
        // Pretend success to the bot
        return res.json({ success: true, message: 'Заявка отправлена' });
    }

    // Validation
    if (!email || !phone) {
        return res.status(400).json({ error: 'Email и телефон обязательны' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Некорректный email' });
    }

    const stmt = db.prepare(`
    INSERT INTO leads (provider_id, offer_id, config_snapshot, email, phone, utm, page_url, referrer, user_agent, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

    const result = stmt.run(
        provider_id || null,
        offer_id || null,
        JSON.stringify(config_snapshot || {}),
        email,
        phone,
        JSON.stringify(utm || {}),
        page_url || '',
        referrer || req.get('referer') || '',
        req.get('user-agent') || '',
        req.ip || ''
    );

    // Send email notification (fire and forget, log errors)
    const provider = provider_id ? stmts.providerById.get(provider_id) : { name: 'Не указан' };
    const offer = offer_id ? stmts.offerByIdSimple.get(offer_id) : { name: 'Не указан', promo_price_month: 0, vcpu: 0, ram_gb: 0, disk_system_type: '-', disk_system_size_gb: 0, cpu_type: '-', cpu_brand: '-', cpu_model: '-', bandwidth_mbps: 0, traffic_limit_tb: 0, regions: '[]' };

    sendLeadNotification(
        { email, phone, page_url, utm: JSON.stringify(utm || {}), created_at: new Date().toISOString() },
        provider || { name: 'Не указан' },
        offer || { name: 'Не указан' }
    ).catch(err => {
        console.error(`[leads] Ошибка отправки в Telegram: ${err.message}`);
    });

    console.log(`[leads] Новый лид #${result.lastInsertRowid}: ${email} → ${provider?.name || 'unknown'}`);

    res.json({
        success: true,
        lead_id: result.lastInsertRowid,
        message: 'Заявка отправлена — ожидайте. Провайдер с вами свяжется.'
    });
});

module.exports = router;
