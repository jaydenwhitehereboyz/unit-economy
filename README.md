# UnitLab — калькулятор экономики бизнеса

Интерактивное веб-приложение для предварительной проверки юнит-экономики разных бизнес-моделей.

## Возможности

- 10 шаблонов: SaaS, услуга, онлайн-курс, онлайн-школа, интернет-магазин, кофейня, агентство, маркетплейс, мобильное приложение и учебный центр.
- Ползунки для воронки привлечения, CAC, LTV, переменных и постоянных расходов.
- Подсказки к каждой метрике при наведении.
- Визуальный выбор оборудования и расчёт стартовых вложений/амортизации.
- Расчёт CAC, LTV, LTV/CAC, payback period, точки безубыточности, прибыли, runway и окупаемости активов.
- Осторожный, базовый и сценарий роста.
- Автоматический диагноз модели простым языком.
- Сохранение введённых параметров в браузере и экспорт сценария в JSON.

## Запуск локально

Никакая установка не требуется.

1. Скачайте репозиторий.
2. Откройте `index.html` в браузере.

Для локального HTTP-сервера можно выполнить:

```bash
python -m http.server 8080
```

Затем открыть `http://localhost:8080`.

## Стек

- HTML5
- CSS3
- Vanilla JavaScript
- Без сборщика и внешних зависимостей

Такой стек выбран намеренно: проект легко изучать, менять и публиковать на GitHub Pages.

## Публикация на GitHub Pages

В репозитории есть workflow `.github/workflows/pages.yml`.

1. Откройте **Settings → Pages**.
2. В **Build and deployment → Source** выберите **GitHub Actions**.
3. Запустите workflow или сделайте новый commit в `main`.

## Формулы

- `New customers = Leads × Conversion rate`
- `CAC = (Marketing + Sales) / New customers`
- `Monthly contribution = (Net price − Variable cost) × Purchase frequency − Support cost`
- `LTV = Monthly contribution × Customer lifetime`
- `Payback = CAC / Monthly contribution`
- `Break-even customers = Monthly fixed and acquisition costs / Monthly contribution per customer`

> Это учебная модель для предварительной оценки. Она не заменяет бухгалтерский учёт, финансовую модель и проверку реальных когортных данных.
