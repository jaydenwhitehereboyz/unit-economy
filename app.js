'use strict';

const money = new Intl.NumberFormat('ru-RU', {
  style: 'currency', currency: 'RUB', maximumFractionDigits: 0,
});
const number = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });

const inputDefinitions = {
  leads: { group: 'acquisition', label: 'Лиды в месяц', min: 10, max: 20000, step: 10, suffix: '', tooltip: 'Сколько потенциальных клиентов попадает в вашу воронку за месяц. Лид ещё не является покупателем.' },
  conversion: { group: 'acquisition', label: 'Конверсия в покупку', min: 0.1, max: 50, step: 0.1, suffix: '%', tooltip: 'Доля лидов, которые становятся платящими клиентами. 5% означает 5 покупателей из 100 лидов.' },
  marketingSpend: { group: 'acquisition', label: 'Маркетинговый бюджет', min: 0, max: 3000000, step: 5000, suffix: ' ₽', tooltip: 'Расходы на рекламу, контент, агентства, партнёрства и другие каналы привлечения за месяц.' },
  salesSpend: { group: 'acquisition', label: 'Расходы на продажи', min: 0, max: 1500000, step: 5000, suffix: ' ₽', tooltip: 'Зарплаты и бонусы продавцов, CRM, телефония и другие расходы, напрямую связанные с привлечением новых клиентов.' },
  activeCustomers: { group: 'ltv', label: 'Активные клиенты', min: 1, max: 10000, step: 1, suffix: '', tooltip: 'Сколько клиентов сейчас регулярно покупают продукт или пользуются подпиской. Нужно для расчёта экономики текущего месяца.' },
  price: { group: 'ltv', label: 'Средний чек', min: 50, max: 500000, step: 50, suffix: ' ₽', tooltip: 'Средняя сумма одной покупки или ежемесячного платежа одного клиента.' },
  purchases: { group: 'ltv', label: 'Покупок на клиента в месяц', min: 0.05, max: 30, step: 0.05, suffix: '', tooltip: 'Средняя частота покупок. Например, 0,25 означает одну покупку примерно раз в четыре месяца.' },
  variableCost: { group: 'ltv', label: 'Себестоимость одной покупки', min: 0, max: 400000, step: 50, suffix: ' ₽', tooltip: 'Переменные затраты на выполнение одного заказа: материалы, производство, доставка, преподавательские часы и прочее.' },
  paymentFee: { group: 'ltv', label: 'Комиссии платежей', min: 0, max: 25, step: 0.1, suffix: '%', tooltip: 'Комиссии эквайринга, маркетплейса, App Store или другого посредника, удерживаемые с выручки.' },
  refundRate: { group: 'ltv', label: 'Возвраты и списания', min: 0, max: 30, step: 0.1, suffix: '%', tooltip: 'Доля выручки, которую бизнес теряет из-за возвратов, отмен, фрода или неоплаченных счетов.' },
  supportCost: { group: 'ltv', label: 'Поддержка клиента в месяц', min: 0, max: 50000, step: 50, suffix: ' ₽', tooltip: 'Переменные расходы на поддержку одного активного клиента: куратор, техподдержка, расходные материалы.' },
  lifetime: { group: 'ltv', label: 'Срок жизни клиента', min: 1, max: 60, step: 1, suffix: ' мес.', tooltip: 'Сколько месяцев клиент в среднем остаётся с бизнесом и совершает покупки.' },
  churn: { group: 'ltv', label: 'Месячный отток', min: 0, max: 50, step: 0.1, suffix: '%', tooltip: 'Доля активных клиентов, которые уходят каждый месяц. При оттоке 5% расчётный срок жизни около 20 месяцев.' },
  payroll: { group: 'fixed', label: 'Команда и зарплаты', min: 0, max: 5000000, step: 5000, suffix: ' ₽', tooltip: 'Постоянные зарплаты, налоги на фонд оплаты труда и выплаты сотрудникам, не зависящие напрямую от числа заказов.' },
  rent: { group: 'fixed', label: 'Аренда и помещение', min: 0, max: 1500000, step: 5000, suffix: ' ₽', tooltip: 'Офис, склад, класс, кухня, коммунальные платежи и обслуживание помещения.' },
  software: { group: 'fixed', label: 'Софт и инфраструктура', min: 0, max: 1000000, step: 1000, suffix: ' ₽', tooltip: 'Сервисы, хостинг, CRM, аналитика, лицензии, интернет и облачная инфраструктура.' },
  admin: { group: 'fixed', label: 'Административные расходы', min: 0, max: 1000000, step: 1000, suffix: ' ₽', tooltip: 'Бухгалтерия, юристы, связь, банковское обслуживание, страхование и другие накладные расходы.' },
  cash: { group: 'fixed', label: 'Деньги на старте', min: 0, max: 20000000, step: 10000, suffix: ' ₽', tooltip: 'Доступный денежный запас. Если бизнес убыточен, он определяет примерный финансовый runway.' },
};

