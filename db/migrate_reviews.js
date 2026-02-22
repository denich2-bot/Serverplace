'use strict';

/**
 * Скрипт миграции: замена демо-текстов отзывов на реалистичные экспертные отзывы.
 * Генерирует уникальный текст для каждого отзыва на основе роли, use_case, рейтинга и pros/cons.
 * 
 * Запуск: node db/migrate_reviews.js
 */

const fs = require('fs');
const path = require('path');

const REVIEWS_PATH = path.join(__dirname, '..', 'demo_data', 'reviews.json');

// ─── Пул текстов по типам ───

// Короткие отзывы (1-2 предложения) — ~30% отзывов
const shortTexts = [
    'Норм.',
    'Всё ок, работает стабильно.',
    'Пашет, не жалуюсь.',
    'Для наших задач — самое то.',
    'Ок, рекомендую.',
    'Работает, проблем не было.',
    'Пользуемся полгода — ни одного инцидента.',
    'Зашло. Буду продлевать.',
    'Адекватный хостинг за свои деньги.',
    'В целом нормально, без сюрпризов.',
    'Рабочая лошадка.',
    'Делает что должен. Без нареканий.',
    'Тариф окупается, даунтайма не было.',
    'Подняли инфру за вечер, всё сразу заработало.',
    'Нормально для dev-окружения.',
    'Быстро, дёшево, работает — что ещё надо.',
    'Стабильно, поддержка адекватная.',
    'Сеть ровная, диски быстрые.',
    'Без косяков, всё по делу.',
    'Сервер не подводил ни разу за 4 месяца.',
    'Годнота.',
    'Берите, не пожалеете.',
    'Всё четко, без лишнего.',
    'Для стейджинга — идеально.',
    'Железо бодрое, панель удобная.',
];

// Средние отзывы (2-3 предложения) — ~40%
const mediumTemplates = [
    'Перевели сюда {use_case_acc} около {months} назад. {pro_sentence} {con_sentence}',
    'Используем для {use_case_gen} уже {months}. {pro_sentence} В остальном — рабочий вариант.',
    '{pro_sentence} Для {use_case_gen} хватает с запасом. {con_sentence}',
    'Мигрировали с другого провайдера {months} назад. {pro_sentence} {con_sentence}',
    'Взяли сервер под {use_case_acc}. {pro_sentence} Пока всё устраивает.',
    'Арендуем {months}. {pro_sentence} Цена адекватная для такой конфигурации.',
    'Подняли тут {use_case_acc}, гоняем нагрузку — справляется. {con_sentence}',
    '{pro_sentence} Саппорт реально помогает, а не отписывается шаблонами. {maybe_con}',
    'Держим здесь {use_case_acc} на продакшене. {pro_sentence} {con_sentence}',
    'Тестировали неделю, потом перенесли прод. {pro_sentence} Результатом довольны.',
    'Нормальный провайдер для {use_case_gen}. {pro_sentence} {maybe_con}',
    '{pro_sentence} Сетевые метрики стабильные, jitter минимальный. {con_sentence}',
    'Коллега посоветовал, взял — не пожалел. {pro_sentence} Работает как часы.',
    'Сервер под {use_case_acc}. {pro_sentence} По соотношению цена/производительность — топ.',
    'Переехали сюда после проблем с прошлым хостингом. {pro_sentence} {maybe_con}',
];

