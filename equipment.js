'use strict';

const equipmentCatalog = [
  { name: 'Принтер', icon: '🖨️', cost: 45000, life: 36, aliases: ['печать', 'printer', 'лазерный принтер'] },
  { name: 'МФУ', icon: '🖨️', cost: 65000, life: 36, aliases: ['сканер принтер', 'копир', 'multifunction'] },
  { name: '3D-принтер', icon: '🧱', cost: 120000, life: 48, aliases: ['3д принтер', '3d printer'] },
  { name: 'Ноутбук', icon: '💻', cost: 95000, life: 36, aliases: ['laptop', 'компьютер переносной'] },
  { name: 'Настольный компьютер', icon: '🖥️', cost: 120000, life: 48, aliases: ['пк', 'pc', 'компьютер', 'системный блок'] },
  { name: 'Монитор', icon: '🖥️', cost: 32000, life: 48, aliases: ['экран', 'display'] },
  { name: 'Сервер', icon: '🗄️', cost: 280000, life: 48, aliases: ['server', 'серверное оборудование'] },
  { name: 'Смартфон', icon: '📱', cost: 65000, life: 36, aliases: ['телефон', 'phone', 'тестовое устройство'] },
  { name: 'Планшет', icon: '📲', cost: 55000, life: 36, aliases: ['tablet', 'айпад', 'ipad'] },
  { name: 'Роутер и сеть', icon: '📡', cost: 25000, life: 48, aliases: ['router', 'wifi', 'вайфай', 'сетевое оборудование'] },
  { name: 'Проектор', icon: '📽️', cost: 85000, life: 48, aliases: ['projector', 'проекционное оборудование'] },
  { name: 'Камера', icon: '📷', cost: 140000, life: 48, aliases: ['фотоаппарат', 'видеокамера', 'camera'] },
  { name: 'Студийный свет', icon: '💡', cost: 70000, life: 48, aliases: ['свет', 'лампы', 'lighting'] },
  { name: 'Микрофон', icon: '🎙️', cost: 35000, life: 48, aliases: ['microphone', 'аудио'] },
  { name: 'Кофемашина', icon: '☕', cost: 230000, life: 48, aliases: ['coffee machine', 'кофеварка'] },
  { name: 'Кофемолка', icon: '⚙️', cost: 60000, life: 36, aliases: ['grinder', 'мельница кофе'] },
  { name: 'Холодильник', icon: '🧊', cost: 95000, life: 72, aliases: ['refrigerator', 'холодильное оборудование'] },
  { name: 'Морозильная камера', icon: '❄️', cost: 110000, life: 72, aliases: ['морозилка', 'freezer'] },
  { name: 'Печь или духовка', icon: '♨️', cost: 160000, life: 60, aliases: ['печь', 'духовка', 'oven'] },
  { name: 'Посудомоечная машина', icon: '🍽️', cost: 125000, life: 60, aliases: ['посудомойка', 'dishwasher'] },
  { name: 'Касса и POS-терминал', icon: '🧾', cost: 55000, life: 48, aliases: ['касса', 'pos', 'терминал', 'эквайринг'] },
  { name: 'Рабочий стол', icon: '🗂️', cost: 28000, life: 60, aliases: ['стол', 'desk', 'мебель'] },
  { name: 'Офисное кресло', icon: '🪑', cost: 22000, life: 48, aliases: ['кресло', 'стул', 'chair'] },
  { name: 'Стеллаж', icon: '🗄️', cost: 35000, life: 72, aliases: ['полка', 'rack', 'складской стеллаж'] },
  { name: 'Набор инструментов', icon: '🧰', cost: 75000, life: 48, aliases: ['инструменты', 'tools', 'ремонт'] },
  { name: 'Швейная машина', icon: '🧵', cost: 90000, life: 60, aliases: ['sewing machine', 'швейное оборудование'] },
  { name: 'Торговое оборудование', icon: '🏪', cost: 180000, life: 60, aliases: ['витрина', 'прилавок', 'shop equipment'] },
  { name: 'Складское оборудование', icon: '📦', cost: 220000, life: 72, aliases: ['склад', 'warehouse', 'тележка'] },
  { name: 'Транспорт', icon: '🚚', cost: 1250000, life: 72, aliases: ['автомобиль', 'машина', 'доставка', 'vehicle'] },
  { name: 'Генератор', icon: '🔌', cost: 180000, life: 72, aliases: ['generator', 'электрогенератор'] },
  { name: 'Кондиционер', icon: '🌬️', cost: 85000, life: 72, aliases: ['климат', 'air conditioner', 'сплит система'] },
  { name: 'Фильтр для воды', icon: '💧', cost: 45000, life: 36, aliases: ['вода', 'water filter', 'очистка воды'] },
];