const assets = {
  coffeeMachine: { name: 'Кофемашина', icon: '☕', cost: 230000, life: 48 },
  grinder: { name: 'Кофемолка', icon: '⚙️', cost: 60000, life: 36 },
  laptop: { name: 'Ноутбук', icon: '💻', cost: 95000, life: 36 },
  workstation: { name: 'Рабочее место', icon: '🖥️', cost: 145000, life: 48 },
  classroom: { name: 'Учебное место', icon: '🪑', cost: 28000, life: 48 },
  camera: { name: 'Камера и свет', icon: '🎥', cost: 180000, life: 48 },
  stock: { name: 'Стартовый товар', icon: '📦', cost: 150000, life: 12 },
  delivery: { name: 'Транспорт', icon: '🚚', cost: 1250000, life: 72 },
  kitchen: { name: 'Кухонное оснащение', icon: '🍳', cost: 420000, life: 60 },
  server: { name: 'Серверы', icon: '🗄️', cost: 280000, life: 48 },
  phone: { name: 'Тестовые устройства', icon: '📱', cost: 210000, life: 36 },
  printer: { name: 'Печать и упаковка', icon: '🖨️', cost: 85000, life: 36 },
};

const templates = {
  saas: {
    name: 'SaaS', icon: '☁️', subtitle: 'Подписка на онлайн-сервис', description: 'Повторная выручка, churn и серверные расходы.',
    values: { leads: 1400, conversion: 4, marketingSpend: 240000, salesSpend: 100000, activeCustomers: 420, price: 3900, purchases: 1, variableCost: 250, paymentFee: 3.2, refundRate: 1.5, supportCost: 380, lifetime: 20, churn: 5, payroll: 620000, rent: 0, software: 130000, admin: 65000, cash: 3500000 },
    fields: ['leads','conversion','marketingSpend','salesSpend','activeCustomers','price','purchases','variableCost','paymentFee','refundRate','supportCost','churn','payroll','rent','software','admin','cash'], assets: ['laptop','server','phone']
  },
  service: {
    name: 'Услуга', icon: '🛠️', subtitle: 'Разовая или повторная услуга', description: 'Мастер, специалист, ремонт или консультации.',
    values: { leads: 260, conversion: 18, marketingSpend: 90000, salesSpend: 25000, activeCustomers: 65, price: 8500, purchases: 0.7, variableCost: 1800, paymentFee: 2.5, refundRate: 1, supportCost: 0, lifetime: 10, churn: 0, payroll: 260000, rent: 70000, software: 18000, admin: 22000, cash: 750000 },
    fields: ['leads','conversion','marketingSpend','salesSpend','activeCustomers','price','purchases','variableCost','paymentFee','refundRate','supportCost','lifetime','payroll','rent','software','admin','cash'], assets: ['laptop','workstation','delivery']
  },
  course: {
    name: 'Онлайн-курс', icon: '🎬', subtitle: 'Один цифровой продукт', description: 'Запуски, трафик, кураторы и возвраты.',
    values: { leads: 3200, conversion: 2.8, marketingSpend: 480000, salesSpend: 120000, activeCustomers: 190, price: 19900, purchases: 0.17, variableCost: 1300, paymentFee: 3.5, refundRate: 7, supportCost: 900, lifetime: 6, churn: 0, payroll: 410000, rent: 0, software: 55000, admin: 42000, cash: 1800000 },
    fields: ['leads','conversion','marketingSpend','salesSpend','activeCustomers','price','purchases','variableCost','paymentFee','refundRate','supportCost','lifetime','payroll','rent','software','admin','cash'], assets: ['camera','laptop','printer']
  },
  school: {
    name: 'Онлайн-школа', icon: '🎓', subtitle: 'Потоки и длительное обучение', description: 'Группы, преподаватели, кураторы и отдел продаж.',
    values: { leads: 5400, conversion: 3.4, marketingSpend: 750000, salesSpend: 320000, activeCustomers: 360, price: 14500, purchases: 1, variableCost: 3200, paymentFee: 3, refundRate: 5, supportCost: 1600, lifetime: 7, churn: 0, payroll: 920000, rent: 60000, software: 90000, admin: 85000, cash: 4200000 },
    fields: ['leads','conversion','marketingSpend','salesSpend','activeCustomers','price','purchases','variableCost','paymentFee','refundRate','supportCost','lifetime','payroll','rent','software','admin','cash'], assets: ['camera','laptop','classroom']
  },
  ecommerce: {
    name: 'Интернет-магазин', icon: '📦', subtitle: 'Товары и повторные покупки', description: 'Себестоимость, логистика, комиссии и возвраты.',
    values: { leads: 12000, conversion: 2.2, marketingSpend: 360000, salesSpend: 0, activeCustomers: 650, price: 4200, purchases: 0.55, variableCost: 1850, paymentFee: 5.5, refundRate: 6, supportCost: 120, lifetime: 14, churn: 0, payroll: 290000, rent: 120000, software: 35000, admin: 45000, cash: 2300000 },
    fields: ['leads','conversion','marketingSpend','salesSpend','activeCustomers','price','purchases','variableCost','paymentFee','refundRate','supportCost','lifetime','payroll','rent','software','admin','cash'], assets: ['stock','printer','delivery']
  },
  coffee: {
    name: 'Кофейня', icon: '☕', subtitle: 'Офлайн-точка и напитки', description: 'Проходимость, средний чек, продукты и оборудование.',
    values: { leads: 4800, conversion: 34, marketingSpend: 45000, salesSpend: 0, activeCustomers: 920, price: 390, purchases: 2.5, variableCost: 125, paymentFee: 2.2, refundRate: 0.5, supportCost: 0, lifetime: 18, churn: 0, payroll: 380000, rent: 180000, software: 18000, admin: 45000, cash: 1700000 },
    fields: ['leads','conversion','marketingSpend','salesSpend','activeCustomers','price','purchases','variableCost','paymentFee','refundRate','supportCost','lifetime','payroll','rent','software','admin','cash'], assets: ['coffeeMachine','grinder','kitchen']
  },
  agency: {
    name: 'Агентство', icon: '🧠', subtitle: 'Проектная работа для бизнеса', description: 'Чеки выше, цикл продаж длиннее, основная стоимость — команда.',
    values: { leads: 120, conversion: 11, marketingSpend: 80000, salesSpend: 150000, activeCustomers: 18, price: 115000, purchases: 1, variableCost: 28000, paymentFee: 1.5, refundRate: 1, supportCost: 9000, lifetime: 9, churn: 0, payroll: 850000, rent: 120000, software: 70000, admin: 75000, cash: 3000000 },
    fields: ['leads','conversion','marketingSpend','salesSpend','activeCustomers','price','purchases','variableCost','paymentFee','refundRate','supportCost','lifetime','payroll','rent','software','admin','cash'], assets: ['laptop','workstation','camera']
  },
  marketplace: {
    name: 'Маркетплейс', icon: '🔄', subtitle: 'Комиссия с транзакций', description: 'Две стороны рынка, GMV, комиссия и поддержка.',
    values: { leads: 9000, conversion: 5.5, marketingSpend: 670000, salesSpend: 180000, activeCustomers: 1800, price: 1200, purchases: 1.6, variableCost: 280, paymentFee: 7, refundRate: 3, supportCost: 110, lifetime: 16, churn: 0, payroll: 1100000, rent: 90000, software: 230000, admin: 90000, cash: 6500000 },
    fields: ['leads','conversion','marketingSpend','salesSpend','activeCustomers','price','purchases','variableCost','paymentFee','refundRate','supportCost','lifetime','payroll','rent','software','admin','cash'], assets: ['server','laptop','phone']
  },
  mobile: {
    name: 'Мобильное приложение', icon: '📱', subtitle: 'Подписка или покупки внутри', description: 'Store-комиссии, churn, разработка и поддержка.',
    values: { leads: 18000, conversion: 1.8, marketingSpend: 520000, salesSpend: 0, activeCustomers: 950, price: 790, purchases: 1, variableCost: 45, paymentFee: 15, refundRate: 2, supportCost: 90, lifetime: 12, churn: 8.3, payroll: 780000, rent: 0, software: 160000, admin: 55000, cash: 3800000 },
    fields: ['leads','conversion','marketingSpend','salesSpend','activeCustomers','price','purchases','variableCost','paymentFee','refundRate','supportCost','churn','payroll','rent','software','admin','cash'], assets: ['phone','laptop','server']
  },
  offlineSchool: {
    name: 'Учебный центр', icon: '🏫', subtitle: 'Офлайн-занятия и группы', description: 'Помещение, преподаватели, оборудование и загрузка.',
    values: { leads: 650, conversion: 12, marketingSpend: 160000, salesSpend: 45000, activeCustomers: 150, price: 8500, purchases: 1, variableCost: 1400, paymentFee: 2, refundRate: 2, supportCost: 700, lifetime: 8, churn: 0, payroll: 520000, rent: 260000, software: 25000, admin: 50000, cash: 2400000 },
    fields: ['leads','conversion','marketingSpend','salesSpend','activeCustomers','price','purchases','variableCost','paymentFee','refundRate','supportCost','lifetime','payroll','rent','software','admin','cash'], assets: ['classroom','laptop','printer']
  }
};