// Длинные экспертные отзывы (3-5 предложений) — ~30%
const longTemplates = [
    'Используем для {use_case_gen} в продакшене уже {months}. {pro_sentence} Мониторим через Prometheus + Grafana: аптайм {uptime}%, latency p99 стабильно в пределах нормы. {con_sentence} В целом — один из лучших вариантов в этом ценовом сегменте.',
    'Развернули кластер под {use_case_acc}, нагрузка ~{load} RPS в пике. {pro_sentence} За {months} использования серьёзных инцидентов не было, мелкие вопросы саппорт решал оперативно. {con_sentence} Рекомендую для production-нагрузок.',
    'Начали с одного сервера под {use_case_acc}, сейчас уже {servers_count} штук. {pro_sentence} Ни разу не было ситуации, чтобы вся инфра легла одновременно. {con_sentence} Для нашего стека (Docker + {stack}) — отличный вариант.',
    'Тестировали 3 провайдера перед выбором. Этот выиграл по совокупности: {pro_sentence} {con_sentence} Сеть стабильная, каналы не зажимают, реальная полоса совпадает с заявленной. Аптайм за {months} — {uptime}%.',
    'Перевели сюда {use_case_acc} после даунтайма у прошлого провайдера. {pro_sentence} Миграция прошла гладко, ребята из саппорта помогли с настройкой DNS и firewall. {con_sentence} Если бы ещё панель обновили — было бы вообще идеально.',
    'Как {role_low} с {experience}-летним опытом скажу: хостинг рабочий. {pro_sentence} В своём ценовом сегменте один из лучших для {use_case_gen}. {con_sentence} Если нужна стабильность без переплаты — берите.',
    'Держим здесь {servers_count} серверов под {use_case_acc}. {pro_sentence} I/O диска — {iops}+ IOPS на синтетике, в реальной нагрузке тоже хорошо. {con_sentence} За {months} только один раз была плановая работа ночью, предупредили заранее.',
    'Пришли по рекомендации коллег из {role_low}-комьюнити. {pro_sentence} Настроили мониторинг, за {months} аптайм — {uptime}%. {con_sentence} Для {use_case_gen} — рабочий вариант, рекомендую.',
];

// ─── Вспомогательные данные ───

const useCaseAcc = {
    'тестовые стенды': 'тестовые стенды',
    'микросервисы': 'микросервисы',
    'боты и парсинг': 'ботов и парсинг',
    'хостинг сайта': 'хостинг сайтов',
    'аналитика и ETL': 'аналитику и ETL-пайплайны',
    'VPN/прокси': 'VPN и прокси',
    'CI/CD': 'CI/CD пайплайны',
    '1С и CRM': '1С и CRM',
};

const useCaseGen = {
    'тестовые стенды': 'тестовых стендов',
    'микросервисы': 'микросервисов',
    'боты и парсинг': 'ботов и парсинга',
    'хостинг сайта': 'хостинга сайтов',
    'аналитика и ETL': 'аналитики и ETL',
    'VPN/прокси': 'VPN и прокси-сервисов',
    'CI/CD': 'CI/CD',
    '1С и CRM': '1С и CRM-систем',
};

const proSentences = {
    'Быстрые NVMe, много IOPS': 'Диски реально быстрые — NVMe выдают заявленные IOPS без просадок.',
    'Удобная панель и API': 'Панель управления удобная, API документирован нормально.',
    'Поддержка отвечает по делу': 'Саппорт отвечает по делу, без отписок.',
    'Стабильная сеть, пинги ровные': 'Сеть стабильная, пинги ровные, пакетлосс нулевой.',
    'Хорошие лимиты трафика': 'Лимиты трафика щедрые, хватает с запасом.',
    'Нормальная цена за ресурсы': 'Ценник адекватный за такую конфигурацию.',
};

const conSentences = {
    'UI панели местами перегружен': 'Панель местами тормозит и перегружена — можно бы упростить.',
    'Не хватает готовых образов': 'Хотелось бы больше готовых образов ОС и приложений.',
    'Хотелось бы чат поддержки 24/7': 'Не хватает круглосуточного чата — тикеты иногда ждёшь.',
    'Пара раз были работы ночью': 'Было пару плановых работ ночью, но предупреждали.',
    'Иногда долго подтверждают платежи': 'Оплата иногда зависает на подтверждении — раздражает.',
    'Хотелось бы больше бесплатного трафика': 'Бесплатный трафик можно было бы и побольше.',
};

