'use strict';

(() => {
  if (window.__unitLabDashboardModeLoaded) return;
  window.__unitLabDashboardModeLoaded = true;

  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = 'dashboard-mode.css?v=1';
  document.head.appendChild(style);

  const main = document.querySelector('main');
  const hero = document.querySelector('.hero');
  const productSection = document.querySelector('#productGrid')?.closest('.section');
  const workspace = document.querySelector('.workspace');
  const controlsColumn = document.querySelector('.controls-column');
  const stickyResults = document.querySelector('.sticky-results');
  const healthCard = document.getElementById('healthCard');
  const metricsGrid = document.getElementById('metricsGrid');

  if (!main || !productSection || !workspace || !controlsColumn || !stickyResults || !healthCard || !metricsGrid) return;

  document.body.classList.add('dashboard-mode');
  if (hero) hero.setAttribute('aria-hidden', 'true');

  const dashboard = document.createElement('section');
  dashboard.className = 'business-dashboard';
  dashboard.id = 'businessDashboard';
  dashboard.innerHTML = `
    <section class="dashboard-hero" aria-labelledby="dashboardTitle">
      <div class="dashboard-copy">
        <span class="dashboard-eyebrow">Панель экономики бизнеса</span>
        <h1 id="dashboardTitle">Контрольная панель <span id="dashboardProductTitle">модели</span></h1>
        <p>Главные показатели собраны на одном экране. Заполните базовый сценарий за несколько шагов или откройте профессиональный режим со всеми параметрами.</p>
        <div class="dashboard-actions">
          <button class="dashboard-action primary" id="dashboardBasicButton" type="button">
            <span class="dashboard-action-icon" aria-hidden="true">✦</span>
            <span><strong>Базовый расчёт</strong><small>7 понятных шагов для быстрой оценки</small></span>
          </button>
          <button class="dashboard-action secondary" id="dashboardProButton" type="button">
            <span class="dashboard-action-icon" aria-hidden="true">⚙</span>
            <span><strong>Продвинутый режим</strong><small>Все метрики, расходы, retention и активы</small></span>
          </button>
        </div>
      </div>
      <aside class="dashboard-snapshot" aria-label="Краткая сводка модели">
        <div class="dashboard-model">
          <span class="dashboard-model-icon" id="dashboardModelIcon" aria-hidden="true">◈</span>
          <div>
            <span>Текущая модель</span>
            <strong id="dashboardModelName">—</strong>
            <em id="dashboardScenarioName">Базовый сценарий</em>
          </div>
        </div>
        <div class="dashboard-snapshot-grid" id="dashboardSnapshotGrid"></div>
      </aside>
    </section>

    <div class="dashboard-section-heading">
      <div><span>Сводка</span><h2>Основные показатели</h2></div>
      <p>CAC, LTV, окупаемость, прибыльность и запас устойчивости обновляются сразу после изменения данных.</p>
    </div>

    <section class="dashboard-overview">
      <div class="dashboard-health-slot" id="dashboardHealthSlot"></div>
      <div class="dashboard-metrics-slot" id="dashboardMetricsSlot"></div>
    </section>

    <div class="dashboard-section-heading">
      <div><span>Аналитика</span><h2>Графики и структура модели</h2></div>
      <p>Доходы, расходы, retention, окупаемость клиента, NPS и автоматическая диагностика.</p>
    </div>

    <section class="dashboard-visual-grid" id="dashboardVisualGrid"></section>`;

  main.insertBefore(dashboard, productSection);

  document.getElementById('dashboardHealthSlot').appendChild(healthCard);
  document.getElementById('dashboardMetricsSlot').appendChild(metricsGrid);

  const visualGrid = document.getElementById('dashboardVisualGrid');
  [...stickyResults.children].forEach(section => {
    if (section === healthCard || section === metricsGrid) return;
    const headingId = section.querySelector('h2')?.id || '';
    if (['retentionChartTitle', 'paybackChartTitle', 'npsTitle', 'diagnosisTitle'].includes(headingId)) {
      section.classList.add('dashboard-card-wide');
    }
    visualGrid.appendChild(section);
  });

  workspace.classList.add('dashboard-source-hidden');

  const proOverlay = document.createElement('div');
  proOverlay.className = 'pro-overlay';
  proOverlay.id = 'unitLabProModal';
  proOverlay.setAttribute('aria-hidden', 'true');
  proOverlay.innerHTML = `
    <section class="pro-dialog" role="dialog" aria-modal="true" aria-labelledby="proModalTitle">
      <header class="pro-header">
        <div>
          <span class="pro-kicker">UnitLab Pro</span>
          <h2 id="proModalTitle">Продвинутый расчёт</h2>
          <p>Настройте бизнес-модель детально. Все изменения сразу отражаются на основном дашборде.</p>
        </div>
        <button class="pro-close" id="proCloseButton" type="button" aria-label="Закрыть продвинутый режим">×</button>
      </header>
      <div class="pro-layout">
        <div class="pro-settings-scroll" id="proSettingsScroll"></div>
        <aside class="pro-live" aria-label="Текущие показатели">
          <div class="pro-live-heading"><span>Live preview</span><strong>Результат в реальном времени</strong></div>
          <div class="pro-live-grid" id="proLiveGrid"></div>
          <div class="pro-live-note">Изменения сохраняются автоматически. Закройте окно, чтобы увидеть обновлённый дашборд целиком.</div>
        </aside>
      </div>
      <footer class="pro-footer">
        <span>Все параметры можно менять повторно — данные остаются в браузере.</span>
        <button class="pro-done" id="proDoneButton" type="button">Готово — вернуться к дашборду</button>
      </footer>
    </section>`;
  document.body.appendChild(proOverlay);

  const settingsScroll = document.getElementById('proSettingsScroll');
  settingsScroll.appendChild(productSection);
  settingsScroll.appendChild(controlsColumn);

  let lastFocused = null;
  const scenarioLabels = {
    conservative: 'Осторожный сценарий',
    base: 'Базовый сценарий',
    growth: 'Сценарий роста',
  };

  const formatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
  const moneyFormatter = new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  });

  function money(value) {
    return moneyFormatter.format(Number.isFinite(value) ? value : 0);
  }

  function number(value) {
    return formatter.format(Number.isFinite(value) ? value : 0);
  }

  function openBasicWizard() {
    const launcher = document.querySelector('.wizard-launch') || document.querySelector('.wizard-hero-cta');
    if (launcher) launcher.click();
  }

  function openPro() {
    lastFocused = document.activeElement;
    proOverlay.classList.add('open');
    proOverlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('pro-open');
    window.setTimeout(() => document.getElementById('proCloseButton')?.focus(), 30);
  }

  function closePro() {
    proOverlay.classList.remove('open');
    proOverlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('pro-open');
    refreshDashboard();
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  function renderSnapshot() {
    const currentTemplate = templates[state.product];
    const result = calculations();
    const profitClass = result.operatingProfit >= 0 ? 'positive' : 'negative';

    document.getElementById('dashboardProductTitle').textContent = currentTemplate.name;
    document.getElementById('dashboardModelIcon').textContent = currentTemplate.icon;
    document.getElementById('dashboardModelName').textContent = `${currentTemplate.name} · ${currentTemplate.subtitle}`;
    document.getElementById('dashboardScenarioName').textContent = scenarioLabels[state.scenario] || 'Пользовательский сценарий';

    document.getElementById('dashboardSnapshotGrid').innerHTML = `
      <div class="dashboard-snapshot-item"><span>Активные клиенты</span><strong>${number(state.values.activeCustomers)}</strong></div>
      <div class="dashboard-snapshot-item"><span>Новых в месяц</span><strong>${number(result.newCustomers)}</strong></div>
      <div class="dashboard-snapshot-item"><span>Выручка месяца</span><strong>${money(result.monthlyRevenue)}</strong></div>
      <div class="dashboard-snapshot-item ${profitClass}"><span>Операционный результат</span><strong>${money(result.operatingProfit)}</strong></div>`;
  }

  function renderProSummary() {
    const result = calculations();
    const profitClass = result.operatingProfit >= 0 ? 'positive' : 'negative';
    const ratioClass = result.ltvCac >= 1 ? 'positive' : 'negative';
    document.getElementById('proLiveGrid').innerHTML = `
      <div class="pro-live-card"><span>CAC</span><strong>${money(result.cac)}</strong></div>
      <div class="pro-live-card"><span>LTV</span><strong>${money(result.ltv)}</strong></div>
      <div class="pro-live-card ${ratioClass}"><span>LTV / CAC</span><strong>${number(result.ltvCac)}×</strong></div>
      <div class="pro-live-card"><span>Payback</span><strong>${Number.isFinite(result.payback) ? `${number(result.payback)} мес.` : 'не окупается'}</strong></div>
      <div class="pro-live-card ${profitClass}"><span>Прибыль месяца</span><strong>${money(result.operatingProfit)}</strong></div>
      <div class="pro-live-card"><span>Break-even</span><strong>${Number.isFinite(result.breakEvenCustomers) ? `${Math.ceil(result.breakEvenCustomers)} клиентов` : 'недостижим'}</strong></div>`;
  }

  function refreshDashboard() {
    renderSnapshot();
    renderProSummary();
  }

  document.getElementById('dashboardBasicButton').addEventListener('click', openBasicWizard);
  document.getElementById('dashboardProButton').addEventListener('click', openPro);
  document.getElementById('proCloseButton').addEventListener('click', closePro);
  document.getElementById('proDoneButton').addEventListener('click', closePro);
  proOverlay.addEventListener('click', event => { if (event.target === proOverlay) closePro(); });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && proOverlay.classList.contains('open')) closePro();
  });

  document.addEventListener('input', event => {
    if (event.target.closest('#unitLabProModal, #unitLabWizard')) {
      window.requestAnimationFrame(refreshDashboard);
    }
  }, true);

  document.addEventListener('click', event => {
    if (event.target.closest('[data-product], [data-scenario], [data-asset], [data-custom-asset], [data-remove-custom], #resetButton')) {
      window.setTimeout(refreshDashboard, 0);
    }
  }, true);

  const observer = new MutationObserver(() => window.requestAnimationFrame(refreshDashboard));
  observer.observe(metricsGrid, { childList: true, subtree: true, characterData: true });

  refreshDashboard();
})();
