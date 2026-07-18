'use strict';

let analyticsFixFrame = 0;

function scheduleAnalyticsFixRender() {
  cancelAnimationFrame(analyticsFixFrame);
  analyticsFixFrame = requestAnimationFrame(() => {
    renderRetentionChart();
    renderPaybackChart();
    renderNpsResult();
  });
}

function fixRetentionValueAtMonth(month) {
  if (month <= 0) return 100;
  const model = ensureAnalyticsState().retention;
  return clamp(
    model.plateau + (model.firstMonth - model.plateau) * Math.exp(-(model.decay / 100) * (month - 1)),
    model.plateau,
    100,
  );
}

function fixPaybackSeries(monthlyContribution, horizon) {
  const values = [{ month: 0, cumulative: 0 }];
  let cumulative = 0;
  for (let month = 1; month <= horizon; month += 1) {
    cumulative += monthlyContribution * (fixRetentionValueAtMonth(month) / 100);
    values.push({ month, cumulative });
  }
  return values;
}

function fixFindPayback(values, cac) {
  if (cac <= 0) return 0;
  for (let index = 1; index < values.length; index += 1) {
    const previous = values[index - 1];
    const current = values[index];
    if (current.cumulative >= cac) {
      const intervalGain = current.cumulative - previous.cumulative;
      const fraction = intervalGain > 0 ? (cac - previous.cumulative) / intervalGain : 0;
      return previous.month + clamp(fraction, 0, 1);
    }
  }
  return Infinity;
}

