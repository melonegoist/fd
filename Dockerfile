# -------- 1. Build stage --------
FROM node:24-alpine AS build

WORKDIR /app

# Инструменты, нужные для node-gyp (ТОЛЬКО на этапе сборки)
RUN apk add --no-cache python3 make g++

# Устанавливаем зависимости
COPY package*.json ./
RUN npm ci

# Копируем код и собираем фронт
COPY . .
RUN npm run build


# -------- 2. Runtime stage --------
FROM nginx:alpine


# Копируем собранный фронт в nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Открываем порт
EXPOSE 80

# Запускаем nginx
CMD ["nginx", "-g", "daemon off;"]
