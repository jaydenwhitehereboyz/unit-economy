'use strict';

(() => {
  if (window.__unitLabIteration3Loaded) return;
  window.__unitLabIteration3Loaded = true;

  const polish = document.createElement('link');
  polish.rel = 'stylesheet';
  polish.href = 'iteration3.css?v=3';
  document.head.appendChild(polish);

  const compactStyles = document.createElement('style');
  compactStyles.textContent = `
    .business-icon-slot.is-compact{display:inline-grid;width:28px;height:28px;margin-right:7px;vertical-align:middle}
    .business-icon-slot.is-compact .unitlab-3d-icon{width:28px;height:28px;filter:drop-shadow(0 4px 5px rgba(37,48,91,.12))}
    .dashboard-action-icon svg{display:block;width:23px;height:23px}
  `;
  document.head.appendChild(compactStyles);

  const palettes = {
    saas: ['#697cff', '#5642d8', '#dce3ff'],
    service: ['#ff9b57', '#d96047', '#ffe1c8'],
    course: ['#ef5d83', '#9c3fc0', '#ffd8e6'],
    school: ['#597cf2', '#3a50ba', '#dbe5ff'],
    ecommerce: ['#50b890', '#27836d', '#d4f5e7'],
    coffee: ['#b6784b', '#70412d', '#f4d8bc'],
    agency: ['#eb6d9e', '#9b4db5', '#f8d5ec'],
    marketplace: ['#695ee8', '#3e57be', '#dcd9ff'],
    mobile: ['#526a86', '#26364f', '#d9e2ec'],
    offlineSchool: ['#e4a83c', '#a96725', '#f8e4b9'],
  };

  let iconSequence = 0;

  function shapeFor(key, ids) {
    const commonStroke = `stroke="url(#${ids.dark})" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"`;
    switch (key) {
      case 'saas':
        return `
          <path d="M25 47h26a10 10 0 0 0 1-19.95A15 15 0 0 0 23.4 25.1 10.8 10.8 0 0 0 25 47Z" fill="url(#${ids.light})" ${commonStroke}/>
          <circle cx="31" cy="39" r="2.6" fill="url(#${ids.main})"/><circle cx="39" cy="34" r="2.6" fill="url(#${ids.main})"/><circle cx="47" cy="39" r="2.6" fill="url(#${ids.main})"/>
          <path d="m33.2 37.8 3.6-2.5m4.4 0 3.6 2.5" stroke="url(#${ids.main})" stroke-width="2" stroke-linecap="round"/>`;
      case 'service':
        return `
          <path d="M47.8 22.2a11 11 0 0 0-13.3 13.9L21.2 49.4a5 5 0 0 0 7.1 7.1l13.3-13.3a11 11 0 0 0 13.9-13.3l-7 7-6.2-1.5-1.5-6.2 7-7Z" fill="url(#${ids.light})" ${commonStroke}/>
          <circle cx="25" cy="52.7" r="2.6" fill="url(#${ids.main})"/>
          <path d="m28 45 7 7" stroke="url(#${ids.main})" stroke-width="4" stroke-linecap="round"/>`;
      case 'course':
        return `
          <rect x="19" y="25" width="38" height="29" rx="7" fill="url(#${ids.light})" ${commonStroke}/>
          <path d="m35 34 12 6.5L35 47Z" fill="url(#${ids.main})"/>
          <path d="M21 25h34l-5-8H16l5 8Z" fill="url(#${ids.main})" ${commonStroke}/>
          <path d="m23 18 5 7m7-7 5 7m7-7 5 7" stroke="#fff" stroke-width="2.4" opacity=".86"/>`;
      case 'school':
        return `
          <path d="m13 31 23-12 23 12-23 12-23-12Z" fill="url(#${ids.main})" ${commonStroke}/>
          <path d="M22 37v10c8 7 20 7 28 0V37" fill="url(#${ids.light})" ${commonStroke}/>
          <path d="M58 32v15" stroke="url(#${ids.dark})" stroke-width="3" stroke-linecap="round"/><circle cx="58" cy="50" r="3" fill="url(#${ids.main})"/>`;
      case 'ecommerce':
        return `
          <path d="M20 29h35l-3 28H23l-3-28Z" fill="url(#${ids.light})" ${commonStroke}/>
          <path d="M29 30v-5a9 9 0 0 1 18 0v5" fill="none" ${commonStroke}/>
          <path d="m30 40 9-5 9 5v10l-9 5-9-5V40Z" fill="url(#${ids.main})" opacity=".92"/>
          <path d="m30 40 9 5 9-5M39 45v10" fill="none" stroke="#fff" stroke-width="1.8" opacity=".8"/>`;
      case 'coffee':
        return `
          <path d="M21 31h29v12c0 9-6.5 15-14.5 15S21 52 21 43V31Z" fill="url(#${ids.light})" ${commonStroke}/>
          <path d="M50 35h4.5a7 7 0 1 1 0 14H50" fill="none" ${commonStroke}/>
          <path d="M28 25c-4-5 4-6 0-12m10 12c-4-5 4-6 0-12m10 12c-4-5 4-6 0-12" fill="none" stroke="url(#${ids.main})" stroke-width="3" stroke-linecap="round"/>
          <ellipse cx="35.5" cy="34" rx="11" ry="3" fill="url(#${ids.dark})" opacity=".75"/>`;
      case 'agency':
        return `
          <path d="M24 28 36 20l12 8v16l-12 8-12-8V28Z" fill="url(#${ids.light})" ${commonStroke}/>
          <circle cx="36" cy="36" r="6" fill="url(#${ids.main})"/>
          <circle cx="19" cy="22" r="5" fill="url(#${ids.main})" ${commonStroke}/><circle cx="53" cy="20" r="5" fill="url(#${ids.main})" ${commonStroke}/><circle cx="56" cy="51" r="5" fill="url(#${ids.main})" ${commonStroke}/><circle cx="17" cy="52" r="5" fill="url(#${ids.main})" ${commonStroke}/>
          <path d="m23 25 8 7m10-1 8-8m-8 17 10 8m-20-8-10 9" stroke="url(#${ids.dark})" stroke-width="2.4" opacity=".85"/>`;
      case 'marketplace':
        return `
          <circle cx="36" cy="36" r="9" fill="url(#${ids.light})" ${commonStroke}/>
          <path d="M18 32a19 19 0 0 1 30-11l4-5 3 13-13-2 4-4" fill="url(#${ids.main})" ${commonStroke}/>
          <path d="M54 40a19 19 0 0 1-30 11l-4 5-3-13 13 2-4 4" fill="url(#${ids.main})" ${commonStroke}/>
          <path d="m32 36 3 3 6-7" fill="none" stroke="url(#${ids.dark})" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round"/>`;
      case 'mobile':
        return `
          <rect x="23" y="13" width="27" height="47" rx="7" fill="url(#${ids.dark})" ${commonStroke}/>
          <rect x="27" y="19" width="19" height="31" rx="3" fill="url(#${ids.light})"/>
          <circle cx="36.5" cy="55" r="2.2" fill="url(#${ids.light})"/>
          <rect x="30" y="23" width="6" height="6" rx="2" fill="url(#${ids.main})"/><rect x="38" y="23" width="6" height="6" rx="2" fill="url(#${ids.main})" opacity=".75"/><rect x="30" y="32" width="14" height="4" rx="2" fill="url(#${ids.main})" opacity=".7"/><rect x="30" y="39" width="10" height="4" rx="2" fill="url(#${ids.main})" opacity=".45"/>`;
      case 'offlineSchool':
        return `
          <path d="m14 29 22-13 22 13H14Z" fill="url(#${ids.main})" ${commonStroke}/>
          <path d="M18 31h36v25H18V31Z" fill="url(#${ids.light})" ${commonStroke}/>
          <path d="M24 35v17m8-17v17m8-17v17m8-17v17" stroke="url(#${ids.dark})" stroke-width="3"/>
          <path d="M14 57h44" stroke="url(#${ids.dark})" stroke-width="4" stroke-linecap="round"/>
          <circle cx="36" cy="25" r="3" fill="#fff" opacity=".9"/>`;
      default:
        return `<circle cx="36" cy="36" r="17" fill="url(#${ids.light})" ${commonStroke}/><path d="M28 36h16M36 28v16" stroke="url(#${ids.main})" stroke-width="4" stroke-linecap="round"/>`;
    }
  }

  function renderIcon(key, label = '') {
    const colors = palettes[key] || palettes.saas;
    const uid = `unitlab-${key}-${++iconSequence}`;
    const ids = { main: `${uid}-main`, dark: `${uid}-dark`, light: `${uid}-light`, shadow: `${uid}-shadow` };
    return `<svg class="unitlab-3d-icon" viewBox="0 0 72 72" role="img" aria-label="${label || key}">
      <defs>
        <linearGradient id="${ids.main}" x1="12" y1="10" x2="58" y2="61" gradientUnits="userSpaceOnUse"><stop stop-color="${colors[0]}"/><stop offset="1" stop-color="${colors[1]}"/></linearGradient>
        <linearGradient id="${ids.dark}" x1="18" y1="14" x2="55" y2="58" gradientUnits="userSpaceOnUse"><stop stop-color="${colors[1]}"/><stop offset="1" stop-color="#202a54"/></linearGradient>
        <linearGradient id="${ids.light}" x1="17" y1="14" x2="54" y2="58" gradientUnits="userSpaceOnUse"><stop stop-color="#fff"/><stop offset=".42" stop-color="${colors[2]}"/><stop offset="1" stop-color="${colors[0]}" stop-opacity=".58"/></linearGradient>
        <filter id="${ids.shadow}" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="6" stdDeviation="5" flood-color="#26345f" flood-opacity=".18"/></filter>
      </defs>
      <ellipse cx="36" cy="62" rx="20" ry="4.5" fill="#35436f" opacity=".12"/>
      <g filter="url(#${ids.shadow})">
        <rect x="7" y="6" width="58" height="56" rx="19" fill="url(#${ids.light})" opacity=".48"/>
        <path d="M15 10h35c7 0 11 4 11 11" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".65"/>
        ${shapeFor(key, ids)}
      </g>
    </svg>`;
  }

  function slotMarkup(key) {
    return `<span class="business-icon-slot" data-business-icon="${key}"></span>`;
  }

  window.UnitLabIcons = { render: renderIcon, palettes, slot: slotMarkup };

  Object.keys(templates).forEach(key => {
    templates[key].icon = slotMarkup(key);
  });

  function decorateProductCards(root = document) {
    root.querySelectorAll('[data-product], [data-wizard-product]').forEach(card => {
      const key = card.dataset.product || card.dataset.wizardProduct;
      const palette = palettes[key];
      if (palette) card.style.setProperty('--product-accent', palette[0]);
    });
  }

  function hydrateSlots(root = document) {
    root.querySelectorAll('[data-business-icon]').forEach(slot => {
      const key = slot.dataset.businessIcon;
      if (!palettes[key]) return;
      if (!slot.closest('.product-icon, .wizard-product-icon, .dashboard-model-icon')) slot.classList.add('is-compact');
      if (slot.dataset.iconHydrated === key && slot.querySelector('svg')) return;
      slot.innerHTML = renderIcon(key, templates[key]?.name || key);
      slot.dataset.iconHydrated = key;
    });

    const dashboardIcon = document.getElementById('dashboardModelIcon');
    if (dashboardIcon && typeof state !== 'undefined') {
      const key = state.product;
      if (dashboardIcon.dataset.currentProduct !== key || !dashboardIcon.querySelector('svg')) {
        dashboardIcon.innerHTML = slotMarkup(key);
        dashboardIcon.dataset.currentProduct = key;
        const slot = dashboardIcon.querySelector('[data-business-icon]');
        if (slot) {
          slot.innerHTML = renderIcon(key, templates[key]?.name || key);
          slot.dataset.iconHydrated = key;
        }
      }
    }

    decorateProductCards(root);
  }

  function smallActionIcon(type) {
    if (type === 'basic') {
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 2.1 6.1L20 10l-5.9 2L12 18l-2.1-6L4 10l5.9-1.9L12 2Z" fill="currentColor"/><circle cx="18.5" cy="18.5" r="2.5" fill="currentColor" opacity=".55"/></svg>`;
    }
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M8 12h8M4 17h16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="9" cy="7" r="2.2" fill="#fff" stroke="currentColor" stroke-width="1.7"/><circle cx="15" cy="12" r="2.2" fill="#fff" stroke="currentColor" stroke-width="1.7"/><circle cx="8" cy="17" r="2.2" fill="#fff" stroke="currentColor" stroke-width="1.7"/></svg>`;
  }

  function decorateDashboard() {
    const basicIcon = document.querySelector('#dashboardBasicButton .dashboard-action-icon');
    const proIcon = document.querySelector('#dashboardProButton .dashboard-action-icon');
    if (basicIcon && !basicIcon.querySelector('svg')) basicIcon.innerHTML = smallActionIcon('basic');
    if (proIcon && !proIcon.querySelector('svg')) proIcon.innerHTML = smallActionIcon('pro');

    document.querySelectorAll('.dashboard-metrics-slot .metric-card').forEach((card, index) => {
      card.style.setProperty('--metric-order', index);
    });
  }

  let hydrationFrame = 0;
  function scheduleHydration() {
    cancelAnimationFrame(hydrationFrame);
    hydrationFrame = requestAnimationFrame(() => {
      hydrateSlots(document);
      decorateDashboard();
    });
  }

  if (typeof renderProducts === 'function') renderProducts();

  const observer = new MutationObserver(scheduleHydration);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });

  document.addEventListener('click', event => {
    if (event.target.closest('[data-product], [data-wizard-product], [data-scenario], #dashboardBasicButton, #dashboardProButton')) {
      window.setTimeout(scheduleHydration, 0);
    }
  }, true);

  scheduleHydration();
})();
