'use strict';

const https = require('https');

const BOT_TOKEN = '8505228927:AAG-Ba2cW50GsKRrToqqvvmpAhHTv0EsF2U';
const ADMIN_CHAT_ID = '127001153';

function sendTelegramMessage(chatId, text) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: 'HTML',
            disable_web_page_preview: true
        });

        const options = {
            hostname: 'api.telegram.org',
            port: 443,
            path: `/bot${BOT_TOKEN}/sendMessage`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => {
                const result = JSON.parse(body);
                if (!result.ok) {
                    reject(new Error(`Telegram API error: ${result.description}`));
                    return;
                }
                resolve(result);
            });
        });

        req.on('error', (err) => {
            reject(new Error(`Telegram request failed: ${err.message}`));
        });

        req.write(payload);
        req.end();
    });
}

async function sendLeadNotification(lead, provider, offer) {
    const text = `🔔 <b>Новая заявка на ServerPlace</b>\n\n` +
        `<b>Провайдер:</b> ${provider.name}\n` +
        `<b>Тариф:</b> ${offer.name}\n` +
        `<b>Цена:</b> ${offer.promo_price_month} ₽/мес\n` +
        `<b>vCPU:</b> ${offer.vcpu} | <b>RAM:</b> ${offer.ram_gb} ГБ\n` +
        `<b>Диск:</b> ${offer.disk_system_type || '-'} ${offer.disk_system_size_gb || 0} ГБ\n` +
        `<b>CPU:</b> ${offer.cpu_type || '-'} / ${offer.cpu_brand || '-'}\n` +
        `<b>Канал:</b> ${offer.bandwidth_mbps || 0} Mbps\n` +
        `<b>Трафик:</b> ${offer.traffic_limit_tb || 0} TB/мес\n\n` +
        `👤 <b>Контакты клиента</b>\n` +
        `<b>Email:</b> ${lead.email}\n` +
        `<b>Телефон:</b> ${lead.phone}\n\n` +
        `📋 <b>Техническое</b>\n` +
        `<b>Дата:</b> ${lead.created_at || new Date().toISOString()}\n` +
        `<b>Страница:</b> ${lead.page_url || '-'}\n` +
        `<b>UTM:</b> ${lead.utm || '-'}`;

    await sendTelegramMessage(ADMIN_CHAT_ID, text);
    console.log(`[telegram] Уведомление о лиде отправлено в Telegram (chat_id: ${ADMIN_CHAT_ID})`);
}

module.exports = { sendLeadNotification, sendTelegramMessage, BOT_TOKEN, ADMIN_CHAT_ID };
