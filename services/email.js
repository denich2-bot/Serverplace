'use strict';

const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST || 'localhost';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '25', 10);
const SMTP_FROM = process.env.SMTP_FROM || 'noreply@serverplace.su';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'denich2@gmail.com';

const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false,
    tls: { rejectUnauthorized: false }
});

async function sendLeadNotification(lead, provider, offer) {
    const subject = `Serverplace: новая заявка (${provider.name})`;

    const html = `
    <h2>Новая заявка на ServerPlace</h2>
    <table style="border-collapse:collapse;font-family:Arial,sans-serif;">
      <tr><td style="padding:6px 12px;font-weight:bold;">Провайдер:</td><td style="padding:6px 12px;">${provider.name}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;">Тариф:</td><td style="padding:6px 12px;">${offer.name}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;">Цена по акции:</td><td style="padding:6px 12px;">${offer.promo_price_month} ₽/мес</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;">vCPU:</td><td style="padding:6px 12px;">${offer.vcpu}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;">RAM:</td><td style="padding:6px 12px;">${offer.ram_gb} ГБ</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;">Диск:</td><td style="padding:6px 12px;">${offer.disk_system_type} ${offer.disk_system_size_gb} ГБ</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;">CPU:</td><td style="padding:6px 12px;">${offer.cpu_type} / ${offer.cpu_brand} ${offer.cpu_model}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;">Канал:</td><td style="padding:6px 12px;">${offer.bandwidth_mbps} Mbps</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;">Трафик:</td><td style="padding:6px 12px;">${offer.traffic_limit_tb} TB/мес</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;">Регион:</td><td style="padding:6px 12px;">${offer.regions}</td></tr>
      <tr><td colspan="2" style="padding:12px;border-top:1px solid #ccc;"><strong>Контакты клиента</strong></td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;">Email:</td><td style="padding:6px 12px;">${lead.email}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;">Телефон:</td><td style="padding:6px 12px;">${lead.phone}</td></tr>
      <tr><td colspan="2" style="padding:12px;border-top:1px solid #ccc;"><strong>Техническое</strong></td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;">Дата:</td><td style="padding:6px 12px;">${lead.created_at || new Date().toISOString()}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;">URL страницы:</td><td style="padding:6px 12px;">${lead.page_url || '-'}</td></tr>
      <tr><td style="padding:6px 12px;font-weight:bold;">UTM:</td><td style="padding:6px 12px;">${lead.utm || '-'}</td></tr>
    </table>
  `;

    await transporter.sendMail({
        from: SMTP_FROM,
        to: ADMIN_EMAIL,
        subject,
        html
    });

    console.log(`[email] Уведомление о лиде отправлено на ${ADMIN_EMAIL}`);
}

module.exports = { sendLeadNotification };
