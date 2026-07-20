'use strict';

(() => {
  if (window.__unitLabWizardLoaded) return;
  window.__unitLabWizardLoaded = true;

  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = 'wizard-v2.css?v=3';
  document.head.appendChild(style);

  const wizardSteps = [
    { id: 'product', short: 'Модель', title: 'Что вы хотите посчитать?', subtitle: 'Выберите ближайшую бизнес-модель. UnitLab подставит стартовый шаблон, который вы уточните на следующих шагах.' },
    { id: 'sales', short: 'Продажи', title: 'Как клиент покупает продукт?', subtitle: 'Опишите объём текущих или ожидаемых продаж. Приблизительные значения подходят для первой проверки.', keys: ['activeCustomers', 'price', 'purchases'] },
    { id: 'acquisition', short: 'Привлечение', title: 'Как вы получаете новых клиентов?', subtitle: 'Эти ответы определяют размер воронки и стоимость привлечения одного покупателя — CAC.', keys: ['leads', 'conversion', 'marketingSpend', 'salesSpend'] },
    { id: 'delivery', short: 'Юнит', title: 'Сколько стоит выполнить покупку?', subtitle: 'Учитывайте только расходы, которые возникают вместе с заказом или активным клиентом.', keys: ['variableCost', 'paymentFee', 'refundRate', 'supportCost'] },
    { id: 'retention', short: 'Удержание', title: 'Как долго клиент остаётся с вами?', subtitle: 'Подписочные модели используют churn. Для остальных моделей задаётся ожидаемый срок жизни клиента.' },
    { id: 'fixed', short: 'Расходы', title: 'Из чего состоят ежемесячные расходы?', subtitle: 'Разделите затраты по категориям — так станет видно, какая часть бюджета сильнее всего поднимает точку безубыточности.', keys: ['payroll', 'rent', 'software', 'admin', 'cash'] },
    { id: 'summary', short: 'Отчёт', title: 'Предварительная экономика готова', subtitle: 'Ниже — не просто итоговые цифры, а структура модели, слабые места и три приоритетных действия.' },
  ];

  const categoryMeta = {
    product: { label: 'Продукт и обслуживание', icon: '📦', color: '#5568e8' },
    acquisition: { label: 'Реклама и продажи', icon: '📣', color: '#8c5de7' },
    payroll: { label: 'Команда и персонал', icon: '👥', color: '#dc8c34' },
    premises: { label: 'Помещение', icon: '🏢', color: '#30a37a' },
    technology: { label: 'Софт и инфраструктура', icon: '💻', color: '#3489c9' },
    administration: { label: 'Административные', icon: '🗂️', color: '#8b94a8' },
  };

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
            <span class="wizard-kicker">✦ Базовый расчёт</span>
            <h2 class="wizard-title" id="wizardTitle">Пошаговый сценарий</h2>
            <p class="wizard-subtitle" id="wizardSubtitle">Семь шагов от бизнес-идеи до предварительного финансового отчёта.</p>
          </div>
          <button class="wizard-close" id="wizardClose" type="button" aria-label="Закрыть базовый расчёт">×</button>
        </div>
        <div class="wizard-progress-meta"><span id="wizardStepLabel">Шаг 1 из 7</span><span id="wizardPercent">0%</span></div>
        <div class="wizard-progress-track" aria-hidden="true"><span class="wizard-progress-fill" id="wizardProgressFill"></span></div>
        <div class="wizard-step-dots" id="wizardDots"></div>
      </header>
      <div class="wizard-body" id="wizardBody"></div>
      <footer class="wizard-footer">
        <span class="wizard-footer-note" id="wizardFooterNote">Черновые значения можно уточнить позже в Pro-режиме.</span>
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

  const moneyFormatter = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 });
  const numberFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
  const percentFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });

  function money(value) { return moneyFormatter.format(Number.isFinite(value) ? value : 0); }
  function number(value) { return numberFormatter.format(Number.isFinite(value) ? value : 0); }
  function percent(value) { return `${percentFormatter.format(Number.isFinite(value) ? value : 0)}%`; }
  function clampWizard(value, min, max) { return Math.min(max, Math.max(min, value)); }

  function wizardUnit(key) {
    const suffix = inputDefinitions[key]?.suffix || '';
    if (suffix.includes('₽')) return '₽';
    if (suffix.includes('%')) return '%';
    if (suffix.includes('мес')) return 'мес.';
    return '';
  }

  function effectiveLifetime(values) {
    return values.churn > 0 ? Math.min(60, 100 / values.churn) : values.lifetime;
  }

  function calculatePreview(values = wizardValues) {
    const v = values;
    const newCustomers = v.leads * (v.conversion / 100);
    const acquisitionSpend = v.marketingSpend + v.salesSpend;
    const cac = newCustomers > 0 ? acquisitionSpend / newCustomers : Infinity;
    const grossRevenue = v.activeCustomers * v.price * v.purchases;
    const paymentLosses = grossRevenue * ((v.paymentFee + v.refundRate) / 100);
    const directProductCost = v.activeCustomers * v.variableCost * v.purchases;
    const supportExpense = v.activeCustomers * v.supportCost;
    const productExpense = directProductCost + paymentLosses + supportExpense;
    const netPrice = v.price * (1 - v.paymentFee / 100) * (1 - v.refundRate / 100);
    const contributionPerPurchase = netPrice - v.variableCost;
    const monthlyContribution = contributionPerPurchase * v.purchases - v.supportCost;
    const contributionTotal = monthlyContribution * v.activeCustomers;
    const lifetime = effectiveLifetime(v);
    const ltv = monthlyContribution * lifetime;
    const ltvCac = Number.isFinite(cac) && cac > 0 ? ltv / cac : 0;
    const payback = monthlyContribution > 0 ? cac / monthlyContribution : Infinity;
    const fixedExpenses = v.payroll + v.rent + v.software + v.admin;
    const totalExpenses = productExpense + acquisitionSpend + fixedExpenses;
    const profit = grossRevenue - totalExpenses;
    const operatingMargin = grossRevenue > 0 ? profit / grossRevenue * 100 : 0;
    const breakEven = monthlyContribution > 0 ? (fixedExpenses + acquisitionSpend) / monthlyContribution : Infinity;
    const runway = profit < 0 ? v.cash / Math.abs(profit) : Infinity;
    const gapToBreakEven = Number.isFinite(breakEven) ? Math.max(0, Math.ceil(breakEven - v.activeCustomers)) : Infinity;
    const expenseEntries = [
      { key: 'product', value: productExpense },
      { key: 'acquisition', value: acquisitionSpend },
      { key: 'payroll', value: v.payroll },
      { key: 'premises', value: v.rent },
      { key: 'technology', value: v.software },
      { key: 'administration', value: v.admin },
    ].map(item => ({ ...item, ...categoryMeta[item.key], share: totalExpenses > 0 ? item.value / totalExpenses * 100 : 0 }));

    return {
      newCustomers, acquisitionSpend, cac, grossRevenue, productExpense, directProductCost,
      paymentLosses, supportExpense, monthlyContribution, contributionTotal, lifetime, ltv,
      ltvCac, payback, fixedExpenses, totalExpenses, profit, operatingMargin, breakEven,
      runway, gapToBreakEven, expenseEntries,
    };
  }

  function fieldMarkup(key) {
    const definition = inputDefinitions[key];
    const value = wizardValues[key];
    const unit = wizardUnit(key);
    return `
      <div class="wizard-field" data-field-key="${key}">
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
      <div class="wizard-question-head"><span class="wizard-question-number">01</span><div><h3>${wizardSteps[0].title}</h3><p>${wizardSteps[0].subtitle}</p></div></div>
      <div class="wizard-product-grid">
        ${Object.entries(templates).map(([key, product]) => `
          <button class="wizard-product ${wizardProduct === key ? 'selected' : ''}" data-wizard-product="${key}" type="button">
            <span class="wizard-product-check">✓</span>
            <span class="wizard-product-icon" aria-hidden="true">${product.icon}</span>
            <span><strong>${product.name}</strong><small>${product.subtitle}</small></span>
          </button>`).join('')}
      </div>
      <div class="wizard-tip"><span>💡</span><span>Выбирайте не по названию, а по логике продаж: разовая покупка, подписка, комиссия или длительное обслуживание.</span></div>
    </div>`;
  }

  function retentionKeys() {
    return templates[wizardProduct].fields.includes('churn') ? ['churn'] : ['lifetime'];
  }

  function expenseBreakdownMarkup(preview, compact = false) {
    const nonZero = preview.expenseEntries.filter(item => item.value > 0);
    const gradient = nonZero.length
      ? nonZero.reduce((result, item, index) => {
          const before = nonZero.slice(0, index).reduce((sum, current) => sum + current.share, 0);
          const after = before + item.share;
          return `${result}${index ? ',' : ''}${item.color} ${before}% ${after}%`;
        }, '')
      : '#e8ecf4 0 100%';

    return `<section class="wizard-expenses ${compact ? 'compact' : ''}" data-wizard-expenses>
      <div class="wizard-expenses-heading">
        <div><span>Расходы месяца</span><strong>${money(preview.totalExpenses)}</strong></div>
        <small>Доля каждой категории в общей сумме</small>
      </div>
      <div class="wizard-expense-stack" style="background:linear-gradient(90deg, ${gradient})" aria-label="Структура расходов"></div>
      <div class="wizard-expense-grid">
        ${preview.expenseEntries.map(item => `<article class="wizard-expense-item">
          <span class="wizard-expense-icon" style="background:${item.color}18;color:${item.color}">${item.icon}</span>
          <div><span>${item.label}</span><strong>${money(item.value)}</strong></div>
          <em>${percent(item.share)}</em>
        </article>`).join('')}
      </div>
    </section>`;
  }

  function renderFieldsStep(step) {
    const keys = step.id === 'retention' ? retentionKeys() : step.keys;
    const note = step.id === 'retention' && keys[0] === 'churn'
      ? `При текущем оттоке расчётный срок жизни клиента — около ${number(effectiveLifetime(wizardValues))} мес.`
      : step.id === 'retention'
        ? 'Используйте осторожную оценку: завышенный срок жизни искусственно улучшает LTV.'
        : 'Не знаете точное значение? Оставьте шаблон и замените его фактическими данными после первых продаж.';
    const stepNumber = String(wizardStep + 1).padStart(2, '0');
    const preview = calculatePreview();
    const expenseSection = step.id === 'fixed' ? expenseBreakdownMarkup(preview, true) : '';

    return `<div class="wizard-screen">
      <div class="wizard-question-head"><span class="wizard-question-number">${stepNumber}</span><div><h3>${step.title}</h3><p>${step.subtitle}</p></div></div>
      <div class="wizard-fields">${keys.map(fieldMarkup).join('')}</div>
      ${expenseSection}
      <div class="wizard-tip"><span>💡</span><span data-wizard-dynamic-tip>${note}</span></div>
    </div>`;
  }

  function businessVerdict(preview) {
    if (preview.monthlyContribution <= 0) return { tone: 'danger', icon: '⛔', title: 'Юнит убыточен', text: 'Одна покупка не покрывает собственную себестоимость и обслуживание. Масштабирование увеличит потери.' };
    if (preview.ltvCac < 1) return { tone: 'danger', icon: '⚠️', title: 'Привлечение уничтожает ценность', text: 'Клиент приносит меньше пожизненной маржи, чем стоит его привлечение.' };
    if (preview.profit < 0) return { tone: 'warning', icon: '◐', title: 'Юнит работает, бизнес пока нет', text: 'Отдельный клиент прибыльный, но объёма продаж пока недостаточно для покрытия всех расходов.' };
    if (preview.ltvCac < 3 || preview.payback > 12) return { tone: 'warning', icon: '△', title: 'Модель положительная, но хрупкая', text: 'Прибыль есть, однако CAC, удержание или срок окупаемости оставляют небольшой запас прочности.' };
    return { tone: 'success', icon: '✓', title: 'Модель выглядит жизнеспособной', text: 'Юнит создаёт ценность, общая модель прибыльна, а привлечение имеет запас для осторожного масштабирования.' };
  }

  function buildRecommendations(preview) {
    const candidates = [];
    const add = (score, title, text, impact) => candidates.push({ score, title, text, impact });

    if (preview.monthlyContribution <= 0) add(120, 'Сначала исправьте маржу одной покупки', `Месячная маржа клиента сейчас ${money(preview.monthlyContribution)}. Поднимите цену, сократите себестоимость или уберите дорогие элементы обслуживания до масштабирования.`, 'Сделать каждый новый заказ экономически положительным');
    if (preview.ltvCac < 1) add(115, 'Остановите масштабирование платного привлечения', `LTV/CAC равен ${number(preview.ltvCac)}×. Сначала снизьте CAC или увеличьте повторную ценность клиента, иначе дополнительный бюджет ускорит убыток.`, 'Вернуть LTV/CAC выше 1×');
    else if (preview.ltvCac < 3) add(88, 'Создайте запас между LTV и CAC', `Текущий LTV/CAC — ${number(preview.ltvCac)}×. Проверьте удержание, цену и качество рекламных каналов, чтобы модель выдерживала ошибки прогноза.`, 'Ориентир: приблизиться к 3×');

    if (preview.profit < 0 && Number.isFinite(preview.runway) && preview.runway < 4) add(110, 'Защитите денежный запас', `При текущем убытке ${money(Math.abs(preview.profit))} в месяц денег хватит примерно на ${number(preview.runway)} мес. Сократите необязательные расходы и проверьте спрос до новых вложений.`, 'Увеличить runway минимум до 6 месяцев');
    else if (preview.profit < 0) add(92, 'Закройте разрыв до безубыточности', Number.isFinite(preview.gapToBreakEven) ? `До точки безубыточности не хватает около ${preview.gapToBreakEven} активных клиентов. Проверьте, дешевле ли получить их или снизить крупнейшую категорию затрат.` : 'При текущей марже точка безубыточности недостижима. Вернитесь к цене и себестоимости.', 'Перевести операционный результат в плюс');

    if (Number.isFinite(preview.payback) && preview.payback > preview.lifetime) add(105, 'Сократите срок возврата CAC', `Привлечение окупается за ${number(preview.payback)} мес., а клиент живёт около ${number(preview.lifetime)} мес. Деньги не успевают вернуться.`, 'Payback должен быть короче жизни клиента');
    else if (Number.isFinite(preview.payback) && preview.payback > 12) add(82, 'Ускорьте окупаемость клиента', `CAC возвращается примерно за ${number(preview.payback)} мес. Попробуйте onboarding, годовую оплату, пакет или более точный канал привлечения.`, 'Снизить payback до 6–12 месяцев');

    if (wizardValues.churn > 8) add(84, 'Разберите причины раннего оттока', `Месячный churn ${number(wizardValues.churn)}% ограничивает срок жизни клиента примерно ${number(preview.lifetime)} месяцами. Ищите момент, когда пользователи не получают ожидаемую ценность.`, 'Рост retention напрямую увеличит LTV');
    if (wizardValues.refundRate > 7) add(72, 'Снизьте возвраты и несоответствие ожиданий', `Возвраты составляют ${number(wizardValues.refundRate)}% выручки. Проверьте обещания рекламы, качество продукта и первые 24 часа клиентского опыта.`, 'Вернуть потерянную выручку');
    if (wizardValues.conversion < 2) add(68, 'Проверьте оффер до увеличения трафика', `Конверсия ${number(wizardValues.conversion)}% означает, что большинство лидов не видит достаточной ценности. Улучшите предложение и доказательства, а не просто покупайте больше трафика.`, 'Больше клиентов при том же бюджете');

    const largest = [...preview.expenseEntries].sort((a, b) => b.value - a.value)[0];
    if (largest && largest.share > 38) add(64, `Проверьте крупнейшую статью: ${largest.label.toLowerCase()}`, `На неё приходится ${percent(largest.share)} всех расходов — ${money(largest.value)}. Не сокращайте вслепую: определите, какая часть реально создаёт продажи или качество.`, 'Снизить концентрацию затрат без потери результата');

    if (preview.profit >= 0 && preview.ltvCac >= 3) add(58, 'Масштабируйте один канал небольшими шагами', `Прибыль ${money(preview.profit)}, LTV/CAC ${number(preview.ltvCac)}×. Увеличьте один канал на 10–20% и проверьте, не ухудшился ли CAC.`, 'Проверить устойчивость экономики на росте');

    add(45, 'Разделите CAC по каналам', 'Не смешивайте рекламу, контент, рекомендации и продажи в одно среднее число. Считайте стоимость и качество клиента отдельно по каждому источнику.', 'Понять, какой канал действительно масштабируется');
    add(40, 'Заменяйте предположения фактическими когортами', 'Отмечайте месяц первой покупки и последующие возвращения. Так retention и LTV перестанут быть гипотезой.', 'Повысить надёжность финансовой модели');
    add(35, 'Проверьте готовность платить действием', 'Покажите предложение 5–10 потенциальным клиентам и просите заявку, предзаказ или оплату, а не мнение об идее.', 'Подтвердить реальный спрос');

    const unique = [];
    const seen = new Set();
    candidates.sort((a, b) => b.score - a.score).forEach(item => {
      if (!seen.has(item.title) && unique.length < 3) { seen.add(item.title); unique.push(item); }
    });
    return unique;
  }

  function recommendationsMarkup(preview) {
    const medals = [
      { className: 'gold', rank: '01', label: 'Gold advice', icon: '★' },
      { className: 'silver', rank: '02', label: 'Silver advice', icon: '◆' },
      { className: 'bronze', rank: '03', label: 'Bronze advice', icon: '▲' },
    ];
    return `<section class="wizard-advice-section">
      <div class="wizard-report-heading"><div><span>Приоритет действий</span><h4>Три главные рекомендации</h4></div><p>Отсортированы по влиянию на устойчивость модели.</p></div>
      <div class="wizard-advice-list">
        ${buildRecommendations(preview).map((item, index) => {
          const medal = medals[index];
          return `<article class="wizard-advice-card ${medal.className}">
            <div class="wizard-advice-medal"><span>${medal.icon}</span><small>${medal.rank}</small></div>
            <div class="wizard-advice-copy"><em>${medal.label}</em><strong>${item.title}</strong><p>${item.text}</p></div>
            <div class="wizard-advice-impact"><span>Ожидаемый эффект</span><strong>${item.impact}</strong></div>
          </article>`;
        }).join('')}
      </div>
    </section>`;
  }

  function renderSummaryStep() {
    const preview = calculatePreview();
    const verdict = businessVerdict(preview);
    const ltvCacText = preview.ltvCac > 0 ? `${number(preview.ltvCac)}×` : '—';
    const paybackText = Number.isFinite(preview.payback) ? `${number(preview.payback)} мес.` : 'не окупается';
    const runwayText = Number.isFinite(preview.runway) ? `${number(preview.runway)} мес.` : 'прибыльная модель';
    const maxFlow = Math.max(preview.grossRevenue, preview.totalExpenses, Math.abs(preview.profit), 1);

    return `<div class="wizard-screen wizard-report">
      <div class="wizard-question-head"><span class="wizard-question-number">07</span><div><h3>${wizardSteps[6].title}</h3><p>${wizardSteps[6].subtitle}</p></div></div>

      <section class="wizard-verdict ${verdict.tone}">
        <span class="wizard-verdict-icon">${verdict.icon}</span>
        <div><span>${templates[wizardProduct].icon} ${templates[wizardProduct].name}</span><h4>${verdict.title}</h4><p>${verdict.text}</p></div>
        <div class="wizard-verdict-profit"><span>Результат месяца</span><strong>${money(preview.profit)}</strong><em>${number(preview.operatingMargin)}% маржа</em></div>
      </section>

      <div class="wizard-summary wizard-summary-v2">
        <article class="wizard-summary-card"><span>CAC</span><strong>${Number.isFinite(preview.cac) ? money(preview.cac) : '—'}</strong><small>${number(preview.newCustomers)} новых клиентов</small></article>
        <article class="wizard-summary-card ${preview.ltvCac >= 1 ? 'positive' : 'negative'}"><span>LTV / CAC</span><strong>${ltvCacText}</strong><small>LTV ${money(preview.ltv)}</small></article>
        <article class="wizard-summary-card"><span>Окупаемость CAC</span><strong>${paybackText}</strong><small>жизнь ${number(preview.lifetime)} мес.</small></article>
        <article class="wizard-summary-card ${preview.profit >= 0 ? 'positive' : 'negative'}"><span>Runway</span><strong>${runwayText}</strong><small>запас ${money(wizardValues.cash)}</small></article>
      </div>

      <section class="wizard-flow-report">
        <div class="wizard-report-heading"><div><span>Экономика месяца</span><h4>Выручка → расходы → результат</h4></div><p>Предварительный P&L без оборудования и налоговых особенностей.</p></div>
        <div class="wizard-flow-row"><span>Выручка</span><div><i style="width:${preview.grossRevenue / maxFlow * 100}%"></i></div><strong>${money(preview.grossRevenue)}</strong></div>
        <div class="wizard-flow-row expense"><span>Все расходы</span><div><i style="width:${preview.totalExpenses / maxFlow * 100}%"></i></div><strong>${money(preview.totalExpenses)}</strong></div>
        <div class="wizard-flow-row ${preview.profit >= 0 ? 'profit' : 'loss'}"><span>${preview.profit >= 0 ? 'Прибыль' : 'Убыток'}</span><div><i style="width:${Math.abs(preview.profit) / maxFlow * 100}%"></i></div><strong>${money(Math.abs(preview.profit))}</strong></div>
        <div class="wizard-flow-foot">
          <span>Точка безубыточности: <strong>${Number.isFinite(preview.breakEven) ? `${Math.ceil(preview.breakEven)} клиентов` : 'недостижима'}</strong></span>
          <span>${preview.gapToBreakEven > 0 && Number.isFinite(preview.gapToBreakEven) ? `Не хватает: <strong>${preview.gapToBreakEven} клиентов</strong>` : 'Текущий объём покрывает расчётный порог'}</span>
        </div>
      </section>

      ${expenseBreakdownMarkup(preview)}
      ${recommendationsMarkup(preview)}

      <div class="wizard-tip"><span>ℹ️</span><span>После применения основная модель добавит оборудование, амортизацию, retention-графики и расширенную диагностику. Все ответы сохранятся.</span></div>
    </div>`;
  }

  function updateExpensePanel() {
    const panel = wizardBody.querySelector('[data-wizard-expenses]');
    if (!panel) return;
    const fresh = document.createElement('div');
    fresh.innerHTML = expenseBreakdownMarkup(calculatePreview(), true);
    panel.replaceWith(fresh.firstElementChild);
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
        const value = clampWizard(Number.isFinite(raw) ? raw : definition.min, definition.min, definition.max);
        wizardValues[key] = value;
        wizardBody.querySelectorAll(`[data-wizard-key="${key}"]`).forEach(linked => { if (linked !== event.target) linked.value = value; });
        if (wizardSteps[wizardStep].id === 'retention') {
          const tip = wizardBody.querySelector('[data-wizard-dynamic-tip]');
          if (tip && retentionKeys()[0] === 'churn') tip.textContent = `При текущем оттоке расчётный срок жизни клиента — около ${number(effectiveLifetime(wizardValues))} мес.`;
        }
        if (wizardSteps[wizardStep].id === 'fixed') updateExpensePanel();
      });
    });
  }

  function updateProgress() {
    const progress = wizardStep / (wizardSteps.length - 1) * 100;
    document.getElementById('wizardStepLabel').textContent = `Шаг ${wizardStep + 1} из ${wizardSteps.length}`;
    document.getElementById('wizardPercent').textContent = `${Math.round(progress)}%`;
    document.getElementById('wizardProgressFill').style.width = `${progress}%`;
    document.getElementById('wizardDots').innerHTML = wizardSteps.map((step, index) => `<span class="wizard-dot ${index < wizardStep ? 'done' : ''} ${index === wizardStep ? 'active' : ''}" title="${step.short}"><i></i><em>${step.short}</em></span>`).join('');
  }

  function renderWizard() {
    const step = wizardSteps[wizardStep];
    if (step.id === 'product') wizardBody.innerHTML = renderProductStep();
    else if (step.id === 'summary') wizardBody.innerHTML = renderSummaryStep();
    else wizardBody.innerHTML = renderFieldsStep(step);

    updateProgress();
    backButton.disabled = wizardStep === 0;
    nextButton.textContent = wizardStep === wizardSteps.length - 1 ? 'Применить и открыть дашборд' : 'Продолжить';
    document.getElementById('wizardFooterNote').textContent = wizardStep === wizardSteps.length - 1
      ? 'Проверьте отчёт — после применения все показатели появятся на дашборде.'
      : 'Черновые значения можно уточнить позже в Pro-режиме.';
    bindProductButtons();
    bindFieldInputs();
    wizardBody.scrollTop = 0;
    window.setTimeout(() => wizardBody.querySelector('input, button')?.focus({ preventScroll: true }), 20);
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
    showToast('Базовый расчёт применён — дашборд обновлён.');
    window.setTimeout(() => document.getElementById('businessDashboard')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 140);
  }

  backButton.addEventListener('click', () => { if (wizardStep > 0) { wizardStep -= 1; renderWizard(); } });
  nextButton.addEventListener('click', () => { if (wizardStep < wizardSteps.length - 1) { wizardStep += 1; renderWizard(); } else applyWizard(); });
  document.getElementById('wizardClose').addEventListener('click', closeWizard);
  overlay.addEventListener('click', event => { if (event.target === overlay) closeWizard(); });
  document.addEventListener('keydown', event => {
    if (!overlay.classList.contains('open')) return;
    if (event.key === 'Escape') closeWizard();
    if (event.key === 'Enter' && event.target.tagName !== 'BUTTON' && wizardStep !== wizardSteps.length - 1) { event.preventDefault(); nextButton.click(); }
  });

  const topActions = document.querySelector('.top-actions');
  if (topActions) {
    const launch = document.createElement('button');
    launch.className = 'button wizard-launch';
    launch.type = 'button';
    launch.innerHTML = '<span>✦ Базовый расчёт</span>';
    launch.addEventListener('click', openWizard);
    topActions.insertBefore(launch, topActions.firstChild);
  }

  const heroContent = document.querySelector('.hero > div');
  if (heroContent) {
    const heroLaunch = document.createElement('button');
    heroLaunch.className = 'wizard-hero-cta';
    heroLaunch.type = 'button';
    heroLaunch.innerHTML = '<span>Пройти базовый расчёт</span><b aria-hidden="true">→</b>';
    heroLaunch.addEventListener('click', openWizard);
    heroContent.appendChild(heroLaunch);
  }
})();