const scenarioMultipliers = {
  conservative: { leads: .8, conversion: .8, price: .95, purchases: .85, lifetime: .8, churn: 1.25, marketingSpend: 1.05, variableCost: 1.08, refundRate: 1.25 },
  base: {},
  growth: { leads: 1.25, conversion: 1.18, price: 1.05, purchases: 1.12, lifetime: 1.15, churn: .8, marketingSpend: 1.2, variableCost: .97, refundRate: .85 }
};

const state = {
  product: 'saas', scenario: 'base', values: {}, baseValues: {}, assetQty: {},
};

const el = (id) => document.getElementById(id);

function formatValue(key, value) {
  const def = inputDefinitions[key];
  if (!def) return number.format(value);
  if (def.suffix.includes('₽')) return `${number.format(value)} ₽`;
  if (def.suffix === '%') return `${number.format(value)}%`;
  if (def.suffix.includes('мес')) return `${number.format(value)} мес.`;
  return number.format(value);
}

function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
function safeDivide(a, b) { return b > 0 ? a / b : 0; }
function effectiveLifetime(values) { return values.churn > 0 ? Math.min(60, 1 / (values.churn / 100)) : values.lifetime; }

function calculations() {
  const v = state.values;
  const newCustomers = v.leads * (v.conversion / 100);
  const acquisitionSpend = v.marketingSpend + v.salesSpend;
  const cac = safeDivide(acquisitionSpend, newCustomers);
  const netPrice = v.price * (1 - v.paymentFee / 100) * (1 - v.refundRate / 100);
  const contributionPerPurchase = netPrice - v.variableCost;
  const monthlyContributionPerCustomer = contributionPerPurchase * v.purchases - v.supportCost;
  const lifetime = effectiveLifetime(v);
  const ltv = monthlyContributionPerCustomer * lifetime;
  const ltvCac = safeDivide(ltv, cac);
  const payback = safeDivide(cac, monthlyContributionPerCustomer);
  const monthlyRevenue = v.activeCustomers * v.price * v.purchases;
  const variableExpenses = v.activeCustomers * ((v.variableCost * v.purchases) + (v.price * v.purchases * (v.paymentFee + v.refundRate) / 100) + v.supportCost);
  const fixedExpenses = v.payroll + v.rent + v.software + v.admin;
  const assetEntries = Object.entries(state.assetQty).map(([key, qty]) => ({ ...assets[key], key, qty }));
  const upfrontAssets = assetEntries.reduce((sum, item) => sum + item.cost * item.qty, 0);
  const depreciation = assetEntries.reduce((sum, item) => sum + (item.cost * item.qty / item.life), 0);
  const operatingProfit = monthlyRevenue - variableExpenses - acquisitionSpend - fixedExpenses - depreciation;
  const cashProfit = monthlyRevenue - variableExpenses - acquisitionSpend - fixedExpenses;
  const breakEvenCustomers = monthlyContributionPerCustomer > 0 ? (fixedExpenses + acquisitionSpend + depreciation) / monthlyContributionPerCustomer : Infinity;
  const breakEvenTransactions = contributionPerPurchase > 0 ? (fixedExpenses + acquisitionSpend + depreciation) / contributionPerPurchase : Infinity;
  const runway = operatingProfit < 0 ? safeDivide(v.cash, Math.abs(operatingProfit)) : Infinity;
  const investmentPayback = cashProfit > 0 ? safeDivide(upfrontAssets, cashProfit) : Infinity;
  const churned = v.activeCustomers * (v.churn / 100);
  const netGrowth = newCustomers - churned;
  return { newCustomers, acquisitionSpend, cac, netPrice, contributionPerPurchase, monthlyContributionPerCustomer, lifetime, ltv, ltvCac, payback, monthlyRevenue, variableExpenses, fixedExpenses, upfrontAssets, depreciation, operatingProfit, cashProfit, breakEvenCustomers, breakEvenTransactions, runway, investmentPayback, churned, netGrowth, assetEntries };
}

