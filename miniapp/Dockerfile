# Сборка статики и раздача её вместе с прокси на API бота.
# Мини-приложение обращается к API по относительному пути (/api/...), поэтому
# статика и прокси должны жить за одним адресом — иначе в браузере получится
# кросс-доменный запрос, и понадобится CORS там, где он не нужен.

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# Vite подставляет переменные с префиксом VITE_ на этапе сборки: в рантайме
# менять их уже нельзя, поэтому они приходят аргументами сборки.
ARG VITE_YANDEX_MAPS_API_KEY=""
ARG VITE_API_BASE_URL=""
ENV VITE_YANDEX_MAPS_API_KEY=$VITE_YANDEX_MAPS_API_KEY
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# Caddy — тот же веб-сервер, что на боевом стенде, чтобы поведение совпадало.
FROM caddy:2-alpine
COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
EXPOSE 8080
