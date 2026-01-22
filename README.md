# FinDash - Financial Dashboard

Современное веб-приложение для управления финансами с real-time отслеживанием криптовалют.

## Структура проекта

```
FinDash/
├── frontend/          # React фронтенд приложение
│   ├── src/
│   │   ├── components/    # React компоненты
│   │   ├── context/       # Context API для состояния
│   │   ├── services/      # Сервисы (API, WebSocket)
│   │   └── styles/        # CSS стили
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## Требования

- **Node.js** 24+ (проверено на 22.20.0)
- **npm** или **yarn**
- **PostgreSQL** 12+ (опционально - проект работает в mock-режиме без БД)
- **Git**

## Порты

- **Frontend (Vite):** `5173` (по умолчанию)
- **Backend (Express):** `3500` (по умолчанию, настраивается через PORT)
- **PostgreSQL:** `5432` (если используется)
- **Docker:** `80` (production)

## Быстрый старт

### Вариант 1: Только Frontend (для разработки UI)

```bash
cd frontend
npm install
npm run dev
```

Откройте http://localhost:5173

> **Примечание:** API запросы будут направлены на backend через прокси (localhost:3500), но backend должен быть запущен отдельно.

### Вариант 2: Полный запуск (Frontend + Backend)

**1. Установите зависимости:**

```bash
# Установка зависимостей фронтенда
cd frontend
npm install

# Возвращаемся в корень проекта
cd ..
```

**2. Настройте переменные окружения (опционально):**

Создайте файл `.env` в корне проекта:

```env
# Backend порт (по умолчанию 3500)
PORT=3500
NODE_ENV=development

# PostgreSQL (опционально - если не указано, используется mock-режим)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=findash
DB_USER=postgres
DB_PASSWORD=your_password

# API ключи (опционально - без них используются mock данные)
COINLAYER_API_KEY=your_coinlayer_key
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key

# Sentry (опционально)
VITE_SENTRY_DSN=your_sentry_dsn
```

**3. Настройте PostgreSQL (если используете реальную БД):**

```bash
# Создайте базу данных
createdb findash

# Примените схему
psql findash < backend/database/schema.sql
```

**4. Запустите Backend сервер:**

```bash
# Из корня проекта
cd backend
node server.js

# Или с автоперезагрузкой (если установлен nodemon)
npm run server:dev
```

Backend будет доступен на http://localhost:3500

**5. Запустите Frontend (в новом терминале):**

```bash
cd frontend
npm run dev
```

Frontend будет доступен на http://localhost:5173

**6. Откройте в браузере:**

- Frontend: http://localhost:5173
- Backend API: http://localhost:3500/api
- Health Check: http://localhost:3500/health

### Вариант 3: Docker (Production)

```bash
# Сборка образа
docker build -t findash .

# Запуск контейнера
docker run -d -p 80:80 findash
```

Приложение будет доступно на http://localhost

## Функционал

### Авторизация
- Форма авторизации с валидацией
- Шифрование паролей (AES)
- Сохранение токенов в localStorage
- Защищенные маршруты

**Тестовые данные:**
- Email: test@example.com
- Password: любой

### Real-time отслеживание валют
- Добавление/удаление валют
- Live обновление цен через WebSocket (эмулируется)
- Интерактивные графики (Chart.js)
- История изменений цен
- Визуализация процентных изменений

### Отчёты
- Формирование отчётов по валютам
- Выбор периода и интервала
- Генерация PDF и CSV отчётов
- История созданных отчётов
- Скачивание отчётов
- Статистика (мин/макс/средняя цена)

## Технологии

### Frontend
- React 19 + TypeScript
- React Router - маршрутизация
- React Context API - управление состоянием
- Chart.js + react-chartjs-2 - графики
- WebSocket - real-time обновления
- jsPDF + jspdf-autotable - генерация PDF
- Vite - сборщик

### Стек
- ESLint + Stylelint - линтеры
- Prettier - форматирование
- CryptoJS - шифрование

## Разработка

### Frontend команды:

```bash
cd frontend

