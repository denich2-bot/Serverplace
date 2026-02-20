'use strict';

let _currentPage = 1;

// Slider value display
function initSliders() {
  const sliders = [
    { id: 'cfg_vcpu', display: 'vcpuVal' },
    { id: 'cfg_ram', display: 'ramVal' },
    { id: 'cfg_disk_size', display: 'diskVal' }
  ];
  sliders.forEach(s => {
    const el = document.getElementById(s.id);
    const disp = document.getElementById(s.display);
    if (el && disp) {
      el.addEventListener('input', () => { disp.textContent = el.value; });
    }
  });
}

function getConfigParams() {
  const params = new URLSearchParams();
  const vcpu = document.getElementById('cfg_vcpu').value;
  const ram = document.getElementById('cfg_ram').value;
  const diskSize = document.getElementById('cfg_disk_size').value;
  const diskType = document.getElementById('cfg_disk_type').value;
  const cpuType = document.getElementById('cfg_cpu_type').value;
  const cpuBrand = document.getElementById('cfg_cpu_brand').value;
  const bandwidth = document.getElementById('cfg_bandwidth').value;
  const traffic = document.getElementById('cfg_traffic').value;
  const region = document.getElementById('cfg_region').value;
  const virt = document.getElementById('cfg_virt').value;
  const trial = document.getElementById('cfg_trial').checked;
  const ddos = document.getElementById('cfg_ddos').checked;
  const ipv4 = document.getElementById('cfg_ipv4').checked;
  const sort = document.getElementById('sortSelect').value;

  if (parseInt(vcpu) > 1) params.set('vcpu', vcpu);
  if (parseInt(ram) > 1) params.set('ram_gb', ram);
  if (parseInt(diskSize) > 20) params.set('disk_size_gb', diskSize);
  if (diskType !== 'any') params.set('disk_type', diskType);
  if (cpuType !== 'any') params.set('cpu_type', cpuType);
  if (cpuBrand !== 'any') params.set('cpu_brand', cpuBrand);
  if (bandwidth) params.set('bandwidth_mbps', bandwidth);
  if (traffic) params.set('traffic_limit_tb', traffic);
  if (region) params.set('region', region);
  if (virt !== 'any') params.set('virtualization', virt);
  if (trial) params.set('trial', 'true');
  if (ddos) params.set('ddos', 'true');
  if (ipv4) params.set('ipv4', 'true');
  params.set('sort', sort);
  params.set('page', _currentPage);
  params.set('limit', '20');
  return params;
}

function searchOffers(page) {
  _currentPage = page || 1;
  const params = getConfigParams();
  params.set('page', _currentPage);

  const list = document.getElementById('offersList');
  list.innerHTML = '<div class="results__loading">⏳ Поиск...</div>';

  fetch('/api/offers/search?' + params.toString())
    .then(r => r.json())
    .then(data => {
      document.getElementById('resultsSummary').innerHTML =
        `<p>Найдено: <strong>${data.total}</strong> предложений от <strong>${data.provider_count}</strong> провайдеров</p>`;

      if (!data.offers.length) {
        list.innerHTML = '<div class="results__empty"><p>По заданным параметрам ничего не найдено. Попробуйте расширить фильтры.</p></div>';
        document.getElementById('pagination').innerHTML = '';
        return;
      }

      list.innerHTML = data.offers.map(o => renderOfferCard(o)).join('');
      renderPagination(data.page, data.pages);
    })
    .catch(err => {
      list.innerHTML = '<div class="results__empty"><p>Ошибка загрузки: ' + err.message + '</p></div>';
    });
}