function renderProducts() {
  el('productGrid').innerHTML = Object.entries(templates).map(([key, product]) => `
    <button class="product-card ${state.product === key ? 'active' : ''}" type="button" data-product="${key}">
      <span class="product-check">✓</span><span class="product-icon">${product.icon}</span>
      <strong>${product.name}</strong><small>${product.subtitle}</small>
    </button>`).join('');
  document.querySelectorAll('[data-product]').forEach(button => button.addEventListener('click', () => loadProduct(button.dataset.product)));
}

function makeControl(key) {
  const def = inputDefinitions[key];
  const value = state.values[key];
  return `<div class="control-row" data-control="${key}">
    <div class="control-label">
      <div class="label-with-tip"><label for="range-${key}">${def.label}</label><span class="help" tabindex="0" data-tooltip="${def.tooltip}">?</span></div>
      <input class="value-input" id="input-${key}" data-key="${key}" type="number" min="${def.min}" max="${def.max}" step="${def.step}" value="${value}" aria-label="${def.label}" />
    </div>
    <div class="range-wrap">
      <input class="range" id="range-${key}" data-key="${key}" type="range" min="${def.min}" max="${def.max}" step="${def.step}" value="${value}" />
      <span class="range-minmax">до ${formatValue(key, def.max)}</span>
    </div>
  </div>`;
}