const customAssetStorageKey = 'unitlab-custom-assets-v1';
let customAssets = loadCustomAssets();
let selectedEquipment = null;

function normalizeText(value) {
  return String(value || '').trim().toLocaleLowerCase('ru-RU').replace(/ё/g, 'е');
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'\"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '\"': '&quot;',
  })[character]);
}

function loadCustomAssets() {
  try {
    const stored = JSON.parse(localStorage.getItem(customAssetStorageKey));
    if (!Array.isArray(stored)) return [];
    return stored.filter(item => item && item.id && item.name && item.product).map(item => ({
      id: String(item.id),
      product: String(item.product),
      name: String(item.name).slice(0, 80),
      icon: String(item.icon || '🧰').slice(0, 8),
      cost: Math.max(0, Number(item.cost) || 0),
      life: clamp(Number(item.life) || 36, 1, 240),
      qty: clamp(Number(item.qty) || 1, 0, 100),
    }));
  } catch (error) {
    console.warn('Не удалось восстановить пользовательское оборудование', error);
    return [];
  }
}

function saveCustomAssets() {
  localStorage.setItem(customAssetStorageKey, JSON.stringify(customAssets));
}

function assetsForCurrentProduct() {
  return customAssets.filter(item => item.product === state.product);
}

const baseCalculations = calculations;
calculations = function calculationsWithCustomAssets() {
  const base = baseCalculations();
  const customEntries = assetsForCurrentProduct().map(item => ({ ...item, key: item.id }));
  const customUpfront = customEntries.reduce((sum, item) => sum + item.cost * item.qty, 0);
  const customDepreciation = customEntries.reduce((sum, item) => sum + (item.cost * item.qty / item.life), 0);
  const upfrontAssets = base.upfrontAssets + customUpfront;
  const depreciation = base.depreciation + customDepreciation;
  const operatingProfit = base.operatingProfit - customDepreciation;
  const breakEvenCustomers = base.monthlyContributionPerCustomer > 0
    ? (base.fixedExpenses + base.acquisitionSpend + depreciation) / base.monthlyContributionPerCustomer
    : Infinity;
  const breakEvenTransactions = base.contributionPerPurchase > 0
    ? (base.fixedExpenses + base.acquisitionSpend + depreciation) / base.contributionPerPurchase
    : Infinity;
  const runway = operatingProfit < 0 ? safeDivide(state.values.cash, Math.abs(operatingProfit)) : Infinity;
  const investmentPayback = base.cashProfit > 0 ? safeDivide(upfrontAssets, base.cashProfit) : Infinity;

  return {
    ...base,
    upfrontAssets,
    depreciation,
    operatingProfit,
    breakEvenCustomers,
    breakEvenTransactions,
    runway,
    investmentPayback,
    assetEntries: [...base.assetEntries, ...customEntries],
  };
};