function renderOfferCard(o) {
  const hue = Math.abs((o.provider_slug || '').charCodeAt(0) * 37) % 360;
  const bwLabel = o.bandwidth_mbps >= 1000 ? (o.bandwidth_mbps / 1000) + ' Gbps' : o.bandwidth_mbps + ' Mbps';
  const regions = (Array.isArray(o.regions) ? o.regions : []).join(', ');

  return `
    <div class="offer-card">
      <div class="offer-card__provider">
        <div class="provider-logo" style="background:hsl(${hue},70%,60%)">${o.logo_hint_text || 'SP'}</div>
        <div>
          <a href="/providers/${o.provider_slug}" class="offer-card__provider-name">${o.provider_name}</a>
          <div class="offer-card__rating">⭐ ${(o.provider_rating || 0).toFixed(1)} <span>(${o.provider_rating_count || 0})</span></div>
        </div>
      </div>
      <div class="offer-card__info">
        <h3 class="offer-card__name"><a href="/offers/${o.id}">${o.name}</a></h3>
        <div class="offer-card__specs">
          <span class="spec-badge">${o.vcpu} vCPU</span>
          <span class="spec-badge">${o.ram_gb} ГБ RAM</span>
          <span class="spec-badge">${(o.disk_system_type || 'ssd').toUpperCase()} ${o.disk_system_size_gb} ГБ</span>
          <span class="spec-badge">${o.cpu_type} / ${o.cpu_brand}</span>
          <span class="spec-badge">${bwLabel}</span>
          <span class="spec-badge">${o.traffic_limit_tb} TB</span>
        </div>
        <div class="offer-card__flags">
          ${o.ipv4_included ? '<span class="badge">IPv4</span>' : ''}
          ${o.ddos_protection ? '<span class="badge badge--success">DDoS</span>' : ''}
          ${o.free_trial_available ? '<span class="badge badge--trial">Тест ' + o.free_trial_days + 'д</span>' : ''}
          <span class="badge badge--subtle">${regions}</span>
        </div>
      </div>
      <div class="offer-card__price">
        <span class="price-old">${Math.round(o.market_price_month)} ₽</span>
        <span class="price-promo">${Math.round(o.promo_price_month)} ₽/мес</span>
        <span class="badge badge--promo">−20%</span>
      </div>
      <div class="offer-card__actions">
        <button class="btn btn--primary btn--sm" onclick="openLeadModal('${o.provider_id}','${o.id}','${o.provider_name}','${o.name}','${Math.round(o.promo_price_month)}')">Заказать</button>
        <a href="/offers/${o.id}" class="btn btn--outline btn--sm">Подробнее</a>
        <button class="btn btn--ghost btn--sm" onclick="addToCompare('${o.id}')">⚖ Сравнить</button>
      </div>
    </div>
  `;
}

function renderPagination(current, total) {
  if (total <= 1) { document.getElementById('pagination').innerHTML = ''; return; }
  let html = '';
  for (let i = 1; i <= total; i++) {
    html += `<button class="pag-btn ${i === current ? 'pag-btn--active' : ''}" onclick="searchOffers(${i})">${i}</button>`;
  }
  document.getElementById('pagination').innerHTML = html;
}

function resetConfig() {
  document.getElementById('cfg_vcpu').value = 1;
  document.getElementById('cfg_ram').value = 1;
  document.getElementById('cfg_disk_size').value = 20;
  document.getElementById('cfg_disk_type').value = 'any';
  document.getElementById('cfg_cpu_type').value = 'any';
  document.getElementById('cfg_cpu_brand').value = 'any';
  document.getElementById('cfg_bandwidth').value = '';
  document.getElementById('cfg_traffic').value = '';
  document.getElementById('cfg_region').value = '';
  document.getElementById('cfg_virt').value = 'any';
  document.getElementById('cfg_trial').checked = false;
  document.getElementById('cfg_ddos').checked = false;
  document.getElementById('cfg_ipv4').checked = true;
  document.getElementById('vcpuVal').textContent = '1';
  document.getElementById('ramVal').textContent = '1';
  document.getElementById('diskVal').textContent = '20';
  searchOffers();
}

// Compare functionality (localStorage)
function addToCompare(offerId) {
  let compare = JSON.parse(localStorage.getItem('sp_compare') || '[]');
  if (compare.length >= 6) {
    alert('Максимум 6 предложений для сравнения');
    return;
  }
  if (compare.includes(offerId)) {
    alert('Уже добавлено в сравнение');
    return;
  }
  compare.push(offerId);
  localStorage.setItem('sp_compare', JSON.stringify(compare));
  alert('Добавлено в сравнение (' + compare.length + '/6)');
}

// ─── Debounce helper ───
let _debounceTimer = null;
function debouncedSearch() {
  clearTimeout(_debounceTimer);
  _debounceTimer = setTimeout(function () { searchOffers(); }, 300);
}

// ─── Auto-search on parameter change ───
function initAutoSearch() {
  // Sliders: debounced (fires often while dragging)
  ['cfg_vcpu', 'cfg_ram', 'cfg_disk_size'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('input', debouncedSearch);
  });

  // Selects: immediate search on change
  ['cfg_cpu_type', 'cfg_cpu_brand', 'cfg_disk_type', 'cfg_bandwidth',
    'cfg_traffic', 'cfg_region', 'cfg_virt'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('change', function () { searchOffers(); });
    });

  // Checkboxes: immediate search on change
  ['cfg_trial', 'cfg_ddos', 'cfg_ipv4'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('change', function () { searchOffers(); });
  });
}

// Init
initSliders();
initAutoSearch();
searchOffers();
