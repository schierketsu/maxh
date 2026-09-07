# Мера — чат-бот MAX

Локальный long polling к `t264_hakaton_bot`. Тот же процесс поднимает HTTP API
для мини-приложения (поиск компании по ИНН через DaData).

## Запуск

Токен читается из `in_help/pass.md` или из переменной `MAX_BOT_TOKEN`.

Для поиска компаний по ИНН нужен ключ DaData API (бесплатный тариф,
регистрация на [dadata.ru](https://dadata.ru)):

```bash
export DADATA_API_KEY=ваш_ключ   # PowerShell: $env:DADATA_API_KEY = "..."
```

```bash
cd bot
npm start
```

В MAX найдите бота **t264_hakaton_bot** и отправьте `/start`.

## Что попробовать

- `/start` — меню
- `/ping` — проверка связи
- кнопки демо-компаний (реальные ИНН, данные подтягиваются из DaData)
- любой реальный ИНН (10 или 12 цифр)

## HTTP API для мини-приложения

Слушает `http://localhost:3001` (порт — переменная `PORT`).

- `GET /api/company/:inn` → `{ company }` или `404 { error }`, если компания
  не найдена. Ответы кэшируются на 10 минут.

На этой Windows `platform-api2.max.ru` падает на сертификате Минцифры, поэтому клиент сначала пробует api2 (без проверки TLS), иначе переключается на `platform-api.max.ru`.
