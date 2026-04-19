# Многоэтапная сборка: сначала собираем клиент, потом запускаем сервер
FROM node:20-alpine AS builder

# Устанавливаем зависимости для сборки клиента
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install --legacy-peer-deps

# Копируем исходники клиента и собираем
COPY client/ ./
RUN npm run build

# Финальный образ — только сервер + собранный клиент
FROM node:20-alpine

WORKDIR /app/server
COPY server/package*.json ./
RUN npm install --production

# Копируем серверный код
COPY server/ ./

# Копируем собранный клиент как статику
RUN mkdir -p public
COPY --from=builder /app/client/dist ./public

EXPOSE 3000

CMD ["node", "index.js"]
