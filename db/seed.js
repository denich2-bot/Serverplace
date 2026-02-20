'use strict';

const fs = require('fs');
const path = require('path');
const { getDb, closeDb } = require('./database');

const DEMO_DIR = path.join(__dirname, '..', 'demo_data');

function loadJson(filename) {
    const filepath = path.join(DEMO_DIR, filename);
    if (!fs.existsSync(filepath)) {
        console.error(`[seed] файл не найден: ${filepath}`);
        process.exit(1);
    }
    return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
}

function seed() {
    const db = getDb();

    // Run schema
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    db.exec(schema);

    console.log('[seed] Загрузка demo-данных...');

    // --- Regions ---
    const regions = loadJson('regions.json');
    const insertRegion = db.prepare(
        'INSERT OR REPLACE INTO regions (id, name, country, city) VALUES (?, ?, ?, ?)'
    );
    const regionTx = db.transaction((items) => {
        for (const r of items) {
            insertRegion.run(r.id, r.name, r.country || 'Россия', r.city || '');
        }
    });
    regionTx(regions);
    console.log(`[seed] Регионы: ${regions.length}`);

    // --- Providers ---
    const providers = loadJson('providers.json');
    const insertProvider = db.prepare(`
    INSERT OR REPLACE INTO providers 
    (id, name, slug, url, logo_hint_type, logo_hint_text, logo_hint_seed,
     rating, rating_count, has_free_trial, trial_days,
     regions, cpu_brands, support_email, support_phone,
     promo_label, promo_discount_percent, promo_until,
     about_short, aliases)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);
    const providerTx = db.transaction((items) => {
        for (const p of items) {
            insertProvider.run(
                p.id, p.name, p.slug, p.url,
                p.logo_hint?.type || 'initials',
                p.logo_hint?.text || p.name.substring(0, 2).toUpperCase(),
                p.logo_hint?.seed || p.slug,
                p.rating || 0, p.rating_count || 0,
                p.has_free_trial ? 1 : 0, p.trial_days || 0,
                JSON.stringify(p.regions || []),
                JSON.stringify(p.cpu_brands || []),
                p.support?.email || '', p.support?.phone || '',
                p.promo?.label || '', p.promo?.discount_percent || 0, p.promo?.until || '',
                p.about_short || '',
                JSON.stringify(p.aliases || [])
            );
        }
    });
    providerTx(providers);
    console.log(`[seed] Провайдеры: ${providers.length}`);

    // --- Offers ---
    const offers = loadJson('offers.json');
    const insertOffer = db.prepare(`
    INSERT OR REPLACE INTO offers
    (id, provider_id, name, billing, currency,
     market_price_month, promo_price_month, promo_label,
     vcpu, ram_gb, cpu_type, cpu_brand, cpu_line, cpu_model,
     disk_system_type, disk_system_size_gb, disks_json,
     bandwidth_mbps, traffic_limit_tb,
     ipv4_included, ipv6_included, ddos_protection,
     sla_percent, virtualization,
     regions, pools,
     free_trial_available, free_trial_days, free_trial_conditions,
     order_url, docs_url, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);
    const offerTx = db.transaction((items) => {
        for (const o of items) {
            const res = o.resources || {};
            const cpu = res.cpu || {};
            const net = res.network || {};
            const systemDisk = (res.disks || []).find(d => d.role === 'system') || {};
            const trial = o.free_trial || {};
            const avail = o.availability || {};
            const links = o.links || {};

            insertOffer.run(
                o.id, o.provider_id, o.name, o.billing || 'month', o.currency || 'RUB',
                o.market_price_month, o.promo_price_month, o.promo_label || '',
                res.vcpu || 1, res.ram_gb || 1,
                cpu.type || '', cpu.brand || '', cpu.line || '', cpu.model || '',
                systemDisk.type || 'ssd', systemDisk.size_gb || 25,
                JSON.stringify(res.disks || []),
                net.bandwidth_mbps || 100, net.traffic_limit_tb || 1,
                res.ipv4_included ? 1 : 0, res.ipv6_included ? 1 : 0,
                res.ddos_protection ? 1 : 0,
                res.sla_percent || 99.9, res.virtualization || 'KVM',
                JSON.stringify(avail.regions || []), JSON.stringify(avail.pools || []),
                trial.available ? 1 : 0, trial.days || 0, trial.conditions || '',
                links.order_url || '', links.docs_url || '',
                o.updated_at || new Date().toISOString().split('T')[0]
            );
        }
    });
    offerTx(offers);
    console.log(`[seed] Офферы: ${offers.length}`);

    // --- Reviews ---
    const reviews = loadJson('reviews.json');
    const insertReview = db.prepare(`
    INSERT OR REPLACE INTO reviews
    (id, provider_id, user_display_name, user_role,
     rating, title, pros, cons, use_case, text,
     created_at, verified, likes)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);
    const reviewTx = db.transaction((items) => {
        for (const r of items) {
            insertReview.run(
                r.id, r.provider_id, r.user_display_name, r.user_role || '',
                r.rating || 5, r.title || '',
                JSON.stringify(r.pros || []), JSON.stringify(r.cons || []),
                r.use_case || '', r.text || '',
                r.created_at || new Date().toISOString().split('T')[0],
                r.verified ? 1 : 0, r.likes || 0
            );
        }
    });
    reviewTx(reviews);
    console.log(`[seed] Отзывы: ${reviews.length}`);

    // --- Articles ---
    const articles = loadJson('articles.json');
    const insertArticle = db.prepare(`
    INSERT OR REPLACE INTO content_pages
    (id, type, slug, title, excerpt, content_md, tags, reading_time_min, published_at)
    VALUES (?,?,?,?,?,?,?,?,?)
  `);
    const articleTx = db.transaction((items) => {
        for (const a of items) {
            insertArticle.run(
                a.id, 'article', a.slug, a.title,
                a.excerpt || '', a.content_md || '',
                JSON.stringify(a.tags || []),
                a.reading_time_min || 5,
                a.published_at || new Date().toISOString().split('T')[0]
            );
        }
    });
    articleTx(articles);
    console.log(`[seed] Статьи: ${articles.length}`);

    // --- FAQ ---
    const faq = loadJson('faq.json');
    const faqTx = db.transaction((items) => {
        for (let i = 0; i < items.length; i++) {
            const f = items[i];
            insertArticle.run(
                `faq_${i}`, 'faq', `faq-${i}`, f.q,
                '', f.a, '[]', 1,
                new Date().toISOString().split('T')[0]
            );
        }
    });
    faqTx(faq);
    console.log(`[seed] FAQ: ${faq.length}`);

    closeDb();
    console.log('[seed] Готово!');
}

seed();