function renderCustomAssets() {
  const container = el('customAssetGrid');
  if (!container) return;
  const items = assetsForCurrentProduct();
  container.innerHTML = items.map(item => `
    <article class="asset-card custom-asset-card ${item.qty > 0 ? 'active' : ''}" data-custom-card="${item.id}">
      <button class="asset-remove" type="button" data-remove-custom="${item.id}" aria-label="Удалить ${escapeHtml(item.name)}">×</button>
      <span class="custom-badge">Добавлено вручную</span>
      <div class="asset-visual" aria-hidden="true">${escapeHtml(item.icon)}</div>
      <strong>${escapeHtml(item.name)}</strong>
      <small>${money.format(item.cost)} · ${item.life} мес.</small>
      <div class="asset-controls">
        <div class="qty-control">
          <button type="button" data-custom-asset="${item.id}" data-change="-1" aria-label="Уменьшить количество ${escapeHtml(item.name)}">−</button>
          <output>${item.qty}</output>
          <button type="button" data-custom-asset="${item.id}" data-change="1" aria-label="Увеличить количество ${escapeHtml(item.name)}">+</button>
        </div>
        <span class="asset-cost">${money.format(item.cost * item.qty)}</span>
      </div>
    </article>
  `).join('');

  container.querySelectorAll('[data-custom-asset]').forEach(button => {
    button.addEventListener('click', () => {
      const item = customAssets.find(asset => asset.id === button.dataset.customAsset);
      if (!item) return;
      item.qty = clamp(item.qty + Number(button.dataset.change), 0, 100);
      saveCustomAssets();
      renderCustomAssets();
      updateResults();
    });
  });

  container.querySelectorAll('[data-remove-custom]').forEach(button => {
    button.addEventListener('click', () => {
      const item = customAssets.find(asset => asset.id === button.dataset.removeCustom);
      customAssets = customAssets.filter(asset => asset.id !== button.dataset.removeCustom);
      saveCustomAssets();
      renderCustomAssets();
      updateResults();
      showToast(item ? `«${item.name}» удалено из расчёта.` : 'Оборудование удалено.');
    });
  });
}

function searchEquipment(query) {
  const normalized = normalizeText(query);
  if (!normalized) return [];
  return equipmentCatalog
    .map(item => {
      const name = normalizeText(item.name);
      const aliases = item.aliases.map(normalizeText);
      const starts = name.startsWith(normalized) || aliases.some(alias => alias.startsWith(normalized));
      const includes = name.includes(normalized) || aliases.some(alias => alias.includes(normalized));
      return { item, score: starts ? 2 : includes ? 1 : 0 };
    })
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name, 'ru'))
    .slice(0, 7)
    .map(result => result.item);
}

function closeSuggestions() {
  const suggestions = el('assetSuggestions');
  suggestions.hidden = true;
  suggestions.innerHTML = '';
}

function renderSuggestions() {
  const input = el('assetSearch');
  const suggestions = el('assetSuggestions');
  const query = input.value.trim();
  if (!query) {
    closeSuggestions();
    return;
  }

  const matches = searchEquipment(query);
  suggestions.innerHTML = '';
  matches.forEach((item, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'asset-suggestion';
    button.dataset.catalogIndex = String(equipmentCatalog.indexOf(item));
    button.innerHTML = `<span>${item.icon}</span><div><strong>${escapeHtml(item.name)}</strong><small>Ориентир: ${money.format(item.cost)} · ${item.life} мес.</small></div>`;
    button.addEventListener('click', () => chooseEquipment(item));
    suggestions.appendChild(button);
    if (index === 0) button.dataset.firstSuggestion = 'true';
  });

  const customButton = document.createElement('button');
  customButton.type = 'button';
  customButton.className = 'asset-suggestion asset-suggestion-custom';
  customButton.innerHTML = `<span>🧰</span><div><strong>Добавить «${escapeHtml(query)}»</strong><small>Создать своё оборудование и указать цену</small></div>`;
  customButton.addEventListener('click', () => chooseEquipment({ name: query, icon: '🧰', cost: 0, life: 36, aliases: [] }));
  suggestions.appendChild(customButton);
  suggestions.hidden = false;
}

