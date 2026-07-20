'use strict';

(() => {
  if (window.__unitLabWizardLoaded) return;
  window.__unitLabWizardLoaded = true;

  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = 'wizard.css?v=1';
  document.head.appendChild(style);

  const wizardSteps = [
    {
      id: 'product',
      title: 'Что вы хотите посчитать?',
      subtitle: 'Выберите ближайшую бизнес-модель. Мы подставим разумный стартовый шаблон, который потом можно изменить.',
    },
    {
      id: 'sales',
      title: 'Как клиент покупает ваш продукт?',
      subtitle: 'Опишите текущий или ожидаемый объём продаж. Приблизительные значения подходят для первой проверки.',
      keys: ['activeCustomers', 'price', 'purchases'],
    },
    {
      id: 'acquisition',
      title: 'Как вы получаете новых клиентов?',
      subtitle: 'Эти ответы помогут вычислить количество новых покупателей и стоимость привлечения одного клиента — CAC.',
      keys: ['leads', 'conversion', 'marketingSpend', 'salesSpend'],
    },
    {
      id: 'delivery',
      title: 'Сколько стоит обслужить одну покупку?',
      subtitle: 'Учитывайте расходы, которые возникают именно из-за заказа или активного клиента.',
      keys: ['variableCost', 'paymentFee', 'refundRate', 'supportCost'],
    },
    {
      id: 'retention',
      title: 'Как долго клиент остаётся с вами?',
      subtitle: 'Для подписочных моделей используем отток. Для остальных — ожидаемый срок жизни клиента.',
    },
    {
      id: 'fixed',
      title: 'Какие расходы существуют даже без продаж?',
      subtitle: 'Команда, аренда, сервисы и административные затраты определяют общий порог безубыточности.',
      keys: ['payroll', 'rent', 'software', 'admin', 'cash'],
    },
    {
      id: 'summary',
      title: 'Предварительный результат готов',
      subtitle: 'Проверьте ключевые показатели. После применения ответов вы сможете детально настроить модель в основном калькуляторе.',
    },
  ];

  let wizardStep = 0;
  let wizardProduct = state.product;
  let wizardValues = { ...state.values };
  let lastFocusedElement = null;

  const overlay = document.createElement('div');
  overlay.className = 'wizard-overlay';
  overlay.id = 'unitLabWizard';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = `
    <section class="wizard-dialog" role="dialog" aria-modal="true" aria-labelledby="wizardTitle">
      <header class="wizard-header">
        <div class="wizard-header-top">
          <div>
            <span class="wizard-kicker">✦ Быстрый расчёт</span>
            <h2 class="wizard-title" id="wizardTitle">Пошаговый сценарий</h2>
            <p class="wizard-subtitle" id="wizardSubtitle">Ответьте на несколько вопросов — UnitLab сам заполнит основные параметры.</p>
          </div>
          <button class="wizard-close" id="wizardClose" type="button" aria-label="Закрыть пошаговый сценарий">×</button>
        </div>
        <div class="wizard-progress-meta"><span id="wizardStepLabel">Шаг 1 из 7</span><span id="wizardPercent">0%</span></div>
        <div class="wizard-progress-track" aria-hidden="true"><span class="wizard-progress-fill" id="wizardProgressFill"></span></div>
        <div class="wizard-step-dots" id="wizardDots" aria-hidden="true"></div>
      </header>
      <div class="wizard-body" id="wizardBody"></div>
      <footer class="wizard-footer">
        <span class="wizard-footer-note">Значения можно изменить позже в расширенной модели.</span>
        <div class="wizard-actions">
          <button class="wizard-button secondary" id="wizardBack" type="button">Назад</button>
          <button class="wizard-button primary" id="wizardNext" type="button">Продолжить</button>
        </div>
      </footer>
    </section>`;
  document.body.appendChild(overlay);

  const wizardBody = document.getElementById('wizardBody');
  const backButton = document.getElementById('wizardBack');
  const nextButton = document.getElementById('wizardNext');

  function formatWizardNumber(value) {
    return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(value);
  }

  function formatWizardMoney(value) {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(value);
  }

  function wizardUnit(key) {
    const suffix = inputDefinitions[key]?.suffix || '';
    if (suffix.includes('₽')) return '₽';
    if (suffix.includes('%')) return '%';
    if (suffix.includes('мес')) return 'мес.';
    return '';
  }

  function effectiveWizardLifetime(values) {
    return values.churn > 0 ? Math.min(60, 100 / values.churn) : values.lifetime;
  }

  function calculateWizardPreview() {
    const v = wizardValues;
    const newCustomers = v.leads * (v.conversion / 100);
    const acquisitionSpend = v.marketingSpend + v.salesSpend;
    const cac = newCustomers > 0 ? acquisitionSpend / newCustomers : Infinity;
    const netPrice = v.price * (1 - v.paymentFee / 100) * (1 - v.refundRate / 100);
    const contributionPerPurchase = netPrice - v.variableCost;
    const monthlyContribution = contributionPerPurchase * v.purchases - v.supportCost;
    const lifetime = effectiveWizardLifetime(v);
    const ltv = monthlyContribution * lifetime;
    const ltvCac = Number.isFinite(cac) && cac > 0 ? ltv / cac : 0;
    const revenue = v.activeCustomers * v.price * v.purchases;
    const variableExpenses = v.activeCustomers * ((v.variableCost * v.purchases) + (v.price * v.purchases * (v.paymentFee + v.refundRate) / 100) + v.supportCost);
    const fixedExpenses = v.payroll + v.rent + v.software + v.admin;
    const profit = revenue - variableExpenses - acquisitionSpend - fixedExpenses;
    const breakEven = monthlyContribution > 0 ? (fixedExpenses + acquisitionSpend) / monthlyContribution : Infinity;
    return { newCustomers, cac, monthlyContribution, lifetime, ltv, ltvCac, revenue, profit, breakEven };
  }

  function fieldMarkup(key) {
    const definition = inputDefinitions[key];
    const value = wizardValues[key];
    const unit = wizardUnit(key);
    return `
      <div class="wizard-field">
        <div class="wizard-field-top"><label for="wizard-number-${key}">${definition.label}</label></div>
        <p class="wizard-field-help">${definition.tooltip}</p>
        <div class="wizard-value-wrap">
          <input id="wizard-number-${key}" data-wizard-key="${key}" data-wizard-kind="number" type="number" min="${definition.min}" max="${definition.max}" step="${definition.step}" value="${value}">
          ${unit ? `<span class="wizard-value-unit">${unit}</span>` : ''}
        </div>
        <input class="wizard-range" data-wizard-key="${key}" data-wizard-kind="range" type="range" min="${definition.min}" max="${definition.max}" step="${definition.step}" value="${value}" aria-label="${definition.label}">
      </div>`;
  }

  function renderProductStep() {
    return `<div class="wizard-screen">
      <div class="wizard-question-head"><h3>${wizardSteps[0].title}</h3><p>${wizardSteps[0].subtitle}</p></div>
      <div class="wizard-product-grid">
        ${Object.entries(templates).map(([key, product]) => `
          <button class="wizard-product ${wizardProduct === key ? 'selected' : ''}" data-wizard-product="${key}" type="button">
            <span class="wizard-product-check">✓</span>
            <span class="wizard-product-icon" aria-hidden="true">${product.icon}</span>
            <span><strong>${product.name}</strong><small>${product.subtitle}</small></span>
          </button>`).join('')}
      </div>
      <div class="wizard-tip"><span>💡</span><span>Не ищите идеальное совпадение. Выберите модель с похожей логикой продаж — все числа можно изменить вручную.</span></div>
    </div>`;
  }

  function retentionKeys() {
    const fields = templates[wizardProduct].fields;
    return fields.includes('churn') ? ['churn'] : ['lifetime'];
  }

  function renderFieldsStep(step) {
    const keys = step.id === 'retention' ? retentionKeys() : step.keys;
    const note = step.id === 'retention' && keys[0] === 'churn'
      ? `При текущем оттоке расчётный срок жизни клиента — около ${formatWizardNumber(effectiveWizardLifetime(wizardValues))} мес.`
      : step.id === 'retention'
        ? 'Используйте осторожную оценку. Завышенный срок жизни искусственно увеличивает LTV.'
        : 'Не знаете точное число? Оставьте значение шаблона и позднее замените его фактическими данными.';
    return `<div class="wizard-screen">
      <div class="wizard-question-head"><h3>${step.title}</h3><p>${step.subtitle}</p></div>
      <div class="wizard-fields">${keys.map(fieldMarkup).join('')}</div>
      <div class="wizard-tip"><span>💡</span><span>${note}</span></div>
    </div>`;
  }

  function renderSummaryStep() {
    const preview = calculateWizardPreview();
    const profitClass = preview.profit >= 0 ? 'positive' : 'negative';
    const ltvCacText = preview.ltvCac > 0 ? `${formatWizardNumber(preview.ltvCac)}×` : '—';
    return `<div class="wizard-screen">
      <div class="wizard-question-head"><h3>${wizardSteps[6].title}</h3><p>${wizardSteps[6].subtitle}</p></div>
      <div class="wizard-summary">
        <article class="wizard-summary-card"><span>CAC</span><strong>${Number.isFinite(preview.cac) ? formatWizardMoney(preview.cac) : '—'}</strong></article>
        <article class="wizard-summary-card ${preview.ltvCac >= 1 ? 'positive' : 'negative'}"><span>LTV / CAC</span><strong>${ltvCacText}</strong></article>
        <article class="wizard-summary-card ${profitClass}"><span>Прибыль месяца*</span><strong>${formatWizardMoney(preview.profit)}</strong></article>
        <article class="wizard-summary-card"><span>Точка безубыточности*</span><strong>${Number.isFinite(preview.breakEven) ? `${Math.ceil(preview.breakEven)} клиентов` : 'недостижима'}</strong></article>
      </div>
      <div class="wizard-review">
        <div class="wizard-review-row"><span>Бизнес-модель</span><strong>${templates[wizardProduct].icon} ${templates[wizardProduct].name}</strong></div>
        <div class="wizard-review-row"><span>Активные клиенты</span><strong>${formatWizardNumber(wizardValues.activeCustomers)}</strong></div>
        <div class="wizard-review-row"><span>Средний чек</span><strong>${formatWizardMoney(wizardValues.price)}</strong></div>
        <div class="wizard-review-row"><span>Новых клиентов в месяц</span><strong>${formatWizardNumber(preview.newCustomers)}</strong></div>
        <div class="wizard-review-row"><span>Маржа клиента в месяц</span><strong>${formatWizardMoney(preview.monthlyContribution)}</strong></div>
        <div class="wizard-review-row"><span>Расчётный срок жизни</span><strong>${formatWizardNumber(preview.lifetime)} мес.</strong></div>
      </div>
      <div class="wizard-tip"><span>ℹ️</span><span>* Предварительный итог пока не включает выбранное оборудование и его амортизацию. После применения основная модель пересчитает полный результат.</span></div>
    </div>`;
  }

  function bindProductButtons() {
    wizardBody.querySelectorAll('[data-wizard-product]').forEach(button => {
      button.addEventListener('click', () => {
        wizardProduct = button.dataset.wizardProduct;
        wizardValues = { ...templates[wizardProduct].values };
        renderWizard();
      });
    });
  }

  function bindFieldInputs() {
    wizardBody.querySelectorAll('[data-wizard-key]').forEach(input => {
      input.addEventListener('input', event => {
        const key = event.target.dataset.wizardKey;
        const definition = inputDefinitions[key];
        const raw = Number(event.target.value);
        const value = Math.min(definition.max, Math.max(definition.min, Number.isFinite(raw) ? raw : definition.min));
        wizardValues[key] = value;
        wizardBody.querySelectorAll(`[data-wizard-key="${key}"]`).forEach(linked => {
          if (linked !== event.target) linked.value = value;
        });
        if (wizardSteps[wizardStep].id === 'retention') {
          const tip = wizardBody.querySelector('.wizard-tip span:last-child');
          if (tip && retentionKeys()[0] === 'churn') tip.textContent = `При текущем оттоке расчётный срок жизни клиента — около ${formatWizardNumber(effectiveWizardLifetime(wizardValues))} мес.`;
        }
      });
    });
  }

  function updateProgress() {
    const progress = wizardSteps.length === 1 ? 100 : (wizardStep / (wizardSteps.length - 1)) * 100;
    document.getElementById('wizardStepLabel').textContent = `Шаг ${wizardStep + 1} из ${wizardSteps.length}`;
    document.getElementById('wizardPercent').textContent = `${Math.round(progress)}%`;
    document.getElementById('wizardProgressFill').style.width = `${progress}%`;
    document.getElementById('wizardDots').innerHTML = wizardSteps.map((_, index) => `<span class="wizard-dot ${index < wizardStep ? 'done' : ''} ${index === wizardStep ? 'active' : ''}"></span>`).join('');
  }

  function renderWizard() {
    const step = wizardSteps[wizardStep];
    if (step.id === 'product') wizardBody.innerHTML = renderProductStep();
    else if (step.id === 'summary') wizardBody.innerHTML = renderSummaryStep();
    else wizardBody.innerHTML = renderFieldsStep(step);

    updateProgress();
    backButton.disabled = wizardStep === 0;
    nextButton.textContent = wizardStep === wizardSteps.length - 1 ? 'Применить расчёт' : 'Продолжить';
    bindProductButtons();
    bindFieldInputs();
    wizardBody.scrollTop = 0;

    window.setTimeout(() => {
      const focusTarget = wizardBody.querySelector('input, button');
      if (focusTarget) focusTarget.focus({ preventScroll: true });
    }, 20);
  }

  function openWizard() {
    lastFocusedElement = document.activeElement;
    wizardStep = 0;
    wizardProduct = state.product;
    wizardValues = { ...state.values };
    renderWizard();
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('wizard-open');
  }

  function closeWizard() {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('wizard-open');
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') lastFocusedElement.focus();
  }

  function applyWizard() {
    const productChanged = state.product !== wizardProduct;
    if (productChanged) loadProduct(wizardProduct);

    state.product = wizardProduct;
    state.scenario = 'base';
    state.values = { ...templates[wizardProduct].values, ...wizardValues };
    state.baseValues = { ...state.values };

    updateScenarioButtons();
    renderProducts();
    updateModelSummary();
    renderInputs();
    if (!productChanged) renderAssets();
    saveState();
    updateResults();

    closeWizard();
    showToast('Ответы перенесены в основную модель.');
    window.setTimeout(() => document.getElementById('metricsGrid')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 160);
  }

  backButton.addEventListener('click', () => {
    if (wizardStep > 0) {
      wizardStep -= 1;
      renderWizard();
    }
  });

  nextButton.addEventListener('click', () => {
    if (wizardStep < wizardSteps.length - 1) {
      wizardStep += 1;
      renderWizard();
    } else {
      applyWizard();
    }
  });

  document.getElementById('wizardClose').addEventListener('click', closeWizard);
  overlay.addEventListener('click', event => { if (event.target === overlay) closeWizard(); });
  document.addEventListener('keydown', event => {
    if (!overlay.classList.contains('open')) return;
    if (event.key === 'Escape') closeWizard();
    if (event.key === 'Enter' && event.target.tagName !== 'BUTTON') {
      event.preventDefault();
      nextButton.click();
    }
  });

  const topActions = document.querySelector('.top-actions');
  if (topActions) {
    const launch = document.createElement('button');
    launch.className = 'button wizard-launch';
    launch.type = 'button';
    launch.innerHTML = '<span>✦ Быстрый расчёт</span>';
    launch.addEventListener('click', openWizard);
    topActions.insertBefore(launch, topActions.firstChild);
  }

  const heroContent = document.querySelector('.hero > div');
  if (heroContent) {
    const heroLaunch = document.createElement('button');
    heroLaunch.className = 'wizard-hero-cta';
    heroLaunch.type = 'button';
    heroLaunch.innerHTML = '<span>Пройти пошаговый расчёт</span><b aria-hidden="true">→</b>';
    heroLaunch.addEventListener('click', openWizard);
    heroContent.appendChild(heroLaunch);
  }
})();
