'use strict';

(() => {
  if (window.__unitLabWizardEnhancementsLoaded) return;
  window.__unitLabWizardEnhancementsLoaded = true;

  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = 'wizard-fix.css?v=2';
  document.head.appendChild(style);

  let mirrorProduct = typeof state !== 'undefined' ? state.product : 'saas';
  let mirrorValues = typeof state !== 'undefined' ? { ...state.values } : {};

  const moneyFormatter = new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  });
  const numberFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });

  function money(value) {
    return moneyFormatter.format(Number.isFinite(value) ? value : 0);
  }

  function number(value) {
    return numberFormatter.format(Number.isFinite(value) ? value : 0);
  }

  function calculate(values) {
    const v = values;
    const newCustomers = v.leads * (v.conversion / 100);
    const acquisitionSpend = v.marketingSpend + v.salesSpend;
    const cac = newCustomers > 0 ? acquisitionSpend / newCustomers : Infinity;
    const netPrice = v.price * (1 - v.paymentFee / 100) * (1 - v.refundRate / 100);
    const contributionPerPurchase = netPrice - v.variableCost;
    const monthlyContribution = contributionPerPurchase * v.purchases - v.supportCost;
    const lifetime = v.churn > 0 ? Math.min(60, 100 / v.churn) : v.lifetime;
    const ltv = monthlyContribution * lifetime;
    const ltvCac = Number.isFinite(cac) && cac > 0 ? ltv / cac : 0;
    const payback = monthlyContribution > 0 ? cac / monthlyContribution : Infinity;
    const revenue = v.activeCustomers * v.price * v.purchases;
    const variableExpenses = v.activeCustomers * (
      (v.variableCost * v.purchases)
      + (v.price * v.purchases * (v.paymentFee + v.refundRate) / 100)
      + v.supportCost
    );
    const fixedExpenses = v.payroll + v.rent + v.software + v.admin;
    const profit = revenue - variableExpenses - acquisitionSpend - fixedExpenses;
    const breakEven = monthlyContribution > 0
      ? (fixedExpenses + acquisitionSpend) / monthlyContribution
      : Infinity;
    const runway = profit < 0 && v.cash > 0 ? v.cash / Math.abs(profit) : Infinity;
    const monthlyRevenuePerCustomer = v.price * v.purchases;
    const contributionRate = monthlyRevenuePerCustomer > 0
      ? monthlyContribution / monthlyRevenuePerCustomer
      : 0;

    return {
      newCustomers,
      acquisitionSpend,
      cac,
      monthlyContribution,
      lifetime,
      ltv,
      ltvCac,
      payback,
      revenue,
      variableExpenses,
      fixedExpenses,
      profit,
      breakEven,
      runway,
      contributionRate,
    };
  }

  function buildRecommendations(values) {
    const c = calculate(values);
    const candidates = [];
    const add = (id, score, title, text, impact) => {
      if (!candidates.some(item => item.id === id)) candidates.push({ id, score, title, text, impact });
    };

    if (c.monthlyContribution <= 0) {
      const deficit = Math.abs(c.monthlyContribution);
      add(
        'margin-critical',
        125,
        'Сначала восстановите маржу одного клиента',
        `Сейчас каждый активный клиент оставляет ${money(c.monthlyContribution)} в месяц. Поднимите цену или сократите переменные расходы минимум на ${money(deficit + Math.max(values.price * values.purchases * 0.1, 1))} на клиента, прежде чем наращивать рекламу.`,
        'Без этого рост увеличит убыток',
      );
    } else if (c.contributionRate < 0.3) {
      add(
        'margin-low',
        88,
        'Увеличьте запас маржи',
        `После переменных расходов остаётся около ${number(c.contributionRate * 100)}% выручки клиента. Проверьте повышение цены, пакетирование продукта и снижение себестоимости — даже небольшое улучшение здесь масштабируется на всю клиентскую базу.`,
        `Маржа клиента: ${money(c.monthlyContribution)}/мес.`,
      );
    }

    if (c.ltvCac < 1) {
      const targetCac = Math.max(c.ltv / 3, 0);
      add(
        'ltv-cac-critical',
        120,
        'Не масштабируйте текущее привлечение',
        `LTV/CAC равен ${number(c.ltvCac)}×: привлечение стоит дороже создаваемой ценности. Для запаса 3× целевой CAC должен быть около ${money(targetCac)} либо LTV должен существенно вырасти.`,
        `Текущий CAC: ${Number.isFinite(c.cac) ? money(c.cac) : 'не рассчитан'}`,
      );
    } else if (c.ltvCac < 3) {
      add(
        'ltv-cac-thin',
        92,
        'Создайте запас между LTV и CAC',
        `Соотношение ${number(c.ltvCac)}× положительное, но чувствительно к ошибкам в churn, возвратах и рекламе. Сначала протестируйте более дешёвый канал привлечения или увеличьте повторные покупки.`,
        'Цель для проверки: около 3×',
      );
    }

    if (c.payback > c.lifetime && c.monthlyContribution > 0) {
      add(
        'payback-life',
        116,
        'Клиент уходит раньше окупаемости',
        `CAC возвращается примерно за ${number(c.payback)} мес., а расчётная жизнь клиента — ${number(c.lifetime)} мес. Снижайте CAC или усиливайте удержание до масштабирования.`,
        'Окупаемость сейчас недостижима',
      );
    } else if (c.payback > 12) {
      add(
        'payback-slow',
        89,
        'Сократите срок окупаемости CAC',
        `Возврат привлечения занимает около ${number(c.payback)} мес. Это создаёт высокую потребность в оборотном капитале. Проверьте годовые тарифы, предоплату и каналы с более низким CAC.`,
        'Цель: до 6–12 месяцев',
      );
    } else if (c.payback > 6) {
      add(
        'payback-medium',
        70,
        'Ускорьте возврат рекламных денег',
        `Окупаемость составляет около ${number(c.payback)} мес. Ускорить её можно через более высокий первый платёж, onboarding в повторную покупку или снижение стоимости продаж.`,
        'Средний приоритет',
      );
    }

    if (c.profit < 0) {
      const missingCustomers = Number.isFinite(c.breakEven)
        ? Math.max(0, Math.ceil(c.breakEven - values.activeCustomers))
        : 0;
      add(
        'profit-negative',
        108,
        'Закройте месячный разрыв до активного роста',
        `Модель теряет около ${money(Math.abs(c.profit))} в месяц.${missingCustomers > 0 ? ` До точки безубыточности не хватает примерно ${missingCustomers} активных клиентов при текущей марже.` : ''} Сравните два пути: сокращение фиксированных расходов и достижимый объём продаж.`,
        `Break-even: ${Number.isFinite(c.breakEven) ? `${Math.ceil(c.breakEven)} клиентов` : 'не достигнут'}`,
      );
    }

    if (Number.isFinite(c.runway) && c.runway < 3) {
      add(
        'runway-critical',
        122,
        'Сохраните денежный запас',
        `При текущем убытке денег хватит примерно на ${number(c.runway)} мес. Заморозьте необязательные расходы и определите конкретный показатель, который должен улучшиться до следующего месяца.`,
        'Критический риск кассового разрыва',
      );
    } else if (Number.isFinite(c.runway) && c.runway < 6) {
      add(
        'runway-low',
        101,
        'Увеличьте runway до безопасного уровня',
        `Денежного запаса хватает примерно на ${number(c.runway)} мес. Подготовьте осторожный сценарий расходов и заранее определите дату, после которой модель нужно менять, а не продолжать по инерции.`,
        'Цель: минимум 6–12 месяцев',
      );
    }

    if (values.churn > 10) {
      add(
        'churn-high',
        94,
        'Разберите причины раннего оттока',
        `Месячный churn ${number(values.churn)}% означает расчётную жизнь около ${number(c.lifetime)} мес. Проведите интервью с ушедшими клиентами и исправьте одну повторяющуюся причину ухода до покупки дополнительного трафика.`,
        'Retention напрямую поднимает LTV',
      );
    } else if (values.churn > 5) {
      add(
        'churn-medium',
        69,
        'Улучшите удержание существующих клиентов',
        `При churn ${number(values.churn)}% даже небольшое снижение оттока заметно увеличит LTV. Начните с onboarding, активации в первую неделю и причин отмены.`,
        `Жизнь клиента: ${number(c.lifetime)} мес.`,
      );
    }

    if (values.conversion < 1.5 && values.leads >= 100) {
      add(
        'conversion-low',
        76,
        'Исправьте конверсию до покупки нового трафика',
        `Из 100 лидов покупают около ${number(values.conversion)}. Проверьте соответствие оффера запросу клиента, первый экран, доказательства ценности и трение на оплате.`,
        `Новых клиентов: ${number(c.newCustomers)}/мес.`,
      );
    }

    if (values.refundRate >= 8) {
      add(
        'refunds-high',
        82,
        'Снизьте возвраты и несоответствие ожиданий',
        `Возвраты и списания составляют ${number(values.refundRate)}% выручки. Уточните обещание продукта, квалификацию клиента и причины возврата — это одновременно улучшит маржу и репутацию.`,
        'Быстрый рычаг чистой выручки',
      );
    }

    if (c.revenue > 0 && c.fixedExpenses / c.revenue > 0.65) {
      add(
        'fixed-heavy',
        78,
        'Проверьте слишком тяжёлые постоянные расходы',
        `Фиксированные расходы равны примерно ${number(c.fixedExpenses / c.revenue * 100)}% месячной выручки. Отделите обязательное от преждевременного найма, офиса и сервисов.`,
        `Фиксированные: ${money(c.fixedExpenses)}/мес.`,
      );
    }

    add(
      'validate-data',
      60,
      'Замените предположения фактическими данными',
      'Проведите расчёт хотя бы на 10 реальных клиентах: сохраните канал, цену, фактическую себестоимость, повторную покупку и причину отказа. Точность исходных данных важнее сложности формулы.',
      'Следующий практический эксперимент',
    );

    if (c.profit >= 0 && c.ltvCac >= 3 && c.monthlyContribution > 0) {
      add(
        'controlled-scale',
        84,
        'Масштабируйте один канал контролируемо',
        `Модель выглядит положительной: прибыль ${money(c.profit)}, LTV/CAC ${number(c.ltvCac)}×. Увеличьте бюджет одного канала на 10–20% и проверьте, сохраняются ли CAC и качество клиентов.`,
        'Не масштабируйте все каналы одновременно',
      );
      add(
        'retention-upside',
        66,
        'Найдите один рычаг повторной ценности',
        'Проверьте, какое действие сильнее всего связано с повторной покупкой: быстрая первая ценность, напоминание, подписка, пакет или рекомендация следующего продукта.',
        'Рост LTV без пропорционального роста CAC',
      );
    }

    return candidates.sort((a, b) => b.score - a.score).slice(0, 3);
  }

  function renderAdvice() {
    const wizardBody = document.getElementById('wizardBody');
    if (!wizardBody || !wizardBody.querySelector('.wizard-summary')) return;
    if (wizardBody.querySelector('.wizard-advice-section')) return;

    const advice = buildRecommendations(mirrorValues);
    const medals = [
      { className: 'gold', icon: '★', label: 'Gold advice' },
      { className: 'silver', icon: '◆', label: 'Silver advice' },
      { className: 'bronze', icon: '▲', label: 'Bronze advice' },
    ];

    const section = document.createElement('section');
    section.className = 'wizard-advice-section';
    section.innerHTML = `
      <div class="wizard-advice-heading">
        <div><span>Приоритет действий</span><h4>Три главные рекомендации</h4></div>
        <p>Отсортированы по предполагаемому влиянию на устойчивость модели, а не по простоте реализации.</p>
      </div>
      <div class="wizard-advice-list">
        ${advice.map((item, index) => {
          const medal = medals[index];
          return `<article class="wizard-advice-card ${medal.className}">
            <div class="wizard-advice-medal" aria-label="${medal.label}">${medal.icon}<small>${index + 1}</small></div>
            <div class="wizard-advice-copy"><strong>${item.title}</strong><p>${item.text}</p></div>
            <div class="wizard-advice-impact"><span>${medal.label}</span><strong>${item.impact}</strong></div>
          </article>`;
        }).join('')}
      </div>`;

    const tip = wizardBody.querySelector('.wizard-tip');
    if (tip) tip.before(section);
    else wizardBody.querySelector('.wizard-screen')?.appendChild(section);
  }

  function connectWizard() {
    const wizardBody = document.getElementById('wizardBody');
    if (!wizardBody) return false;

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(renderAdvice);
    });
    observer.observe(wizardBody, { childList: true, subtree: true });

    document.addEventListener('input', event => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || !target.dataset.wizardKey) return;
      const key = target.dataset.wizardKey;
      const value = Number(target.value);
      if (Number.isFinite(value)) mirrorValues[key] = value;
    }, true);

    document.addEventListener('click', event => {
      const productButton = event.target.closest('[data-wizard-product]');
      if (productButton && templates[productButton.dataset.wizardProduct]) {
        mirrorProduct = productButton.dataset.wizardProduct;
        mirrorValues = { ...templates[mirrorProduct].values };
      }

      if (event.target.closest('.wizard-launch, .wizard-hero-cta')) {
        mirrorProduct = state.product;
        mirrorValues = { ...state.values };
      }
    }, true);

    renderAdvice();
    return true;
  }

  if (!connectWizard()) {
    const pageObserver = new MutationObserver(() => {
      if (connectWizard()) pageObserver.disconnect();
    });
    pageObserver.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