function renderInputs() {
  const fields = templates[state.product].fields;
  ['acquisition','ltv','fixed'].forEach(group => {
    el(`${group === 'acquisition' ? 'acquisition' : group}Inputs`).innerHTML = fields.filter(key => inputDefinitions[key].group === group).map(makeControl).join('');
  });
  document.querySelectorAll('.range, .value-input').forEach(input => {
    input.addEventListener('input', event => {
      const key = event.target.dataset.key;
      const def = inputDefinitions[key];
      const value = clamp(Number(event.target.value), def.min, def.max);
      state.values[key] = value;
      const range = el(`range-${key}`); const numeric = el(`input-${key}`);
      if (range && range !== event.target) range.value = value;
      if (numeric && numeric !== event.target) numeric.value = value;
      state.scenario = 'base'; updateScenarioButtons(); saveState(); updateResults();
    });
  });
}

function renderAssets() {
  const assetKeys = templates[state.product].assets;
  el('assetGrid').innerHTML = assetKeys.map(key => {
    const item = assets[key]; const qty = state.assetQty[key] || 0;
    return `<article class="asset-card ${qty > 0 ? 'active' : ''}" data-asset-card="${key}">
      <div class="asset-visual" aria-hidden="true">${item.icon}</div>
      <strong>${item.name}</strong><small>${money.format(item.cost)} · ${item.life} мес.</small>
      <div class="asset-controls"><div class="qty-control">
        <button type="button" data-asset="${key}" data-change="-1" aria-label="Уменьшить количество ${item.name}">−</button>
        <output id="qty-${key}">${qty}</output>
        <button type="button" data-asset="${key}" data-change="1" aria-label="Увеличить количество ${item.name}">+</button>
      </div><span class="asset-cost" id="cost-${key}">${money.format(item.cost * qty)}</span></div>
    </article>`;
  }).join('');
  document.querySelectorAll('[data-asset]').forEach(button => button.addEventListener('click', () => {
    const key = button.dataset.asset; const delta = Number(button.dataset.change);
    state.assetQty[key] = clamp((state.assetQty[key] || 0) + delta, 0, 20);
    saveState(); renderAssets(); updateResults();
  }));
}

