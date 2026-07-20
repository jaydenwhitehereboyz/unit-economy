'use strict';

(() => {
  if (window.__unitLabDashboardAnalyticsLoaded) return;
  window.__unitLabDashboardAnalyticsLoaded = true;

  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = 'dashboard-analytics.css?v=1';
  document.head.appendChild(style);

  const parameterMeta = {
    activeCustomers: { label: 'Активные клиенты', short: 'клиенты', favorable: 'up' },
    price: { label: 'Средний чек', short: 'чек', favorable: 'up' },
    purchases: { label: 'Частота покупок', short: 'покупки', favorable: 'up' },
    leads: { label: 'Лиды', short: 'лиды', favorable: 'up' },
    conversion: { label: 'Конверсия', short: 'конверсия', favorable: 'up' },
    marketingSpend: { label: 'Маркетинговый бюджет', short: 'реклама', favorable: 'down' },
    salesSpend: { label: 'Расходы на продажи', short: 'продажи', favorable: 'down' },
    variableCost: { label: 'Себестоимость', short: 'себестоимость', favorable: 'down' },
    supportCost: { label: 'Поддержка клиента', short: 'поддержка', favorable: 'down' },
    paymentFee: { label: 'Платёжные комиссии', short: 'комиссии', favorable: 'down' },
    refundRate: { label: 'Возвраты', short: 'возвраты', favorable: 'down' },
    lifetime: { label: 'Срок жизни клиента', short: 'lifetime', favorable: 'up' },
    churn: { label: 'Месячный отток', short: 'churn', favorable: 'down' },
    payroll: { label: 'Команда и зарплаты', short: 'персонал', favorable: 'down' },
    rent: { label: 'Аренда', short: 'аренда', favorable: 'down' },
    software: { label: 'Софт и инфраструктура', short: 'софт', favorable: 'down' },
    admin: { label: 'Административные расходы', short: 'админ', favorable: 'down' },
  };

  const targetMeta = {
    profit: { label: 'Прибыль месяца', key: 'operatingProfit', higherBetter: true, unit: 'money' },
    ltvCac: { label: 'LTV / CAC', key: 'ltvCac', higherBetter: true, unit: 'ratio' },
    payback: { label: 'Срок окупаемости CAC', key: 'payback', higherBetter: false, unit: 'months' },
    breakEven: { label: 'Точка безубыточности', key: 'breakEvenCustomers', higherBetter: false, unit: 'customers' },
    cac: { label: 'CAC', key: 'cac', higherBetter: false, unit: 'money' },
  };

  let sensitivityTarget = 'profit';
  let sensitivityMagnitude = 10;
  let initialized = false;
  let metricsObserver = null;

  const moneyFormatter = new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  });
  const compactFormatter = new Intl.NumberFormat('ru-RU', {
    notation: 'compact',
    maximumFractionDigits: 1,
  });
  const numberFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });

  function safeDivide(a, b) {
    return b > 0 ? a / b : 0;
  }

  function effectiveLifetime(values) {
    return values.churn > 0 ? Math.min(60, 100 / values.churn) : values.lifetime;
  }

  function calculateFor(values) {
    const newCustomers = values.leads * (values.conversion / 100);
    const acquisitionSpend = values.marketingSpend + values.salesSpend;
    const cac = newCustomers > 0 ? acquisitionSpend / newCustomers : Infinity;
    const netPrice = values.price * (1 - values.paymentFee / 100) * (1 - values.refundRate / 100);
    const contributionPerPurchase = netPrice - values.variableCost;
    const monthlyContributionPerCustomer = contributionPerPurchase * values.purchases - values.supportCost;
    const lifetime = effectiveLifetime(values);
    const ltv = monthlyContributionPerCustomer * lifetime;
    const ltvCac = Number.isFinite(cac) && cac > 0 ? ltv / cac : 0;
    const payback = monthlyContributionPerCustomer > 0 ? cac / monthlyContributionPerCustomer : Infinity;
    const monthlyRevenue = values.activeCustomers * values.price * values.purchases;
    const variableExpenses = values.activeCustomers * (
      values.variableCost * values.purchases
      + values.price * values.purchases * (values.paymentFee + values.refundRate) / 100
      + values.supportCost
    );
    const fixedExpenses = values.payroll + values.rent + values.software + values.admin;
    const depreciation = Object.entries(state.assetQty || {}).reduce((sum, [key, qty]) => {
      const asset = assets[key];
      return asset ? sum + asset.cost * qty / asset.life : sum;
    }, 0);
    const operatingProfit = monthlyRevenue - variableExpenses - acquisitionSpend - fixedExpenses - depreciation;
    const breakEvenCustomers = monthlyContributionPerCustomer > 0
      ? (fixedExpenses + acquisitionSpend + depreciation) / monthlyContributionPerCustomer
      : Infinity;

    return {
      newCustomers,
      acquisitionSpend,
      cac,
      monthlyContributionPerCustomer,
      lifetime,
      ltv,
      ltvCac,
      payback,
      monthlyRevenue,
      variableExpenses,
      fixedExpenses,
      depreciation,
      operatingProfit,
      breakEvenCustomers,
    };
  }

  function clampInput(key, value) {
    const definition = inputDefinitions[key];
    if (!definition) return value;
    return Math.min(definition.max, Math.max(definition.min, value));
  }

  function changedValues(key, percent) {
    const clone = { ...state.values };
    const base = Number(clone[key]) || 0;
    clone[key] = clampInput(key, base * (1 + percent / 100));
    return clone;
  }

  function formatValueByTarget(value, target = sensitivityTarget) {
    if (!Number.isFinite(value)) return '∞';
    const meta = targetMeta[target];
    if (meta.unit === 'money') return moneyFormatter.format(value);
    if (meta.unit === 'ratio') return `${numberFormatter.format(value)}×`;
    if (meta.unit === 'months') return `${numberFormatter.format(value)} мес.`;
    return `${numberFormatter.format(value)} клиентов`;
  }

  function formatDelta(value, target = sensitivityTarget) {
    if (!Number.isFinite(value)) return '—';
    const sign = value > 0 ? '+' : value < 0 ? '−' : '';
    const absolute = Math.abs(value);
    const meta = targetMeta[target];
    if (meta.unit === 'money') return `${sign}${compactFormatter.format(absolute)} ₽`;
    if (meta.unit === 'ratio') return `${sign}${numberFormatter.format(absolute)}×`;
    if (meta.unit === 'months') return `${sign}${numberFormatter.format(absolute)} мес.`;
    return `${sign}${numberFormatter.format(absolute)}`;
  }

  function currentParameterValue(key) {
    const value = state.values[key];
    const definition = inputDefinitions[key];
    if (!definition) return numberFormatter.format(value);
    if (definition.suffix.includes('₽')) return `${compactFormatter.format(value)} ₽`;
    if (definition.suffix === '%') return `${numberFormatter.format(value)}%`;
    if (definition.suffix.includes('мес')) return `${numberFormatter.format(value)} мес.`;
    return numberFormatter.format(value);
  }

  function activeParameters() {
    const fields = new Set(templates[state.product]?.fields || []);
    fields.add('activeCustomers');
    return Object.keys(parameterMeta).filter(key => fields.has(key) && Number(state.values[key]) !== 0);
  }

  function evaluateParameter(key, percent, baseResult, target) {
    const result = calculateFor(changedValues(key, percent));
    const meta = targetMeta[target];
    const baseValue = baseResult[meta.key];
    const nextValue = result[meta.key];
    let rawDelta = 0;

    if (Number.isFinite(baseValue) && Number.isFinite(nextValue)) rawDelta = nextValue - baseValue;
    else if (!Number.isFinite(baseValue) && Number.isFinite(nextValue)) rawDelta = meta.higherBetter ? nextValue : Number.MAX_SAFE_INTEGER;
    else if (Number.isFinite(baseValue) && !Number.isFinite(nextValue)) rawDelta = meta.higherBetter ? -Number.MAX_SAFE_INTEGER : -Number.MAX_SAFE_INTEGER;

    const goodImpact = meta.higherBetter ? rawDelta : -rawDelta;
    return { result, nextValue, rawDelta, goodImpact };
  }

  function sensitivityRows() {
    const baseResult = calculateFor(state.values);
    const target = sensitivityTarget;
    const magnitude = sensitivityMagnitude;

    return activeParameters().map(key => {
      const down = evaluateParameter(key, -magnitude, baseResult, target);
      const up = evaluateParameter(key, magnitude, baseResult, target);
      return {
        key,
        meta: parameterMeta[key],
        current: currentParameterValue(key),
        down,
        up,
        strength: Math.max(Math.abs(down.goodImpact), Math.abs(up.goodImpact)),
      };
    }).sort((a, b) => b.strength - a.strength);
  }

  function movementText(row, movement) {
    const direction = movement === 'up' ? 'увеличить' : 'снизить';
    return `${direction} ${row.meta.short} на ${sensitivityMagnitude}%`;
  }

  function renderSensitivity() {
    const container = document.getElementById('sensitivityContent');
    if (!container || typeof state === 'undefined' || !state.values?.price) return;

    const target = targetMeta[sensitivityTarget];
    const baseResult = calculateFor(state.values);
    const rows = sensitivityRows();
    const finiteStrengths = rows.map(row => row.strength).filter(Number.isFinite);
    const maxStrength = Math.max(...finiteStrengths, 0.000001);

    const moves = rows.flatMap(row => [
      { row, movement: 'down', evaluation: row.down },
      { row, movement: 'up', evaluation: row.up },
    ]);
    const bestMoves = moves
      .filter(move => Number.isFinite(move.evaluation.goodImpact) && move.evaluation.goodImpact > 0)
      .sort((a, b) => b.evaluation.goodImpact - a.evaluation.goodImpact);
    const worstMoves = moves
      .filter(move => Number.isFinite(move.evaluation.goodImpact) && move.evaluation.goodImpact < 0)
      .sort((a, b) => a.evaluation.goodImpact - b.evaluation.goodImpact);

    const strongest = bestMoves[0];
    const largestRisk = worstMoves[0];
    const topLevers = [];
    const usedKeys = new Set();
    for (const move of bestMoves) {
      if (usedKeys.has(move.row.key)) continue;
      usedKeys.add(move.row.key);
      topLevers.push(move);
      if (topLevers.length === 3) break;
    }

    const baseline = baseResult[target.key];
    const strongestDelta = strongest?.evaluation.rawDelta || 0;
    const riskDelta = largestRisk?.evaluation.rawDelta || 0;

    container.innerHTML = `
      <div class="sensitivity-summary">
        <article class="sensitivity-summary-card">
          <span>Текущее значение</span>
          <strong>${formatValueByTarget(baseline)}</strong>
          <small>${target.label} при исходных параметрах модели.</small>
        </article>
        <article class="sensitivity-summary-card positive">
          <span>Самый сильный рычаг</span>
          <strong>${strongest ? movementText(strongest.row, strongest.movement) : 'Нет заметного влияния'}</strong>
          <small>${strongest ? `${formatDelta(strongestDelta)} к выбранной метрике` : 'Измените цель анализа или параметры модели.'}</small>
        </article>
        <article class="sensitivity-summary-card negative">
          <span>Главный риск</span>
          <strong>${largestRisk ? movementText(largestRisk.row, largestRisk.movement) : 'Сильный риск не найден'}</strong>
          <small>${largestRisk ? `${formatDelta(riskDelta)} к выбранной метрике` : 'В пределах выбранного изменения модель стабильна.'}</small>
        </article>
      </div>

      <div class="sensitivity-body">
        <div class="sensitivity-tornado">
          <div class="sensitivity-axis">
            <span>Параметр</span>
            <div class="sensitivity-axis-track"><span>−${sensitivityMagnitude}%</span><span>+${sensitivityMagnitude}%</span></div>
            <span>Изменение</span>
          </div>
          ${rows.map(row => {
            const downWidth = Math.min(100, Math.abs(row.down.goodImpact) / maxStrength * 100);
            const upWidth = Math.min(100, Math.abs(row.up.goodImpact) / maxStrength * 100);
            const downTone = row.down.goodImpact > 0 ? 'positive' : row.down.goodImpact < 0 ? 'negative' : 'neutral';
            const upTone = row.up.goodImpact > 0 ? 'positive' : row.up.goodImpact < 0 ? 'negative' : 'neutral';
            return `<div class="sensitivity-row">
              <div class="sensitivity-label"><strong>${row.meta.label}</strong><small>сейчас ${row.current}</small></div>
              <div class="sensitivity-bars">
                <div class="sensitivity-half left"><i class="sensitivity-bar ${downTone}" style="width:${downWidth}%"></i></div>
                <div class="sensitivity-half right"><i class="sensitivity-bar ${upTone}" style="width:${upWidth}%"></i></div>
              </div>
              <div class="sensitivity-row-values">
                <span class="${downTone}">${formatDelta(row.down.rawDelta)}</span>
                <span class="${upTone}">${formatDelta(row.up.rawDelta)}</span>
              </div>
            </div>`;
          }).join('')}
        </div>

        <aside class="sensitivity-levers">
          <div class="sensitivity-levers-heading"><span>Приоритет</span><strong>Три рычага модели</strong></div>
          ${topLevers.length ? topLevers.map((move, index) => `
            <article class="sensitivity-lever">
              <span class="sensitivity-rank">${index + 1}</span>
              <div>
                <strong>${movementText(move.row, move.movement)}</strong>
                <p>Все остальные параметры остаются неизменными.</p>
                <b>${formatDelta(move.evaluation.rawDelta)} · новое значение ${formatValueByTarget(move.evaluation.nextValue)}</b>
              </div>
            </article>`).join('') : '<p class="sensitivity-disclaimer">Для выбранной метрики и текущих значений заметных рычагов не найдено.</p>'}
        </aside>
      </div>

      <p class="sensitivity-disclaimer">Анализ меняет только один параметр за раз. Он показывает математическую чувствительность модели, но не гарантирует, что рост цены, конверсии или бюджета возможен без влияния на другие показатели.</p>`;
  }

  function updateLoyaltySummary() {
    const npsScore = document.querySelector('#npsResult .nps-score-card strong')?.textContent?.trim() || '—';
    const npsLabel = document.querySelector('#npsResult .nps-score-card small')?.textContent?.trim() || 'Нет данных';
    const retentionCards = [...document.querySelectorAll('#retentionSummary .analytics-summary-card strong')];
    const retention12 = retentionCards[0]?.textContent?.trim() || '—';
    const lifetime = typeof state !== 'undefined' ? effectiveLifetime(state.values) : 0;

    const npsLive = document.getElementById('loyaltyNpsValue');
    const retentionLive = document.getElementById('loyaltyRetentionValue');
    const lifetimeLive = document.getElementById('loyaltyLifetimeValue');
    const tabBadge = document.getElementById('loyaltyTabBadge');

    if (npsLive) {
      npsLive.textContent = npsScore;
      npsLive.parentElement.querySelector('small').textContent = npsLabel;
    }
    if (retentionLive) retentionLive.textContent = retention12;
    if (lifetimeLive) lifetimeLive.textContent = `${numberFormatter.format(lifetime)} мес.`;
    if (tabBadge) tabBadge.textContent = npsScore === '—' ? 'NPS' : npsScore;
  }

  function setTab(name) {
    document.querySelectorAll('[data-dashboard-tab]').forEach(button => {
      const active = button.dataset.dashboardTab === name;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    });
    document.querySelectorAll('[data-dashboard-panel]').forEach(panel => {
      panel.hidden = panel.dataset.dashboardPanel !== name;
    });
    try { localStorage.setItem('unitlab-dashboard-tab', name); } catch (error) { /* noop */ }
    if (name === 'loyalty') window.requestAnimationFrame(updateLoyaltySummary);
  }

  function buildDashboardAnalytics() {
    if (initialized) return true;
    const dashboard = document.getElementById('businessDashboard');
    const hero = dashboard?.querySelector('.dashboard-hero');
    const overview = dashboard?.querySelector('.dashboard-overview');
    const visualGrid = dashboard?.querySelector('#dashboardVisualGrid');
    const headings = dashboard ? [...dashboard.querySelectorAll(':scope > .dashboard-section-heading')] : [];
    if (!dashboard || !hero || !overview || !visualGrid || headings.length < 2) return false;

    initialized = true;

    const tabsShell = document.createElement('nav');
    tabsShell.className = 'dashboard-tabs-shell';
    tabsShell.setAttribute('aria-label', 'Разделы дашборда');
    tabsShell.innerHTML = `
      <div class="dashboard-tabs" role="tablist">
        <button class="dashboard-tab active" type="button" role="tab" aria-selected="true" data-dashboard-tab="economy">
          <span class="dashboard-tab-icon">⌁</span>
          <span class="dashboard-tab-copy"><strong>Экономика</strong><small>Прибыль, CAC, LTV и риски</small></span>
          <span class="dashboard-tab-badge">KPI</span>
        </button>
        <button class="dashboard-tab" type="button" role="tab" aria-selected="false" data-dashboard-tab="loyalty">
          <span class="dashboard-tab-icon">♡</span>
          <span class="dashboard-tab-copy"><strong>Client loyalty</strong><small>NPS, retention и срок жизни</small></span>
          <span class="dashboard-tab-badge" id="loyaltyTabBadge">NPS</span>
        </button>
      </div>
      <span class="dashboard-tabs-note">Финансовые показатели и клиентская лояльность разделены, но рассчитываются из одной модели.</span>`;

    const economyPanel = document.createElement('div');
    economyPanel.className = 'dashboard-tab-panel';
    economyPanel.dataset.dashboardPanel = 'economy';

    const loyaltyPanel = document.createElement('div');
    loyaltyPanel.className = 'dashboard-tab-panel';
    loyaltyPanel.dataset.dashboardPanel = 'loyalty';
    loyaltyPanel.hidden = true;

    hero.after(tabsShell, economyPanel, loyaltyPanel);
    economyPanel.append(headings[0], overview, headings[1], visualGrid);

    const sensitivityPanel = document.createElement('section');
    sensitivityPanel.className = 'panel sensitivity-panel';
    sensitivityPanel.innerHTML = `
      <header class="sensitivity-header">
        <div>
          <span class="sensitivity-kicker">What-if analysis</span>
          <h2>Анализ чувствительности</h2>
          <p>Проверьте, какие предположения сильнее всего меняют результат. Сравнение выполняется относительно текущего базового сценария.</p>
        </div>
        <div class="sensitivity-controls">
          <div class="sensitivity-control">
            <label for="sensitivityTarget">Целевая метрика</label>
            <select id="sensitivityTarget">
              ${Object.entries(targetMeta).map(([key, meta]) => `<option value="${key}">${meta.label}</option>`).join('')}
            </select>
          </div>
          <div class="sensitivity-control">
            <label>Размер изменения</label>
            <div class="sensitivity-magnitude" id="sensitivityMagnitude">
              ${[5, 10, 20].map(value => `<button type="button" data-sensitivity-magnitude="${value}" class="${value === sensitivityMagnitude ? 'active' : ''}">${value}%</button>`).join('')}
            </div>
          </div>
        </div>
      </header>
      <div id="sensitivityContent"></div>`;
    visualGrid.appendChild(sensitivityPanel);

    const retentionSection = document.getElementById('retentionChartTitle')?.closest('section');
    const npsSection = document.getElementById('npsTitle')?.closest('section');

    const loyaltyHero = document.createElement('section');
    loyaltyHero.className = 'loyalty-hero';
    loyaltyHero.innerHTML = `
      <div class="loyalty-copy">
        <span class="loyalty-kicker">Client loyalty</span>
        <h2>Понимайте не только деньги, но и отношение клиентов</h2>
        <p>NPS показывает готовность рекомендовать продукт, retention — фактическое удержание, а срок жизни связывает лояльность с LTV. Эти показатели дополняют финансовую модель, но не заменяют прибыльность.</p>
        <div class="loyalty-principles"><span>NPS ≠ прибыль</span><span>Retention влияет на LTV</span><span>Когорты важнее среднего</span></div>
      </div>
      <div class="loyalty-live">
        <article class="loyalty-live-card"><span>Текущий NPS</span><strong id="loyaltyNpsValue">—</strong><small>Нет данных</small></article>
        <article class="loyalty-live-card"><span>Retention на 12-м месяце</span><strong id="loyaltyRetentionValue">—</strong><small>Доля исходной когорты</small></article>
        <article class="loyalty-live-card"><span>Расчётный lifetime</span><strong id="loyaltyLifetimeValue">—</strong><small>Используется в LTV</small></article>
      </div>`;

    const loyaltyGrid = document.createElement('div');
    loyaltyGrid.className = 'loyalty-grid';
    loyaltyPanel.append(loyaltyHero, loyaltyGrid);
    if (retentionSection) loyaltyGrid.appendChild(retentionSection);
    if (npsSection) loyaltyGrid.appendChild(npsSection);

    tabsShell.querySelectorAll('[data-dashboard-tab]').forEach(button => {
      button.addEventListener('click', () => setTab(button.dataset.dashboardTab));
      button.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        event.preventDefault();
        const next = button.dataset.dashboardTab === 'economy' ? 'loyalty' : 'economy';
        setTab(next);
        tabsShell.querySelector(`[data-dashboard-tab="${next}"]`)?.focus();
      });
    });

    document.getElementById('sensitivityTarget').addEventListener('change', event => {
      sensitivityTarget = event.target.value;
      renderSensitivity();
    });
    document.getElementById('sensitivityMagnitude').addEventListener('click', event => {
      const button = event.target.closest('[data-sensitivity-magnitude]');
      if (!button) return;
      sensitivityMagnitude = Number(button.dataset.sensitivityMagnitude);
      document.querySelectorAll('[data-sensitivity-magnitude]').forEach(item => item.classList.toggle('active', item === button));
      renderSensitivity();
    });

    metricsObserver = new MutationObserver(() => {
      window.requestAnimationFrame(() => {
        renderSensitivity();
        updateLoyaltySummary();
      });
    });
    metricsObserver.observe(document.getElementById('metricsGrid'), { childList: true, subtree: true, characterData: true });

    const loyaltyObserver = new MutationObserver(() => window.requestAnimationFrame(updateLoyaltySummary));
    const npsResult = document.getElementById('npsResult');
    const retentionSummary = document.getElementById('retentionSummary');
    if (npsResult) loyaltyObserver.observe(npsResult, { childList: true, subtree: true, characterData: true });
    if (retentionSummary) loyaltyObserver.observe(retentionSummary, { childList: true, subtree: true, characterData: true });

    document.addEventListener('input', event => {
      if (event.target.closest('#unitLabProModal, #unitLabWizard')) {
        window.requestAnimationFrame(() => {
          renderSensitivity();
          updateLoyaltySummary();
        });
      }
    }, true);

    let savedTab = 'economy';
    try { savedTab = localStorage.getItem('unitlab-dashboard-tab') || 'economy'; } catch (error) { /* noop */ }
    setTab(savedTab === 'loyalty' ? 'loyalty' : 'economy');
    renderSensitivity();
    updateLoyaltySummary();
    return true;
  }

  if (!buildDashboardAnalytics()) {
    const pageObserver = new MutationObserver(() => {
      if (buildDashboardAnalytics()) pageObserver.disconnect();
    });
    pageObserver.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