renderPaybackChart = function renderPaybackChartFixed() {
  const container = el('paybackChart');
  const summary = el('paybackSummary');
  if (!container || !summary) return;

  const c = calculations();
  if (c.monthlyContributionPerCustomer <= 0) {
    container.innerHTML = `<div class="chart-empty"><div><strong>Окупаемость не строится</strong>Месячная маржа клиента равна нулю или отрицательна. Сначала исправьте цену, себестоимость или поддержку.</div></div>`;
    summary.innerHTML = `<div class="analytics-callout">Красная линия показывает CAC. Кривая накопленной маржи должна пересечь её снизу вверх; сейчас этого не происходит.</div>`;
    return;
  }

  const searchValues = fixPaybackSeries(c.monthlyContributionPerCustomer, 60);
  const payback = fixFindPayback(searchValues, c.cac);
  const horizon = Number.isFinite(payback)
    ? clamp(Math.max(12, Math.ceil(payback * 1.8)), 12, 36)
    : 36;
  const values = searchValues.slice(0, horizon + 1);

  // Фокусируем вертикальную шкалу на стоимости привлечения.
  // Так изменение CAC и маржи действительно меняет геометрию графика,
  // а линия не превращается каждый раз в одинаковую диагональ.
  const scaleTop = c.cac > 0
    ? Math.max(c.cac * 3, 1)
    : Math.max(c.monthlyContributionPerCustomer * 6, 1);

  const width = 720;
  const height = 290;
  const margin = { top: 30, right: 24, bottom: 42, left: 86 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const x = month => margin.left + (month / horizon) * plotWidth;
  const y = value => margin.top + (1 - clamp(value, 0, scaleTop) / scaleTop) * plotHeight;
  const points = values.map(item => ({ x: x(item.month), y: y(item.cumulative) }));
  const linePath = svgPath(points);
  const areaPath = `${linePath} L ${x(horizon)} ${y(0)} L ${x(0)} ${y(0)} Z`;

  const yTicks = [0, .25, .5, .75, 1].map(fraction => scaleTop * fraction);
  const horizontalGrid = yTicks.map(value => `
    <line class="chart-grid-line" x1="${margin.left}" y1="${y(value)}" x2="${width - margin.right}" y2="${y(value)}"></line>
    <text class="chart-axis-label" x="${margin.left - 10}" y="${y(value) + 4}" text-anchor="end">${compactMoney(value)}</text>`).join('');

  const xTicks = Array.from(new Set([0, Math.round(horizon / 4), Math.round(horizon / 2), Math.round(horizon * .75), horizon]));
  const verticalGrid = xTicks.map(month => `
    <line class="chart-grid-line" x1="${x(month)}" y1="${margin.top}" x2="${x(month)}" y2="${height - margin.bottom}"></line>
    <text class="chart-axis-label" x="${x(month)}" y="${height - 17}" text-anchor="middle">${month} мес.</text>`).join('');

  const thresholdY = y(c.cac);
  const markerVisible = Number.isFinite(payback) && payback <= horizon;
  const markerX = markerVisible ? x(payback) : 0;
  const markerY = markerVisible ? y(c.cac) : 0;

  container.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="График окупаемости CAC">
    <defs><linearGradient id="paybackAreaGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4263eb" stop-opacity=".22"></stop><stop offset="100%" stop-color="#4263eb" stop-opacity=".01"></stop></linearGradient></defs>
    ${horizontalGrid}${verticalGrid}
    <rect class="chart-threshold-band" x="${margin.left}" y="${thresholdY - 5}" width="${plotWidth}" height="10" rx="5"></rect>
    <text class="chart-axis-label" x="${width - margin.right}" y="${thresholdY - 11}" text-anchor="end">CAC: ${compactMoney(c.cac)}</text>
    <path class="chart-payback-area" d="${areaPath}"></path>
    <path class="chart-payback-line" d="${linePath}"></path>
    ${markerVisible ? `<line class="chart-marker-guide" x1="${markerX}" y1="${markerY}" x2="${markerX}" y2="${height - margin.bottom}"></line><circle class="chart-marker" cx="${markerX}" cy="${markerY}" r="6"><title>Окупаемость: ${number.format(payback)} мес.</title></circle><text class="chart-axis-label" x="${markerX + 9}" y="${markerY - 13}" text-anchor="start">${number.format(payback)} мес.</text>` : ''}
  </svg>`;

  summary.innerHTML = `<div class="analytics-summary-grid">
      <div class="analytics-summary-card"><span>Расход на привлечение</span><strong>${money.format(c.cac)}</strong></div>
      <div class="analytics-summary-card"><span>Маржа клиента в месяц</span><strong>${money.format(c.monthlyContributionPerCustomer)}</strong></div>
      <div class="analytics-summary-card"><span>Retention-adjusted payback</span><strong>${Number.isFinite(payback) ? `${number.format(payback)} мес.` : 'не достигнут'}</strong></div>
    </div>
    <div class="analytics-callout">Красная полоса — CAC. Синяя кривая учитывает спад retention. Шкала сфокусирована вокруг CAC, поэтому изменения ползунков теперь заметны, а значения выше трёх CAC визуально обрезаются верхней границей.</div>`;
};

function fixSyncNps(target) {
  const key = target.dataset.npsKey;
  if (!key || !npsDefinitions[key]) return;

  const nps = ensureAnalyticsState().nps;
  const value = clamp(Math.round(Number(target.value) || 0), 0, 500);
  nps[key] = value;

  document.querySelectorAll(`[data-nps-key="${key}"]`).forEach(linked => {
    if (linked !== target) linked.value = value;
  });

  saveAnalyticsState();
  renderNpsResult();
}

function fixSyncRetention(target) {
  const key = target.dataset.retentionKey;
  const definition = retentionDefinitions[key];
  if (!definition) return;

  const retention = ensureAnalyticsState().retention;
  retention[key] = clamp(Number(target.value), definition.min, definition.max);
  if (retention.plateau > retention.firstMonth) retention.plateau = retention.firstMonth;

  const range = el(`retention-range-${key}`);
  const numeric = el(`retention-input-${key}`);
  if (range && range !== target) range.value = retention[key];
  if (numeric && numeric !== target) numeric.value = retention[key];
  if (el('retention-range-plateau')) el('retention-range-plateau').value = retention.plateau;
  if (el('retention-input-plateau')) el('retention-input-plateau').value = retention.plateau;

  saveAnalyticsState();
  scheduleAnalyticsFixRender();
}

// Делегирование не зависит от того, перерисовались ли сами поля.
document.addEventListener('input', event => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;

  if (target.dataset.npsKey) {
    fixSyncNps(target);
    return;
  }

  if (target.dataset.retentionKey) {
    fixSyncRetention(target);
    return;
  }

  if (target.matches('.range, .value-input')) {
    window.setTimeout(scheduleAnalyticsFixRender, 0);
  }
}, true);

document.addEventListener('change', event => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  if (target.dataset.npsKey) fixSyncNps(target);
  if (target.dataset.retentionKey) fixSyncRetention(target);
}, true);

document.addEventListener('click', event => {
  if (event.target.closest('[data-product]')) {
    window.setTimeout(() => {
      renderRetentionControls();
      renderNpsInputs();
      scheduleAnalyticsFixRender();
    }, 0);
    return;
  }

  if (event.target.closest('[data-scenario], [data-asset], [data-custom-asset], [data-remove-custom], #resetButton')) {
    window.setTimeout(scheduleAnalyticsFixRender, 0);
  }
});

document.addEventListener('submit', event => {
  if (event.target.matches('#assetAddForm')) window.setTimeout(scheduleAnalyticsFixRender, 0);
});

// Любое обновление карточек метрик гарантированно перерисовывает графики.
const analyticsFixMetricsGrid = el('metricsGrid');
if (analyticsFixMetricsGrid) {
  const analyticsFixObserver = new MutationObserver(scheduleAnalyticsFixRender);
  analyticsFixObserver.observe(analyticsFixMetricsGrid, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

scheduleAnalyticsFixRender();