function metricCard(title, value, note, tooltip, featured = false, tone = '') {
  return `<article class="metric-card ${featured ? 'featured' : ''} ${tone}">
    <div class="metric-title">${title}<span class="help" tabindex="0" data-tooltip="${tooltip}">?</span></div>
    <strong>${value}</strong><small>${note}</small>
  </article>`;
}

function updateResults() {
  const c = calculations();
  el('cacBadge').textContent = `CAC ${money.format(c.cac)}`;
  el('ltvBadge').textContent = `LTV ${money.format(c.ltv)}`;
  el('fixedBadge').textContent = money.format(c.fixedExpenses);

  const score = calculateHealth(c);
  const healthCard = el('healthCard');
  healthCard.classList.remove('good','warn','bad'); healthCard.classList.add(score.className);
  el('healthPill').textContent = score.label;
  el('healthScore').textContent = `${score.value}/100`;
  el('healthTrack').style.width = `${score.value}%`;
  el('healthTrack').style.background = score.color;
  el('healthText').textContent = score.text;

  const profitTone = c.operatingProfit >= 0 ? 'positive' : 'negative';
  el('metricsGrid').innerHTML = [
    metricCard('LTV / CAC', `${number.format(c.ltvCac)}×`, c.ltvCac >= 3 ? 'сильный запас' : 'нужно улучшать', 'Сколько пожизненной маржинальной прибыли приходится на один рубль привлечения.', true, c.ltvCac >= 1 ? 'positive' : 'negative'),
    metricCard('CAC', money.format(c.cac), `${number.format(c.newCustomers)} новых клиентов`, 'Полная стоимость привлечения одного нового платящего клиента.'),
    metricCard('LTV', money.format(c.ltv), `${number.format(c.lifetime)} мес. жизни`, 'Пожизненная маржинальная прибыль одного клиента, а не его выручка.'),
    metricCard('Окупаемость CAC', Number.isFinite(c.payback) ? `${number.format(c.payback)} мес.` : 'не окупается', c.payback <= 6 ? 'быстрый возврат' : 'долгий возврат', 'Сколько месяцев нужно, чтобы маржа клиента вернула стоимость его привлечения.'),
    metricCard('Прибыль месяца', money.format(c.operatingProfit), `после ${money.format(c.depreciation)} амортизации`, 'Операционная прибыль модели за текущий месяц после переменных, постоянных расходов, привлечения и амортизации.', false, profitTone),
    metricCard('Точка безубыточности', Number.isFinite(c.breakEvenCustomers) ? `${Math.ceil(c.breakEvenCustomers)} клиентов` : 'недостижима', `${Math.ceil(c.breakEvenTransactions)} транзакций`, 'Минимальное число активных клиентов, при котором месячная маржа покрывает все расходы.'),
    metricCard('Стартовые активы', money.format(c.upfrontAssets), Number.isFinite(c.investmentPayback) ? `окупятся за ${number.format(c.investmentPayback)} мес.` : 'пока не окупаются', 'Стоимость выбранного оборудования. Срок окупаемости рассчитан по денежной прибыли до амортизации.'),
    metricCard('Runway', Number.isFinite(c.runway) ? `${number.format(c.runway)} мес.` : 'не ограничен', c.operatingProfit < 0 ? 'до исчерпания денег' : 'модель генерирует прибыль', 'Сколько месяцев бизнес сможет работать при текущем убытке и денежном запасе.'),
    metricCard('Рост базы', `${c.netGrowth >= 0 ? '+' : ''}${number.format(c.netGrowth)}`, `ушло ${number.format(c.churned)} клиентов`, 'Новые клиенты минус клиенты, потерянные из-за оттока за месяц.', false, c.netGrowth >= 0 ? 'positive' : 'negative'),
  ].join('');

  updateCashflow(c); updateExpenseVisual(c); updateDiagnosis(c);
}

