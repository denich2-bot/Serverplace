'use strict';

const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { safeParseArray } = require('../services/scoring');
const { authMiddleware } = require('../middleware/auth');

// ─── In-memory cache helper ───
const _pageCache = {};

function cached(key, ttlMs, computeFn) {
    const entry = _pageCache[key];
    const now = Date.now();
    if (entry && (now - entry.ts) < ttlMs) {
        return entry.value;
    }
    const value = computeFn();
    _pageCache[key] = { value, ts: now };
    return value;
}

// ─── PUBLIC PAGES ───

router.get('/', (req, res) => {
    res.redirect('/servers');
});

router.get('/lp', (req, res) => {
    // Кэш данных главной страницы на 60 секунд
    const data = cached('lp_data', 60000, () => {
        const db = getDb();
        const providerCount = db.prepare('SELECT COUNT(*) as c FROM providers').get().c;
        const offerCount = db.prepare('SELECT COUNT(*) as c FROM offers').get().c;
        const reviewCount = db.prepare('SELECT COUNT(*) as c FROM reviews').get().c;
        const topProviders = db.prepare('SELECT * FROM providers ORDER BY rating DESC LIMIT 8').all();
        const minPriceStmt = db.prepare('SELECT MIN(promo_price_month) as mp FROM offers WHERE provider_id = ?');
        for (const p of topProviders) {
            p.regions = safeParseArray(p.regions);
            p.min_price = minPriceStmt.get(p.id)?.mp || null;
        }
        return { providerCount, offerCount, reviewCount, topProviders };
    });

    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
    res.render('index', {
        title: 'ServerPlace — Маркетплейс облачных серверов в РФ',
        ...data,
        currentPage: 'home'
    });
});

router.get('/servers', (req, res) => {
    const regions = cached('regions', 60000, () => {
        const db = getDb();
        return db.prepare('SELECT * FROM regions ORDER BY name').all();
    });
    res.render('servers', {
        title: 'Подобрать сервер — ServerPlace',
        regions,
        currentPage: 'servers'
    });
});

router.get('/offers/:id', (req, res) => {
    const db = getDb();
    const offer = db.prepare(`
    SELECT o.*, p.name as provider_name, p.slug as provider_slug,
           p.rating as provider_rating, p.rating_count as provider_rating_count,
           p.logo_hint_text, p.logo_hint_seed, p.about_short as provider_about,
           p.url as provider_url
    FROM offers o JOIN providers p ON o.provider_id = p.id WHERE o.id = ?
  `).get(req.params.id);
    if (!offer) return res.status(404).render('404', { title: '404', currentPage: '' });
    offer.regions = safeParseArray(offer.regions);
    offer.disks_json = safeParseArray(offer.disks_json);
    const reviews = db.prepare('SELECT * FROM reviews WHERE provider_id = ? ORDER BY created_at DESC LIMIT 5').all(offer.provider_id);
    for (const r of reviews) { r.pros = safeParseArray(r.pros); r.cons = safeParseArray(r.cons); }
    res.render('offer', { title: `${offer.name} — ${offer.provider_name}`, offer, reviews, currentPage: '' });
});

router.get('/providers', (req, res) => {
    const regions = cached('regions', 60000, () => {
        const db = getDb();
        return db.prepare('SELECT * FROM regions ORDER BY name').all();
    });
    res.render('providers', { title: 'Провайдеры — ServerPlace', regions, currentPage: 'providers' });
});

router.get('/providers/:slug', (req, res) => {
    const db = getDb();
    const provider = db.prepare('SELECT * FROM providers WHERE slug = ?').get(req.params.slug);
    if (!provider) return res.status(404).render('404', { title: '404', currentPage: '' });
    provider.regions = safeParseArray(provider.regions);
    provider.cpu_brands = safeParseArray(provider.cpu_brands);
    const offers = db.prepare('SELECT * FROM offers WHERE provider_id = ? ORDER BY promo_price_month ASC LIMIT 20').all(provider.id);
    for (const o of offers) { o.regions = safeParseArray(o.regions); }
    const reviews = db.prepare('SELECT * FROM reviews WHERE provider_id = ? ORDER BY created_at DESC LIMIT 10').all(provider.id);
    for (const r of reviews) { r.pros = safeParseArray(r.pros); r.cons = safeParseArray(r.cons); }
    const reviewCount = db.prepare('SELECT COUNT(*) as c FROM reviews WHERE provider_id = ?').get(provider.id).c;
    res.render('provider', { title: `${provider.name} — ServerPlace`, provider, offers, reviews, reviewCount, currentPage: 'providers' });
});

router.get('/compare', (req, res) => {
    res.render('compare', { title: 'Сравнение серверов — ServerPlace', currentPage: 'compare' });
});

router.get('/reviews', (req, res) => {
    const db = getDb();
    const providers = db.prepare('SELECT id, name FROM providers ORDER BY name').all();
    res.render('reviews', { title: 'Отзывы — ServerPlace', providers, currentPage: 'reviews' });
});

router.get('/blog', (req, res) => {
    const db = getDb();
    const articles = db.prepare("SELECT * FROM content_pages WHERE type='article' ORDER BY published_at DESC").all();
    for (const a of articles) a.tags = safeParseArray(a.tags);
    res.render('blog', { title: 'Блог — ServerPlace', articles, currentPage: 'blog' });
});

router.get('/blog/:slug', (req, res) => {
    const db = getDb();
    const article = db.prepare("SELECT * FROM content_pages WHERE slug = ? AND type = 'article'").get(req.params.slug);
    if (!article) return res.status(404).render('404', { title: '404', currentPage: '' });
    article.tags = safeParseArray(article.tags);
    res.render('article', { title: `${article.title} — ServerPlace`, article, currentPage: 'blog' });
});

router.get('/faq', (req, res) => {
    const db = getDb();
    const faq = db.prepare("SELECT * FROM content_pages WHERE type = 'faq' ORDER BY id").all();
    res.render('faq', { title: 'FAQ — ServerPlace', faq, currentPage: 'faq' });
});

router.get('/contacts', (req, res) => {
    res.render('contacts', { title: 'Контакты — ServerPlace', currentPage: 'contacts' });
});

// ─── ADMIN PAGES ───

router.get('/admin/login', (req, res) => {
    res.render('admin/login', { title: 'Вход — Админка', currentPage: 'admin' });
});

router.get('/admin', authMiddleware, (req, res) => {
    res.render('admin/dashboard', { title: 'Дашборд — ServerPlace Admin', currentPage: 'admin' });
});

router.get('/admin/leads', authMiddleware, (req, res) => {
    res.render('admin/leads', { title: 'Заявки — ServerPlace Admin', currentPage: 'admin' });
});

router.get('/admin/providers', authMiddleware, (req, res) => {
    res.render('admin/providers_admin', { title: 'Провайдеры — ServerPlace Admin', currentPage: 'admin' });
});

router.get('/admin/offers', authMiddleware, (req, res) => {
    res.render('admin/offers_admin', { title: 'Офферы — ServerPlace Admin', currentPage: 'admin' });
});

router.get('/admin/reviews', authMiddleware, (req, res) => {
    res.render('admin/reviews_admin', { title: 'Отзывы — ServerPlace Admin', currentPage: 'admin' });
});

module.exports = router;
