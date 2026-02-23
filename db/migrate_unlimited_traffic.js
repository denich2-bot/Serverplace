'use strict';

const fs = require('fs');
const path = require('path');
const { getDb, closeDb } = require('./database');

const db = getDb();

try {
    const providers = db.prepare('SELECT * FROM providers').all();
    if (providers.length === 0) {
        throw new Error('No providers found');
    }

    const offers = db.prepare('SELECT * FROM offers LIMIT 50').all();
    if (offers.length === 0) {
        throw new Error('No offers found');
    }

    console.log('Generating 200 unlimited traffic demo servers...');

    // Get max offer id
    const maxOfferIdRow = db.prepare('SELECT MAX(CAST(SUBSTR(id, 2) AS INTEGER)) as max_id FROM offers').get();
    let nextOfferIdNum = (maxOfferIdRow && maxOfferIdRow.max_id ? maxOfferIdRow.max_id : 9999) + 1;

    const insertStmt = db.prepare(`
        INSERT INTO offers (
            id, provider_id, name, billing, currency, market_price_month, promo_price_month, promo_label,
            vcpu, ram_gb, cpu_type, cpu_brand, cpu_line, cpu_model, disk_system_type, disk_system_size_gb,
            disks_json, bandwidth_mbps, traffic_limit_tb, ipv4_included, ipv6_included, ddos_protection,
            sla_percent, virtualization, regions, pools, free_trial_available, free_trial_days,
            free_trial_conditions, order_url, docs_url, updated_at, service_type
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, datetime('now'), ?
        )
    `);

    let count = 0;
    while (count < 200) {
        // Pick a random provider
        const p = providers[Math.floor(Math.random() * providers.length)];
        // Pick a random offer to clone resource specs from
        const baseOffer = offers[Math.floor(Math.random() * offers.length)];

        const idStr = 'o' + String(nextOfferIdNum).padStart(5, '0');
        nextOfferIdNum++;

        // Ensure realistic price
        const priceMult = 1.0 + (Math.random() * 0.5);
        const marketPrice = baseOffer.market_price_month * priceMult;
        const promoPrice = baseOffer.promo_price_month * priceMult;

        insertStmt.run(
            idStr, p.id, baseOffer.name + ' (Unlimited)', baseOffer.billing, baseOffer.currency, marketPrice, promoPrice, baseOffer.promo_label,
            baseOffer.vcpu, baseOffer.ram_gb, baseOffer.cpu_type, baseOffer.cpu_brand, baseOffer.cpu_line, baseOffer.cpu_model, baseOffer.disk_system_type, baseOffer.disk_system_size_gb,
            baseOffer.disks_json, baseOffer.bandwidth_mbps, 999999, baseOffer.ipv4_included, baseOffer.ipv6_included, baseOffer.ddos_protection,
            baseOffer.sla_percent, baseOffer.virtualization, baseOffer.regions, baseOffer.pools, baseOffer.free_trial_available, baseOffer.free_trial_days,
            baseOffer.free_trial_conditions, baseOffer.order_url, baseOffer.docs_url, baseOffer.service_type || 'vds'
        );
        count++;
    }

    console.log(`Successfully generated ${count} unlimited servers.`);

} catch (err) {
    console.error('Migration failed:', err);
} finally {
    closeDb();
}