function chooseEquipment(item) {
  selectedEquipment = { ...item };
  el('assetSearch').value = item.name;
  el('assetNameInput').value = item.name;
  el('assetCostInput').value = item.cost || '';
  el('assetLifeInput').value = item.life || 36;
  el('assetQtyInput').value = 1;
  el('assetIconPreview').textContent = item.icon || '🧰';
  el('assetAddForm').hidden = false;
  closeSuggestions();
  window.setTimeout(() => el('assetCostInput').focus(), 0);
}

function clearEquipmentForm() {
  selectedEquipment = null;
  el('assetSearch').value = '';
  el('assetNameInput').value = '';
  el('assetCostInput').value = '';
  el('assetLifeInput').value = 36;
  el('assetQtyInput').value = 1;
  el('assetAddForm').hidden = true;
  closeSuggestions();
}

function addCustomAsset(event) {
  event.preventDefault();
  const name = el('assetNameInput').value.trim();
  const cost = Number(el('assetCostInput').value);
  const life = Number(el('assetLifeInput').value);
  const qty = Number(el('assetQtyInput').value);

  if (!name) {
    showToast('Введите название оборудования.');
    el('assetNameInput').focus();
    return;
  }
  if (!Number.isFinite(cost) || cost <= 0) {
    showToast('Укажите цену оборудования больше нуля.');
    el('assetCostInput').focus();
    return;
  }
  if (!Number.isFinite(life) || life < 1) {
    showToast('Срок амортизации должен быть не меньше одного месяца.');
    el('assetLifeInput').focus();
    return;
  }

  const item = {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    product: state.product,
    name: name.slice(0, 80),
    icon: selectedEquipment?.icon || '🧰',
    cost: Math.round(cost),
    life: clamp(Math.round(life), 1, 240),
    qty: clamp(Math.round(qty) || 1, 1, 100),
  };

  customAssets.push(item);
  saveCustomAssets();
  renderCustomAssets();
  updateResults();
  clearEquipmentForm();
  showToast(`«${item.name}» добавлено в расчёт.`);
}

const baseLoadProduct = loadProduct;
loadProduct = function loadProductWithCustomAssets(key, fromStorage = false) {
  baseLoadProduct(key, fromStorage);
  renderCustomAssets();
  clearEquipmentForm();
};

function exportWithCustomAssets(event) {
  event.preventDefault();
  event.stopImmediatePropagation();
  const payload = {
    generatedAt: new Date().toISOString(),
    product: templates[state.product].name,
    inputs: state.values,
    templateAssets: state.assetQty,
    customAssets: assetsForCurrentProduct(),
    results: calculations(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `unitlab-${state.product}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showToast('Сценарий вместе с оборудованием экспортирован в JSON.');
}

el('assetSearch').addEventListener('input', renderSuggestions);
el('assetSearch').addEventListener('focus', renderSuggestions);
el('assetSearch').addEventListener('keydown', event => {
  if (event.key === 'Escape') closeSuggestions();
  if (event.key === 'Enter' && !el('assetSuggestions').hidden) {
    event.preventDefault();
    const first = el('assetSuggestions').querySelector('[data-first-suggestion="true"], .asset-suggestion');
    first?.click();
  }
});
el('assetAddForm').addEventListener('submit', addCustomAsset);
el('cancelAssetButton').addEventListener('click', clearEquipmentForm);
el('exportButton').addEventListener('click', exportWithCustomAssets, true);
el('resetButton').addEventListener('click', () => {
  customAssets = customAssets.filter(item => item.product !== state.product);
  saveCustomAssets();
  renderCustomAssets();
  clearEquipmentForm();
  updateResults();
});
document.addEventListener('click', event => {
  if (!event.target.closest('.asset-search-area')) closeSuggestions();
});

renderCustomAssets();
updateResults();
