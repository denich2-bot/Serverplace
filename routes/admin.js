'use strict';

const express = require('express');
const router = express.Router();
const { getDb } = require('../db/database');
const { authMiddleware, generateToken } = require('../middleware/auth');
const { safeParseArray } = require('../services/scoring');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'denich2@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ServerPlace2026!';

// ─── POST /api/admin/login ───
router.post('/login', (req, res) => {
    const { email, password } = req.body;
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        const token = generateToken(email);
        res.cookie('admin_token', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000, sameSite: 'lax' });
        return res.json({ success: true, token });
    }
    return res.status(401).json({ error: 'Неверный email или пароль' });
});

// ─── POST /api/admin/logout ───
router.post('/logout', (req, res) => {
    res.clearCookie('admin_token');
    res.json({ success: true });
});

// All routes below require auth
router.use(authMiddleware);

// ─── GET /api/admin/stats ───
router.get('/stats', (req, res) => {
    const db = getDb();
    const providers = db.prepare('SELECT COUNT(*) as count FROM providers').get().count;
    const offers = db.prepare('SELECT COUNT(*) as count FROM offers').get().count;
    const reviews = db.prepare('SELECT COUNT(*) as count FROM reviews').get().count;
    const leads_total = db.prepare('SELECT COUNT(*) as count FROM leads').get().count;
    const leads_new = db.prepare("SELECT COUNT(*) as count FROM leads WHERE status = 'new'").get().count;
    const leads_today = db.prepare(
        "SELECT COUNT(*) as count FROM leads WHERE date(created_at) = date('now')"
    ).get().count;

    res.json({ providers, offers, reviews, leads_total, leads_new, leads_today });
});

// ─── LEADS ───
router.get('/leads', (req, res) => {
    const db = getDb();
    const { status, date_from, date_to, page, limit } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 30));
    const offset = (pageNum - 1) * limitNum;

    let sql = `SELECT l.*, p.name as provider_name, o.name as offer_name 
             FROM leads l 
             LEFT JOIN providers p ON l.provider_id = p.id
             LEFT JOIN offers o ON l.offer_id = o.id
             WHERE 1=1`;
    const params = [];

    if (status) { sql += ' AND l.status = ?'; params.push(status); }
    if (date_from) { sql += ' AND l.created_at >= ?'; params.push(date_from); }
    if (date_to) { sql += ' AND l.created_at <= ?'; params.push(date_to + ' 23:59:59'); }

    const countSql = sql.replace(/SELECT l\.\*.*?FROM/, 'SELECT COUNT(*) as total FROM');
    const total = db.prepare(countSql).get(...params).total;

    sql += ' ORDER BY l.created_at DESC LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const leads = db.prepare(sql).all(...params);
    res.json({ leads, total, page: pageNum, pages: Math.ceil(total / limitNum) });
});

router.patch('/leads/:id', (req, res) => {
    const db = getDb();
    const { status } = req.body;
    const validStatuses = ['new', 'sent', 'in_work', 'closed'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `Статус должен быть: ${validStatuses.join(', ')}` });
    }
    db.prepare('UPDATE leads SET status = ? WHERE id = ?').run(status, req.params.id);
    res.json({ success: true });
});

// ─── GET /api/admin/leads/export ───
router.get('/leads/export', (req, res) => {
    const db = getDb();
    const leads = db.prepare(`
    SELECT l.*, p.name as provider_name, o.name as offer_name
    FROM leads l
    LEFT JOIN providers p ON l.provider_id = p.id
    LEFT JOIN offers o ON l.offer_id = o.id
    ORDER BY l.created_at DESC
  `).all();

    const header = 'ID,Provider,Offer,Email,Phone,Status,Created\n';
    const rows = leads.map(l =>
        `${l.id},"${l.provider_name || ''}","${l.offer_name || ''}","${l.email}","${l.phone}","${l.status}","${l.created_at}"`
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=leads.csv');
    res.send('\uFEFF' + header + rows);
});

// ─── PROVIDERS CRUD ───
router.get('/providers', (req, res) => {
    const db = getDb();
    const providers = db.prepare('SELECT * FROM providers ORDER BY name').all();
    for (const p of providers) {
        p.regions = safeParseArray(p.regions);
        p.cpu_brands = safeParseArray(p.cpu_brands);
    }
    res.json(providers);
});

router.put('/providers/:id', (req, res) => {
    const db = getDb();
    const { name, url, rating, has_free_trial, trial_days, about_short, promo_label, promo_discount_percent, promo_until } = req.body;
    db.prepare(`
    UPDATE providers SET name=?, url=?, rating=?, has_free_trial=?, trial_days=?,
    about_short=?, promo_label=?, promo_discount_percent=?, promo_until=?, updated_at=datetime('now')
    WHERE id=?
  `).run(name, url, rating, has_free_trial ? 1 : 0, trial_days || 0,
        about_short, promo_label, promo_discount_percent, promo_until, req.params.id);
    res.json({ success: true });
});

// ─── OFFERS CRUD ───
router.get('/offers', (req, res) => {
    const db = getDb();
    const { provider_id } = req.query;
    let sql = 'SELECT o.*, p.name as provider_name FROM offers o JOIN providers p ON o.provider_id = p.id';
    const params = [];
    if (provider_id) { sql += ' WHERE o.provider_id = ?'; params.push(provider_id); }
    sql += ' ORDER BY o.promo_price_month ASC LIMIT 200';
    const offers = db.prepare(sql).all(...params);
    res.json(offers);
});

// ─── REVIEWS CRUD ───
router.get('/reviews', (req, res) => {
    const db = getDb();
    const reviews = db.prepare(`
    SELECT r.*, p.name as provider_name FROM reviews r 
    JOIN providers p ON r.provider_id = p.id ORDER BY r.created_at DESC LIMIT 100
  `).all();
    for (const r of reviews) {
        r.pros = safeParseArray(r.pros);
        r.cons = safeParseArray(r.cons);
    }
    res.json(reviews);
});

module.exports = router;
