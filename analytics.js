'use strict';

const analyticsStorageKey = 'unitlab-customer-analytics-v1';

const retentionPresets = {
  saas: { firstMonth: 82, decay: 10, plateau: 24, horizon: 24 },
  mobile: { firstMonth: 72, decay: 14, plateau: 12, horizon: 24 },
  marketplace: { firstMonth: 76, decay: 11, plateau: 20, horizon: 24 },
  course: { firstMonth: 91, decay: 8, plateau: 36, horizon: 18 },
  school: { firstMonth: 94, decay: 6, plateau: 48, horizon: 18 },
  offlineSchool: { firstMonth: 90, decay: 7, plateau: 42, horizon: 18 },
  ecommerce: { firstMonth: 58, decay: 18, plateau: 8, horizon: 18 },
  coffee: { firstMonth: 66, decay: 16, plateau: 14, horizon: 18 },
  service: { firstMonth: 64, decay: 17, plateau: 10, horizon: 18 },
  agency: { firstMonth: 88, decay: 7, plateau: 44, horizon: 24 },
};

const retentionDefinitions = {
  firstMonth: {
    label: 'Retention после первого месяца', min: 5, max: 100, step: 1, suffix: '%',
    tooltip: 'Какая доля исходной когорты остаётся активной после первого месяца. Резкий первый спад часто отражает плохой onboarding или несоответствие ожиданий.',
  },
  decay: {
    label: 'Скорость дальнейшего спада', min: 0, max: 35, step: 0.5, suffix: '%',
    tooltip: 'Насколько быстро кривая приближается к плато. Чем выше значение, тем быстрее уходят оставшиеся клиенты.',
  },
  plateau: {
    label: 'Долгосрочное плато', min: 0, max: 80, step: 1, suffix: '%',
    tooltip: 'Доля когорты, которая продолжает пользоваться продуктом в долгосрочной перспективе. Плато выше нуля означает наличие устойчивого ядра пользователей.',
  },
  horizon: {
    label: 'Горизонт наблюдения', min: 6, max: 36, step: 1, suffix: ' мес.',
    tooltip: 'Сколько месяцев показывать на графике. Это не прогноз с гарантией, а сценарная модель.',
  },
};

function defaultAnalyticsForProduct(product) {
  return {
    retention: { ...(retentionPresets[product] || { firstMonth: 72, decay: 12, plateau: 16, horizon: 24 }) },
    nps: { detractors: 28, passives: 26, promoters: 46 },
  };
}

function loadAnalyticsState() {
  try {
    const stored = JSON.parse(localStorage.getItem(analyticsStorageKey));
    if (stored && typeof stored === 'object' && stored.byProduct) return stored;
  } catch (error) {
    console.warn('Не удалось восстановить retention и NPS', error);
  }
  return { byProduct: {} };
}

let analyticsState = loadAnalyticsState();

function ensureAnalyticsState() {
  if (!analyticsState.byProduct[state.product]) analyticsState.byProduct[state.product] = defaultAnalyticsForProduct(state.product);
  const defaults = defaultAnalyticsForProduct(state.product);
  const model = analyticsState.byProduct[state.product];
  model.retention = { ...defaults.retention, ...(model.retention || {}) };
  model.nps = { ...defaults.nps, ...(model.nps || {}) };
  return model;
}

function saveAnalyticsState() {
  localStorage.setItem(analyticsStorageKey, JSON.stringify(analyticsState));
}

function formatAnalyticsValue(key, value) {
  return retentionDefinitions[key].suffix === '%' ? `${number.format(value)}%` : `${number.format(value)} мес.`;
}

function retentionControlMarkup(key, value) {
  const definition = retentionDefinitions[key];
  return `<div class="analytics-control">
    <div class="analytics-control-head">
      <div class="analytics-control-label">
        <label for="retention-range-${key}">${definition.label}</label>
        <span class="help" tabindex="0" data-tooltip="${definition.tooltip}">?</span>
      </div>
      <input class="analytics-value" id="retention-input-${key}" data-retention-key="${key}" type="number" min="${definition.min}" max="${definition.max}" step="${definition.step}" value="${value}" />
    </div>
    <div class="analytics-range-row">
      <input class="analytics-range" id="retention-range-${key}" data-retention-key="${key}" type="range" min="${definition.min}" max="${definition.max}" step="${definition.step}" value="${value}" />
      <span class="analytics-limit">до ${formatAnalyticsValue(key, definition.max)}</span>
    </div>
  </div>`;
}