function calculateHealth(c) {
  let value = 0;
  value += clamp(c.ltvCac / 3, 0, 1) * 30;
  value += clamp(1 - c.payback / 18, 0, 1) * 20;
  value += c.monthlyContributionPerCustomer > 0 ? 15 : 0;
  value += c.operatingProfit > 0 ? 20 : clamp(1 - Math.abs(c.operatingProfit) / Math.max(c.monthlyRevenue, 1), 0, 1) * 8;
  value += c.netGrowth >= 0 ? 10 : 0;
  value += c.runway >= 12 || !Number.isFinite(c.runway) ? 5 : clamp(c.runway / 12, 0, 1) * 5;
  value = Math.round(clamp(value, 0, 100));
  if (value >= 72) return { value, className: 'good', label: 'Здоровая', color: 'var(--green)', text: 'Юнит приносит ценность, а месячная модель близка к устойчивой или уже прибыльна.' };
  if (value >= 45) return { value, className: 'warn', label: 'Требует внимания', color: 'var(--amber)', text: 'Основа может работать, но один или несколько рычагов ограничивают устойчивый рост.' };
  return { value, className: 'bad', label: 'Рискованная', color: 'var(--red)', text: 'Масштабирование текущей модели может ускорить убытки. Сначала исправьте слабые показатели.' };
}

function updateCashflow(c) {
  const rows = [
    { label: 'Выручка', value: c.monthlyRevenue, color: '#4263eb' },
    { label: 'Переменные', value: c.variableExpenses, color: '#8da2fb' },
    { label: 'Привлечение', value: c.acquisitionSpend, color: '#f0aa4a' },
    { label: 'Постоянные', value: c.fixedExpenses + c.depreciation, color: '#5fb99e' },
    { label: 'Результат', value: Math.abs(c.operatingProfit), color: c.operatingProfit >= 0 ? '#12926f' : '#d64545' },
  ];
  const max = Math.max(...rows.map(r => r.value), 1);
  el('cashflowChart').innerHTML = rows.map(row => `<div class="bar-row"><span class="bar-label">${row.label}</span><div class="bar-track"><div class="bar-fill" style="width:${row.value / max * 100}%;background:${row.color}"></div></div><span class="bar-value">${money.format(row.value)}</span></div>`).join('');
  el('cashflowLegend').innerHTML = `<span><i style="background:#12926f"></i>прибыль</span><span><i style="background:#d64545"></i>убыток</span><span>Результат: <strong style="color:${c.operatingProfit >= 0 ? '#12926f' : '#d64545'}">${money.format(c.operatingProfit)}</strong></span>`;
}

function updateExpenseVisual(c) {
  const data = [
    { label: 'Переменные', value: c.variableExpenses, color: '#4263eb' },
    { label: 'Привлечение', value: c.acquisitionSpend, color: '#8da2fb' },
    { label: 'Постоянные', value: c.fixedExpenses, color: '#5fb99e' },
    { label: 'Амортизация', value: c.depreciation, color: '#f0aa4a' },
  ];
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let cursor = 0;
  const segments = data.map(item => {
    const start = cursor; cursor += safeDivide(item.value, total) * 100;
    return `${item.color} ${start}% ${cursor}%`;
  }).join(', ');
  el('expenseDonut').style.background = total > 0 ? `conic-gradient(${segments})` : '#edf1f7';
  el('expenseTotal').textContent = money.format(total);
  el('expenseList').innerHTML = data.map(item => `<div class="expense-item"><i class="expense-dot" style="background:${item.color}"></i><span>${item.label}</span><strong>${money.format(item.value)}</strong></div>`).join('');
}

