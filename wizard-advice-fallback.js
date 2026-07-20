'use strict';

(() => {
  if (window.__unitLabAdviceFallbackLoaded) return;
  window.__unitLabAdviceFallbackLoaded = true;

  const fallbackAdvice = [
    {
      title: 'Проверьте готовность платить на реальном предложении',
      text: 'Покажите оффер 5–10 потенциальным клиентам и попросите не оценку идеи, а конкретное действие: заявку, предзаказ или оплату. Это быстрее всего отделяет интерес от реального спроса.',
      impact: 'Проверка спроса до новых расходов',
    },
    {
      title: 'Разделите CAC по каналам привлечения',
      text: 'Не смешивайте рекламу, рекомендации, контент и продажи в одно среднее число. Один прибыльный канал может скрываться внутри общего неэффективного CAC — или наоборот.',
      impact: 'Понимание, где масштабировать',
    },
    {
      title: 'Начните собирать данные по когортам',
      text: 'Отмечайте месяц первой покупки и последующие возвращения клиента. Через несколько периодов вы увидите фактический retention и сможете заменить предположение о LTV реальными данными.',
      impact: 'Более надёжный прогноз LTV',
    },
  ];

  const medals = [
    { className: 'gold', icon: '★', label: 'Gold advice' },
    { className: 'silver', icon: '◆', label: 'Silver advice' },
    { className: 'bronze', icon: '▲', label: 'Bronze advice' },
  ];

  function fillAdvice() {
    const list = document.querySelector('#wizardBody .wizard-advice-list');
    if (!list) return;

    const existingTitles = new Set(
      [...list.querySelectorAll('.wizard-advice-copy strong')].map(node => node.textContent.trim()),
    );

    let fallbackIndex = 0;
    while (list.children.length < 3 && fallbackIndex < fallbackAdvice.length) {
      const item = fallbackAdvice[fallbackIndex];
      fallbackIndex += 1;
      if (existingTitles.has(item.title)) continue;

      const rank = list.children.length;
      const medal = medals[rank];
      const card = document.createElement('article');
      card.className = `wizard-advice-card ${medal.className}`;
      card.innerHTML = `
        <div class="wizard-advice-medal" aria-label="${medal.label}">${medal.icon}<small>${rank + 1}</small></div>
        <div class="wizard-advice-copy"><strong>${item.title}</strong><p>${item.text}</p></div>
        <div class="wizard-advice-impact"><span>${medal.label}</span><strong>${item.impact}</strong></div>`;
      list.appendChild(card);
      existingTitles.add(item.title);
    }
  }

  const observer = new MutationObserver(() => window.requestAnimationFrame(fillAdvice));
  observer.observe(document.documentElement, { childList: true, subtree: true });
  fillAdvice();
})();