function renderRetentionControls() {
  const container = el('retentionControls');
  if (!container) return;
  const model = ensureAnalyticsState();
  container.innerHTML = Object.keys(retentionDefinitions).map(key => retentionControlMarkup(key, model.retention[key])).join('');

  container.querySelectorAll('[data-retention-key]').forEach(input => {
    input.addEventListener('input', event => {
      const key = event.target.dataset.retentionKey;
      const definition = retentionDefinitions[key];
      const value = clamp(Number(event.target.value), definition.min, definition.max);
      model.retention[key] = value;
      const range = el(`retention-range-${key}`);
      const numeric = el(`retention-input-${key}`);
      if (range && range !== event.target) range.value = value;
      if (numeric && numeric !== event.target) numeric.value = value;

      if (model.retention.plateau > model.retention.firstMonth) {
        model.retention.plateau = model.retention.firstMonth;
        if (el('retention-range-plateau')) el('retention-range-plateau').value = model.retention.plateau;
        if (el('retention-input-plateau')) el('retention-input-plateau').value = model.retention.plateau;
      }
      saveAnalyticsState();
      renderCustomerAnalytics();
    });
  });
}

function retentionSeries() {
  const { firstMonth, decay, plateau, horizon } = ensureAnalyticsState().retention;
  const values = [{ month: 0, retention: 100 }];
  for (let month = 1; month <= horizon; month += 1) {
    const retention = plateau + (firstMonth - plateau) * Math.exp(-(decay / 100) * (month - 1));
    values.push({ month, retention: clamp(retention, plateau, 100) });
  }
  return values;
}

function svgPath(points) {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
}