function updateDiagnosis(c) {
  const items = [];
  if (c.monthlyContributionPerCustomer <= 0) items.push(['⛔','Отрицательная маржа клиента','После себестоимости и поддержки клиент не покрывает даже собственное обслуживание. Поднимите цену или снизьте переменные затраты.']);
  else items.push(['✅','Юнит создаёт маржу',`Один активный клиент оставляет около ${money.format(c.monthlyContributionPerCustomer)} в месяц до покрытия общих расходов.`]);
  if (c.ltvCac < 1) items.push(['🚨','Привлечение уничтожает ценность',`LTV ниже CAC. Каждый привлечённый клиент теряет примерно ${money.format(Math.abs(c.ltv - c.cac))} за жизненный цикл.`]);
  else if (c.ltvCac < 3) items.push(['⚠️','Запас LTV/CAC невелик','Модель положительная, но чувствительна к ошибкам в оттоке, возвратах и рекламных расходах.']);
  else items.push(['📈','Хороший запас LTV/CAC',`Каждый рубль привлечения создаёт около ${number.format(c.ltvCac)} ₽ пожизненной маржи.`]);
  if (c.operatingProfit < 0) items.push(['🧯','Месяц остаётся убыточным',`Не хватает примерно ${Math.max(0, Math.ceil(c.breakEvenCustomers - state.values.activeCustomers))} активных клиентов до расчётной точки безубыточности.`]);
  else items.push(['💚','Операционная прибыль положительна',`После всех введённых расходов остаётся около ${money.format(c.operatingProfit)} в месяц.`]);
  if (Number.isFinite(c.runway) && c.runway < 6) items.push(['⏳','Мало времени на исправления',`При текущем убытке денежного запаса хватит примерно на ${number.format(c.runway)} месяца.`]);
  if (c.payback > c.lifetime && c.monthlyContributionPerCustomer > 0) items.push(['🕳️','CAC не успевает окупиться','Расчётный срок окупаемости длиннее жизни клиента. Нужно снижать CAC или улучшать удержание.']);
  el('diagnosisList').innerHTML = items.slice(0,5).map(([icon,title,text]) => `<article class="diagnosis-item"><span class="diagnosis-icon">${icon}</span><div><strong>${title}</strong><p>${text}</p></div></article>`).join('');
}

function updateModelSummary() {
  const t = templates[state.product];
  el('modelSummary').innerHTML = `<span class="model-summary-icon">${t.icon}</span><div><strong>${t.name}: ${t.subtitle}</strong><span>${t.description}</span></div>`;
}

function updateScenarioButtons() {
  document.querySelectorAll('[data-scenario]').forEach(btn => btn.classList.toggle('active', btn.dataset.scenario === state.scenario));
}

function applyScenario(name) {
  state.scenario = name;
  const multipliers = scenarioMultipliers[name];
  state.values = { ...state.baseValues };
  Object.entries(multipliers).forEach(([key, multiplier]) => {
    if (typeof state.values[key] === 'number') {
      const def = inputDefinitions[key];
      state.values[key] = clamp(Number((state.values[key] * multiplier).toFixed(2)), def.min, def.max);
    }
  });
  updateScenarioButtons(); renderInputs(); saveState(); updateResults();
}

function loadProduct(key, fromStorage = false) {
  state.product = key;
  state.scenario = 'base';
  if (!fromStorage) {
    state.baseValues = { ...templates[key].values };
    state.values = { ...state.baseValues };
    state.assetQty = Object.fromEntries(templates[key].assets.map((asset, index) => [asset, index === 0 ? 1 : 0]));
  }
  renderProducts(); updateModelSummary(); updateScenarioButtons(); renderInputs(); renderAssets(); saveState(); updateResults();
}

function saveState() {
  localStorage.setItem('unitlab-state', JSON.stringify({ product: state.product, scenario: state.scenario, values: state.values, baseValues: state.baseValues, assetQty: state.assetQty }));
}

function restoreState() {
  try {
    const stored = JSON.parse(localStorage.getItem('unitlab-state'));
    if (stored && templates[stored.product]) {
      Object.assign(state, stored);
      loadProduct(state.product, true); return;
    }
  } catch (error) { console.warn('Не удалось восстановить состояние', error); }
  loadProduct('saas');
}

function reset() {
  localStorage.removeItem('unitlab-state'); loadProduct(state.product); showToast('Параметры сброшены к шаблону.');
}

function exportData() {
  const payload = { generatedAt: new Date().toISOString(), product: templates[state.product].name, inputs: state.values, assets: state.assetQty, results: calculations() };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob); const link = document.createElement('a');
  link.href = url; link.download = `unitlab-${state.product}.json`; link.click(); URL.revokeObjectURL(url);
  showToast('Сценарий экспортирован в JSON.');
}

let toastTimer;
function showToast(message) {
  const toast = el('toast'); toast.textContent = message; toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

document.querySelectorAll('[data-scenario]').forEach(button => button.addEventListener('click', () => applyScenario(button.dataset.scenario)));
el('resetButton').addEventListener('click', reset);
el('exportButton').addEventListener('click', exportData);
restoreState();