npm run dev          # Dev сервер (localhost:5173)
npm run build        # Продакшн сборка
npm run lint         # Проверка ESLint
npm run preview      # Просмотр продакшн сборки
npm run prettier:check  # Проверка форматирования
npm run prettier:fix    # Автоисправление форматирования
npm run test:unit       # Unit тесты
npm run test:unit:coverage  # Unit тесты с покрытием
npm run test:e2e        # E2E тесты (Playwright)
npm run server          # Запуск backend сервера (из frontend/)
npm run server:dev      # Запуск backend с автоперезагрузкой
```

### Backend команды:

```bash
cd backend
node server.js         # Запуск сервера (порт 3500)
```

### Тестовые пользователи:

После применения схемы БД создаются пользователи по умолчанию:

- **Email:** `admin`, **Password:** `admin` (SHA256 хеш)
- **Email:** `user`, **Password:** `user` (SHA256 хеш)

> Примечание: Пароли хешируются на клиенте перед отправкой на сервер.

## Архитектура

### Авторизация
1. AuthView - форма входа
2. AuthService - API авторизации
3. AuthContext - глобальное состояние
4. Confirm - подтверждение входа
5. PrivateRoute - защита маршрутов

### Валюты и графики
1. ValueLocator - выбор валюты
2. CurrencyAPI - загрузка данных
3. WebSocketService - real-time обновления
4. CurrencyContext - состояние валют
5. UpdateGraphicsService - форматирование данных для графиков
6. ChartsView - отображение графиков

### Отчёты
1. ReportForm - форма параметров отчёта
2. ReportService - генерация PDF/CSV
3. ReportContext - состояние отчётов
4. ReportHistory - таблица истории
5. ReportsPage - страница отчётов

## Дизайн

Градиентный дизайн: голубой (#667eea) → светло-фиолетовый (#764ba2)
- Полупрозрачные карточки с backdrop blur
- Плавные анимации
- Адаптивная верстка
- Современный UI/UX

## Устранение проблем

### Backend не запускается

1. **Проверьте, что Node.js версии 24+ установлен:**
   ```bash
   node --version
   ```

2. **Если ошибка с модулями - переустановите зависимости:**
   ```bash
   cd frontend
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Backend работает без PostgreSQL:**
   - Если PostgreSQL не настроен, проект автоматически использует mock-режим
   - В консоли будет сообщение: "PostgreSQL not configured; falling back to in-memory mock data"

### Frontend не подключается к Backend

1. **Убедитесь, что backend запущен на порту 3500:**
   ```bash
   # Проверьте в браузере
   http://localhost:3500/health
   ```

2. **Проверьте прокси настройки в `frontend/vite.config.ts`:**
   - Прокси должен указывать на `http://localhost:3500`

3. **CORS ошибки:**
   - Backend настроен на разрешение всех origin (`cors()`)
   - Если проблемы остаются, проверьте `.env` файл

### Ошибки с зависимостями

1. **Очистите кэш и переустановите:**
   ```bash
   npm cache clean --force
   cd frontend
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Для Windows используйте правильные команды:**
   - Используйте `npm run server` вместо прямого запуска `node server.js`
   - Проверьте, что пути правильные

### WebSocket не работает

1. **Убедитесь, что backend запущен:**
   - WebSocket работает на том же порту, что и HTTP (`ws://localhost:3500`)

2. **Проверьте в консоли браузера:**
   - Откройте DevTools → Console
   - Должны быть сообщения о подключении

## Важные примечания

- **Без PostgreSQL:** Проект работает в mock-режиме с in-memory данными (данные теряются при перезапуске)
- **Без API ключей:** Используются mock данные для валют и акций (работает для демонстрации)
- **Sentry:** Опционально, проект работает без него (просто не будет отслеживания ошибок)
- **Режим разработки:** Frontend использует прокси для API запросов, поэтому backend должен быть запущен

## Структура запуска

```
┌─────────────────┐
│   Frontend      │
│  (Vite:5173)    │────┐
│                 │    │  Proxy /api
└─────────────────┘    │
                       ▼
                 ┌─────────────────┐
                 │    Backend      │
                 │ (Express:3500)  │
                 │                 │
                 │  ┌───────────┐  │
                 │  │PostgreSQL │  │ (опционально)
                 │  │  :5432    │  │
                 │  └───────────┘  │
                 │                 │
                 │  ┌───────────┐  │
                 │  │WebSocket  │  │
                 │  │  :3500    │  │
                 │  └───────────┘  │
                 └─────────────────┘
```

## Лицензия

MIT