function renderRetentionChart() {
  const container = el('retentionChart');
  const summary = el('retentionSummary');
  if (!container || !summary) return;

  const values = retentionSeries();
  const model = ensureAnalyticsState().retention;
  const width = 720;
  const height = 290;
  const margin = { top: 24, right: 22, bottom: 42, left: 48 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const x = month => margin.left + (month / model.horizon) * plotWidth;
  const y = retention => margin.top + ((100 - retention) / 100) * plotHeight;
  const points = values.map(item => ({ x: x(item.month), y: y(item.retention) }));
  const linePath = svgPath(points);
  const areaPath = `${linePath} L ${x(model.horizon)} ${y(0)} L ${x(0)} ${y(0)} Z`;
  const horizontalGrid = [0, 25, 50, 75, 100].map(value => `
    <line class="chart-grid-line" x1="${margin.left}" y1="${y(value)}" x2="${width - margin.right}" y2="${y(value)}"></line>
    <text class="chart-axis-label" x="${margin.left - 10}" y="${y(value) + 4}" text-anchor="end">${value}%</text>`).join('');
  const xTicks = Array.from(new Set([0, Math.round(model.horizon / 4), Math.round(model.horizon / 2), Math.round(model.horizon * .75), model.horizon]));
  const verticalGrid = xTicks.map(month => `
    <line class="chart-grid-line" x1="${x(month)}" y1="${margin.top}" x2="${x(month)}" y2="${height - margin.bottom}"></line>
    <text class="chart-axis-label" x="${x(month)}" y="${height - 17}" text-anchor="middle">${month} мес.</text>`).join('');

  container.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Retention-кривая на ${model.horizon} месяцев">
    <defs><linearGradient id="retentionAreaGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4263eb" stop-opacity=".25"></stop><stop offset="100%" stop-color="#4263eb" stop-opacity=".02"></stop></linearGradient></defs>
    ${horizontalGrid}${verticalGrid}
    <line class="chart-plateau-line" x1="${margin.left}" y1="${y(model.plateau)}" x2="${width - margin.right}" y2="${y(model.plateau)}"></line>
    <text class="chart-axis-label" x="${width - margin.right}" y="${y(model.plateau) - 7}" text-anchor="end">плато ${number.format(model.plateau)}%</text>
    <path class="chart-area" d="${areaPath}"></path>
    <path class="chart-main-line" d="${linePath}"></path>
    ${points.map((point, index) => index % Math.max(1, Math.round(model.horizon / 6)) === 0 || index === points.length - 1 ? `<circle cx="${point.x}" cy="${point.y}" r="4" fill="#fff" stroke="#4263eb" stroke-width="3"><title>${values[index].month} мес.: ${number.format(values[index].retention)}%</title></circle>` : '').join('')}
  </svg>`;

  const month12 = values[Math.min(12, values.length - 1)].retention;
  const retainedMonths = values.slice(1).reduce((sum, item) => sum + item.retention / 100, 0);
  const currentLifetime = calculations().lifetime;
  summary.innerHTML = `<div class="analytics-summary-grid">
      <div class="analytics-summary-card"><span>Retention на 12-м месяце</span><strong>${number.format(month12)}%</strong></div>
      <div class="analytics-summary-card"><span>Удержанные клиент-месяцы</span><strong>${number.format(retainedMonths)}</strong></div>
      <div class="analytics-summary-card"><span>LTV использует срок жизни</span><strong>${number.format(currentLifetime)} мес.</strong></div>
    </div>
    <div class="analytics-callout">Кривая — сценарная проверка здравого смысла. Она пока не заменяет введённый срок жизни в формуле LTV, а помогает увидеть, насколько реалистично удержание.</div>`;
}

function compactMoney(value) {
  const absolute = Math.abs(value);
  if (absolute >= 1000000) return `${number.format(value / 1000000)} млн ₽`;
  if (absolute >= 1000) return `${number.format(value / 1000)} тыс. ₽`;
  return money.format(value);
}

function renderPaybackChart() {
  const container = el('paybackChart');
  const summary = el('paybackSummary');
  if (!container || !summary) return;
  const c = calculations();

  if (c.monthlyContributionPerCustomer <= 0) {
    container.innerHTML = `<div class="chart-empty"><div><strong>Окупаемость не строится</strong>Месячная маржа клиента равна нулю или отрицательна. Сначала исправьте цену, себестоимость или поддержку.</div></div>`;
    summary.innerHTML = `<div class="analytics-callout">Красная линия показывает CAC. Кривая накопленной маржи должна пересечь её снизу вверх; сейчас этого не происходит.</div>`;
    return;
  }

  const payback = c.cac > 0 ? c.cac / c.monthlyContributionPerCustomer : 0;
  const horizon = clamp(Math.max(12, Math.ceil((Number.isFinite(payback) ? payback : 12) * 1.6)), 12, 36);
  const values = Array.from({ length: horizon + 1 }, (_, month) => ({ month, cumulative: c.monthlyContributionPerCustomer * month }));
  const maxValue = Math.max(c.cac * 1.18, values[values.length - 1].cumulative, 1);
  const width = 720;
  const height = 290;
  const margin = { top: 28, right: 24, bottom: 42, left: 64 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const x = month => margin.left + (month / horizon) * plotWidth;
  const y = value => margin.top + (1 - value / maxValue) * plotHeight;
  const points = values.map(item => ({ x: x(item.month), y: y(item.cumulative) }));
  const linePath = svgPath(points);
  const areaPath = `${linePath} L ${x(horizon)} ${y(0)} L ${x(0)} ${y(0)} Z`;
  const yTicks = [0, .25, .5, .75, 1].map(fraction => maxValue * fraction);
  const horizontalGrid = yTicks.map(value => `
    <line class="chart-grid-line" x1="${margin.left}" y1="${y(value)}" x2="${width - margin.right}" y2="${y(value)}"></line>
    <text class="chart-axis-label" x="${margin.left - 10}" y="${y(value) + 4}" text-anchor="end">${compactMoney(value)}</text>`).join('');
  const xTicks = Array.from(new Set([0, Math.round(horizon / 4), Math.round(horizon / 2), Math.round(horizon * .75), horizon]));
  const verticalGrid = xTicks.map(month => `
    <line class="chart-grid-line" x1="${x(month)}" y1="${margin.top}" x2="${x(month)}" y2="${height - margin.bottom}"></line>
    <text class="chart-axis-label" x="${x(month)}" y="${height - 17}" text-anchor="middle">${month} мес.</text>`).join('');
  const thresholdY = y(c.cac);
  const markerX = x(clamp(payback, 0, horizon));
  const markerY = y(c.cac);

  container.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="График окупаемости CAC">
    <defs><linearGradient id="paybackAreaGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4263eb" stop-opacity=".2"></stop><stop offset="100%" stop-color="#4263eb" stop-opacity=".01"></stop></linearGradient></defs>
    ${horizontalGrid}${verticalGrid}
    <rect class="chart-threshold-band" x="${margin.left}" y="${thresholdY - 5}" width="${plotWidth}" height="10" rx="5"></rect>
    <text class="chart-axis-label" x="${width - margin.right}" y="${thresholdY - 11}" text-anchor="end">CAC: ${compactMoney(c.cac)}</text>
    <path class="chart-payback-area" d="${areaPath}"></path>
    <path class="chart-payback-line" d="${linePath}"></path>
    ${Number.isFinite(payback) && payback <= horizon ? `<line class="chart-marker-guide" x1="${markerX}" y1="${markerY}" x2="${markerX}" y2="${height - margin.bottom}"></line><circle class="chart-marker" cx="${markerX}" cy="${markerY}" r="6"><title>Окупаемость: ${number.format(payback)} мес.</title></circle><text class="chart-axis-label" x="${markerX}" y="${markerY - 13}" text-anchor="middle">окупаемость ${number.format(payback)} мес.</text>` : ''}
  </svg>`;

  summary.innerHTML = `<div class="analytics-summary-grid">
      <div class="analytics-summary-card"><span>Расход на привлечение</span><strong>${money.format(c.cac)}</strong></div>
      <div class="analytics-summary-card"><span>Маржа клиента в месяц</span><strong>${money.format(c.monthlyContributionPerCustomer)}</strong></div>
      <div class="analytics-summary-card"><span>Пересечение линий</span><strong>${Number.isFinite(payback) ? `${number.format(payback)} мес.` : 'не достигнуто'}</strong></div>
    </div>
    <div class="analytics-callout">Красная полоса — сумма CAC, которую нужно вернуть. Синяя линия — накопленная маржинальная прибыль клиента. После пересечения клиент начинает создавать ценность сверх стоимости привлечения.</div>`;
}

const npsDefinitions = {
  detractors: { label: 'Критики', range: '0–6', color: '#d85b5b', tooltip: 'Недовольные или разочарованные респонденты. Они могут оставлять негативные отзывы и отговаривать других.' },
  passives: { label: 'Нейтральные', range: '7–8', color: '#d6a02f', tooltip: 'Скорее удовлетворены, но не настолько лояльны, чтобы активно рекомендовать продукт. В формулу NPS напрямую не входят.' },
  promoters: { label: 'Промоутеры', range: '9–10', color: '#249675', tooltip: 'Очень довольные и лояльные респонденты, которые с большей вероятностью рекомендуют продукт другим.' },
};

function renderNpsInputs() {
  const container = el('npsInputs');
  if (!container) return;
  const nps = ensureAnalyticsState().nps;
  container.innerHTML = Object.entries(npsDefinitions).map(([key, definition]) => `<div class="nps-row">
      <div class="nps-row-label"><span class="nps-dot" style="background:${definition.color}"></span><div><strong>${definition.label} · ${definition.range}</strong><small>${definition.tooltip}</small></div></div>
      <input class="nps-range" data-nps-key="${key}" type="range" min="0" max="500" step="1" value="${nps[key]}" style="accent-color:${definition.color}" />
      <input class="nps-number" data-nps-key="${key}" type="number" min="0" max="500" step="1" value="${nps[key]}" aria-label="Количество: ${definition.label}" />
    </div>`).join('');

  container.querySelectorAll('[data-nps-key]').forEach(input => {
    input.addEventListener('input', event => {
      const key = event.target.dataset.npsKey;
      const value = clamp(Math.round(Number(event.target.value) || 0), 0, 500);
      nps[key] = value;
      container.querySelectorAll(`[data-nps-key="${key}"]`).forEach(linked => { if (linked !== event.target) linked.value = value; });
      saveAnalyticsState();
      renderNpsResult();
    });
  });
}

function renderNpsResult() {
  const scale = el('npsScale');
  const result = el('npsResult');
  if (!scale || !result) return;
  scale.innerHTML = Array.from({ length: 11 }, (_, score) => {
    const category = score <= 6 ? 'detractor' : score <= 8 ? 'passive' : 'promoter';
    return `<span class="nps-score-box ${category}">${score}</span>`;
  }).join('');

  const nps = ensureAnalyticsState().nps;
  const total = nps.detractors + nps.passives + nps.promoters;
  const detractorShare = total > 0 ? nps.detractors / total * 100 : 0;
  const passiveShare = total > 0 ? nps.passives / total * 100 : 0;
  const promoterShare = total > 0 ? nps.promoters / total * 100 : 0;
  const score = Math.round(promoterShare - detractorShare);
  let label = 'Нет данных';
  let explanation = 'Добавьте ответы, чтобы рассчитать индекс.';
  if (total > 0 && score < 0) {
    label = 'Негативный';
    explanation = 'Критиков больше, чем промоутеров. Стоит искать повторяющиеся причины неудовлетворённости.';
  } else if (score < 30) {
    label = 'Требует работы';
    explanation = 'Промоутеров больше, но запас лояльности пока невелик.';
  } else if (score < 50) {
    label = 'Хороший';
    explanation = 'Лояльная аудитория заметно перевешивает критиков.';
  } else {
    label = 'Сильный';
    explanation = 'Промоутеров значительно больше, чем критиков. Проверьте результат на достаточной и честно собранной выборке.';
  }

  result.innerHTML = `<div class="nps-score-card"><span>NPS</span><strong>${total > 0 ? score : '—'}</strong><small>${label}</small></div>
    <div class="nps-breakdown">
      <div class="nps-stacked-bar" aria-label="Распределение NPS-ответов"><span style="width:${detractorShare}%;background:${npsDefinitions.detractors.color}"></span><span style="width:${passiveShare}%;background:${npsDefinitions.passives.color}"></span><span style="width:${promoterShare}%;background:${npsDefinitions.promoters.color}"></span></div>
      <div class="analytics-summary-grid"><div class="analytics-summary-card"><span>Критики</span><strong>${number.format(detractorShare)}%</strong></div><div class="analytics-summary-card"><span>Нейтральные</span><strong>${number.format(passiveShare)}%</strong></div><div class="analytics-summary-card"><span>Промоутеры</span><strong>${number.format(promoterShare)}%</strong></div></div>
      <div class="nps-formula"><strong>NPS = % промоутеров − % критиков</strong><br><span>Нейтральные участвуют в общем числе ответов, но не прибавляются и не вычитаются напрямую.</span></div>
      <div class="nps-interpretation">${explanation} NPS не доказывает прибыльность сам по себе и не должен автоматически подставляться в LTV — это отдельный сигнал клиентской лояльности.</div>
    </div>`;
}

function renderCustomerAnalytics() {
  ensureAnalyticsState();
  renderRetentionChart();
  renderPaybackChart();
  renderNpsResult();
}

function getAnalyticsExportData() {
  return JSON.parse(JSON.stringify(ensureAnalyticsState()));
}

const baseUpdateResultsForAnalytics = updateResults;
updateResults = function updateResultsWithCustomerAnalytics() {
  baseUpdateResultsForAnalytics();
  renderCustomerAnalytics();
};

const baseLoadProductForAnalytics = loadProduct;
loadProduct = function loadProductWithCustomerAnalytics(key, fromStorage = false) {
  baseLoadProductForAnalytics(key, fromStorage);
  ensureAnalyticsState();
  renderRetentionControls();
  renderNpsInputs();
  renderCustomerAnalytics();
};

el('resetButton').addEventListener('click', () => {
  analyticsState.byProduct[state.product] = defaultAnalyticsForProduct(state.product);
  saveAnalyticsState();
  renderRetentionControls();
  renderNpsInputs();
  renderCustomerAnalytics();
});

ensureAnalyticsState();
renderRetentionControls();
renderNpsInputs();
renderCustomerAnalytics();
