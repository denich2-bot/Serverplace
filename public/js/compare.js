'use strict';

function loadCompare() {
    const ids = JSON.parse(localStorage.getItem('sp_compare') || '[]');
    if (ids.length === 0) {
        document.getElementById('compareEmpty').style.display = 'block';
        document.getElementById('compareTable').style.display = 'none';
        return;
    }

    document.getElementById('compareEmpty').style.display = 'none';
    document.getElementById('compareTable').style.display = 'block';

    Promise.all(ids.map(id => fetch('/api/offers/' + id).then(r => r.json())))
        .then(results => {
            const offers = results.map(r => r.offer).filter(Boolean);
            if (!offers.length) {
                document.getElementById('compareEmpty').style.display = 'block';
                document.getElementById('compareTable').style.display = 'none';
                return;
            }

            const rows = [
                { label: 'Провайдер', fn: o => o.provider_name },
                { label: 'Тариф', fn: o => o.name },
                { label: 'Обычная цена', fn: o => Math.round(o.market_price_month) + ' ₽' },
                { label: 'Цена по акции', fn: o => '<strong>' + Math.round(o.promo_price_month) + ' ₽</strong>' },
                { label: 'vCPU', fn: o => o.vcpu },
                { label: 'RAM', fn: o => o.ram_gb + ' ГБ' },
                { label: 'Диск', fn: o => (o.disk_system_type || 'ssd').toUpperCase() + ' ' + o.disk_system_size_gb + ' ГБ' },
                { label: 'CPU', fn: o => o.cpu_type + ' / ' + o.cpu_brand + ' ' + o.cpu_model },
                { label: 'Канал', fn: o => o.bandwidth_mbps >= 1000 ? (o.bandwidth_mbps / 1000) + ' Gbps' : o.bandwidth_mbps + ' Mbps' },
                { label: 'Трафик', fn: o => o.traffic_limit_tb + ' TB' },
                { label: 'SLA', fn: o => o.sla_percent + '%' },
                { label: 'Бесплатный тест', fn: o => o.free_trial_available ? o.free_trial_days + ' дней' : '—' },
                { label: 'Рейтинг', fn: o => '⭐ ' + (o.provider_rating || 0).toFixed(1) },
            ];

            let html = '<thead><tr><th></th>';
            offers.forEach(o => { html += '<th>' + o.provider_name + '<br><small>' + o.name + '</small></th>'; });
            html += '</tr></thead><tbody>';

            rows.forEach(row => {
                html += '<tr><td class="compare-label">' + row.label + '</td>';
                offers.forEach(o => { html += '<td>' + row.fn(o) + '</td>'; });
                html += '</tr>';
            });

            // Action row
            html += '<tr><td></td>';
            offers.forEach(o => {
                html += '<td><button class="btn btn--primary btn--sm" onclick="openLeadModal(\'' + o.provider_id + '\',\'' + o.id + '\',\'' + o.provider_name + '\',\'' + o.name + '\',\'' + Math.round(o.promo_price_month) + '\')">Заказать</button>';
                html += ' <button class="btn btn--ghost btn--xs" onclick="removeFromCompare(\'' + o.id + '\')">✕</button></td>';
            });
            html += '</tr></tbody>';

            document.getElementById('compareContent').innerHTML = html;
        });
}

function removeFromCompare(id) {
    let compare = JSON.parse(localStorage.getItem('sp_compare') || '[]');
    compare = compare.filter(x => x !== id);
    localStorage.setItem('sp_compare', JSON.stringify(compare));
    loadCompare();
}

function clearCompare() {
    localStorage.removeItem('sp_compare');
    loadCompare();
}

loadCompare();
