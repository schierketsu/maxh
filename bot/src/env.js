import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Импортируется первым в index.js (до max.js/dadata.js/llm.js), чтобы
// process.env был заполнен до того, как эти модули читают ключи на своём
// верхнем уровне — порядок инициализации ES-модулей идёт по порядку import,
// а не по порядку кода в index.js.
function loadEnvFile() {
  // Сначала bot/.env (если кто-то держит ключи рядом с ботом), затем общий
  // .env в корне репозитория — его же читают docker compose и Vite, так что
  // проверяющему достаточно одного файла на всё решение.
  const here = dirname(fileURLToPath(import.meta.url))
  const envPath = [resolve(here, '../.env'), resolve(here, '../../.env')].find((candidate) =>
    existsSync(candidate),
  )
  if (!envPath) return
  const raw = readFileSync(envPath, 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    if (!(key in process.env)) process.env[key] = value
  }
}

loadEnvFile()
