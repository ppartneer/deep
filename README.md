# 🌊 DEEP Messenger

> Сверхзащищённый, полностью автономный E2EE веб-мессенджер.  
> Работает как сейф на дне океана — сервер не видит содержимого ваших сообщений.

---

## ✨ Возможности

- 🔒 **Сквозное шифрование (E2EE)** — RSA-OAEP 2048 бит + AES-GCM 256 бит через Web Crypto API
- 🔑 **Белый список** — никакой регистрации, вход только по коду доступа
- 🌊 **Ocean Floor Wipe** — экстренное самостоятельное уничтожение всех данных
- 🔔 **Push-уведомления** — полноценный Web Push (Service Worker + VAPID)
- 📱 **PWA / Mobile-First** — устанавливается на домашний экран телефона
- 🛡️ **Панель СОНАР** — управление пользователями только для администратора
- 💾 **Нет внешних БД** — только SQLite-файл, всё «из коробки»

---

## 🚀 Деплой на Render (рекомендуется, бесплатно)

### Шаг 1 — Подготовить GitHub-репозиторий

```bash
cd DEEP-02
git init
git add .
git commit -m "feat: DEEP Messenger initial commit"
# Создайте репозиторий на GitHub и добавьте remote:
git remote add origin https://github.com/ВАШ_НИК/deep-messenger.git
git push -u origin main
```

### Шаг 2 — Сгенерировать VAPID-ключи

```bash
cd server
npm install
node -e "const w=require('web-push'); const k=w.generateVAPIDKeys(); console.log('PUBLIC:', k.publicKey); console.log('PRIVATE:', k.privateKey);"
```
Сохраните оба ключа — они понадобятся на следующем шаге.

### Шаг 3 — Создать сервис на Render

1. Зайдите на [render.com](https://render.com) → **New → Web Service**
2. Подключите ваш GitHub-репозиторий
3. Render автоматически обнаружит `render.yaml` и предзаполнит настройки
4. В разделе **Environment Variables** вручную укажите:

| Переменная | Значение |
|---|---|
| `ADMIN_CODE` | Ваш секретный код доступа для первого входа (например, UUID) |
| `VAPID_PUBLIC_KEY` | Из шага 2 |
| `VAPID_PRIVATE_KEY` | Из шага 2 |
| `VAPID_EMAIL` | Ваш e-mail |

5. Нажмите **Deploy** → дождитесь завершения сборки (~2-3 мин)

> ⚠️ **Важно:** После деплоя ваше приложение будет доступно по URL вида `https://deep-messenger-xxxx.onrender.com`. Войдите с `ADMIN_CODE` и сразу сохраните этот код в безопасном месте.

---

## 🛤️ Деплой на Railway (альтернатива)

```bash
# Устновить Railway CLI
npm install -g @railway/cli
railway login
railway init
railway up
```

В Railway Dashboard добавьте те же переменные из таблицы выше + `PORT=8080`.

---

## 💻 Локальный запуск

```bash
# Клонировать и установить зависимости
git clone ...
cd DEEP-02

# Настроить переменные
cp .env.example server/.env
# Отредактируйте server/.env и укажите ADMIN_CODE и другие значения

# Собрать клиент и запустить всё
npm run build
npm start
```

Приложение будет доступно по адресу: **http://localhost:3000**

---

## 🔧 Архитектура

```
DEEP-02/
├── server/               # Node.js + Express бэкенд
│   ├── index.js          # Точка входа
│   ├── database.js       # SQLite (таблицы: users, messages, subscriptions)
│   ├── websocket.js      # WS-ретранслятор (слепой — не видит содержимое)
│   ├── routes/
│   │   ├── auth.js       # Авторизация, ключи, push-подписки, wipe
│   │   └── admin.js      # Управление белым списком (только для admin)
│   └── public/           # Собранный React-фронтенд (раздаётся как статика)
│
├── client/               # React + Vite + Tailwind фронтенд
│   └── src/
│       ├── config.js     # Динамические URL (dev/prod)
│       ├── services/
│       │   ├── cryptoService.js   # Web Crypto API (E2EE)
│       │   └── storageService.js  # IndexedDB (ключи и история)
│       └── components/
│           ├── Login.jsx      # Экран входа
│           ├── Chat.jsx       # Основной чат
│           ├── Settings.jsx   # Ocean Floor Wipe
│           └── AdminPanel.jsx # Панель СОНАР
│
├── render.yaml           # Конфиг автодеплоя для Render
├── .env.example          # Шаблон переменных окружения
└── .gitignore
```

---

## 🛡️ Безопасность

- **Приватный ключ** хранится исключительно в `IndexedDB` браузера — никогда не передаётся на сервер
- **Сервер — слепой ретранслятор**: получает только зашифрованные блобы, расшифровать не может
- **Администратор не видит** содержимого сообщений и приватных ключей
- **Ocean Floor Wipe** полностью удаляет пользователя: код из БД, все сообщения, push-подписки — и стирает `IndexedDB` в браузере