const stacks = ['Kubernetes', 'Docker Swarm', 'Ansible', 'Terraform', 'Nginx + PHP-FPM', 'PostgreSQL', 'Redis + Node.js', 'GitLab CI', 'Jenkins', 'Prometheus'];
const monthsOptions = ['3 месяца', 'полгода', '4 месяца', '8 месяцев', 'год', 'пару месяцев', '5 месяцев', '7 месяцев', '9 месяцев', '10 месяцев'];

function pick(arr, seed) {
    return arr[Math.abs(seed) % arr.length];
}

function hashStr(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = ((h << 5) - h) + s.charCodeAt(i);
        h = h & h;
    }
    return Math.abs(h);
}

function generateReviewText(review) {
    const seed = hashStr(review.id);
    const rating = review.rating || 4;
    const role = review.user_role || 'Сисадмин';
    const useCase = review.use_case || 'хостинг сайта';
    const pros = Array.isArray(review.pros) ? review.pros : [];
    const cons = Array.isArray(review.cons) ? review.cons : [];

    // Определяем тип отзыва: короткий/средний/длинный
    const typeRoll = seed % 100;
    let text;

    if (typeRoll < 30) {
        // Короткий отзыв
        text = pick(shortTexts, seed);
    } else if (typeRoll < 70) {
        // Средний отзыв
        let template = pick(mediumTemplates, seed + 1);
        text = fillTemplate(template, review, seed);
    } else {
        // Длинный экспертный отзыв
        let template = pick(longTemplates, seed + 2);
        text = fillTemplate(template, review, seed);
    }

    return text;
}

function fillTemplate(template, review, seed) {
    const useCase = review.use_case || 'хостинг сайта';
    const role = review.user_role || 'Сисадмин';
    const pros = Array.isArray(review.pros) ? review.pros : [];
    const cons = Array.isArray(review.cons) ? review.cons : [];

    const proText = pros.length > 0 ? (proSentences[pros[0]] || pros[0] + '.') : 'Работает стабильно.';
    const conText = cons.length > 0 ? (conSentences[cons[0]] || cons[0] + '.') : '';
    const maybeCon = (seed % 3 === 0 && conText) ? conText : '';

    const months = pick(monthsOptions, seed + 3);
    const uptime = (99.5 + (seed % 5) * 0.1).toFixed(1);
    const load = pick(['500', '1200', '2000', '800', '3000', '1500', '700', '4000'], seed + 4);
    const servers = pick(['3', '5', '4', '7', '2', '6', '8', '10'], seed + 5);
    const stack = pick(stacks, seed + 6);
    const iops = pick(['30000', '50000', '45000', '60000', '25000', '40000', '55000'], seed + 7);
    const experience = pick(['5', '7', '10', '8', '12', '6', '15', '3'], seed + 8);

    let text = template
        .replace('{use_case_acc}', useCaseAcc[useCase] || useCase)
        .replace('{use_case_gen}', useCaseGen[useCase] || useCase)
        .replace(/{months}/g, months)
        .replace('{pro_sentence}', proText)
        .replace('{con_sentence}', conText)
        .replace('{maybe_con}', maybeCon)
        .replace('{uptime}', uptime)
        .replace('{load}', load)
        .replace('{servers_count}', servers)
        .replace('{stack}', stack)
        .replace('{iops}', iops)
        .replace('{role_low}', role.toLowerCase())
        .replace('{experience}', experience);

    // Убрать двойные пробелы
    text = text.replace(/\s{2,}/g, ' ').trim();

    return text;
}

// ─── Main ───
const reviews = JSON.parse(fs.readFileSync(REVIEWS_PATH, 'utf-8'));

console.log(`[migrate] Обработка ${reviews.length} отзывов...`);

let changed = 0;
for (const r of reviews) {
    if (r.text && r.text.includes('Демо')) {
        r.text = generateReviewText(r);
        changed++;
    }
}

fs.writeFileSync(REVIEWS_PATH, JSON.stringify(reviews, null, 2), 'utf-8');
console.log(`[migrate] Обновлено ${changed} отзывов из ${reviews.length}`);
console.log('[migrate] Файл reviews.json перезаписан');
console.log('[migrate] Запустите npm run seed чтобы обновить БД');
