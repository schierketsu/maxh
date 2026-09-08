import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Agent, fetch as undiciFetch } from 'undici'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '../..')

function loadToken() {
  if (process.env.MAX_BOT_TOKEN) return process.env.MAX_BOT_TOKEN.trim()
  const passPath = resolve(ROOT, 'in_help/pass.md')
  const raw = readFileSync(passPath, 'utf8')
  const line = raw.split(/\r?\n/).find((item) => item.includes('Токен'))
  if (!line) throw new Error('MAX_BOT_TOKEN is not set and pass.md has no token line')
  return line.split(':').slice(1).join(':').trim()
}

const TOKEN = loadToken()
const PREFERRED_BASE = process.env.MAX_API_BASE ?? 'https://platform-api2.max.ru'
const FALLBACK_BASE = 'https://platform-api.max.ru'
const insecureAgent = new Agent({ connect: { rejectUnauthorized: false } })

let apiBase = PREFERRED_BASE
let useInsecureTls = PREFERRED_BASE.includes('platform-api2')

export async function api(method, path, { query, body } = {}) {
  const url = new URL(path, apiBase)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value))
    }
  }

  const res = await undiciFetch(url, {
    method,
    headers: {
      Authorization: TOKEN,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    dispatcher: useInsecureTls ? insecureAgent : undefined,
  })

  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { raw: text }
  }

  if (!res.ok) {
    const error = new Error(`${method} ${path} → ${res.status}`)
    error.status = res.status
    error.payload = json
    throw error
  }

  return json
}

export async function chooseApiBase() {
  try {
    const me = await api('GET', '/me')
    console.log(`Connected as ${me.first_name} (@${me.username}), id=${me.user_id}`)
    if (useInsecureTls) {
      console.log('Using platform-api2 with TLS verify disabled (сертификат Минцифры не в хранилище Windows).')
    }
    return me
  } catch (error) {
    if (apiBase !== FALLBACK_BASE) {
      console.log(`Primary API failed (${error.message}), switching to ${FALLBACK_BASE}`)
      apiBase = FALLBACK_BASE
      useInsecureTls = false
      const me = await api('GET', '/me')
      console.log(`Connected as ${me.first_name} (@${me.username}), id=${me.user_id}`)
      return me
    }
    throw error
  }
}

export function keyboard(rows) {
  return [
    {
      type: 'inline_keyboard',
      payload: { buttons: rows },
    },
  ]
}

/** Send a message straight to a known MAX user_id. Fails silently-ish (throws) if that user never started the bot. */
export async function sendMessage(userId, text, attachments) {
  return api('POST', '/messages', {
    query: { user_id: userId },
    body: {
      text,
      format: 'markdown',
      attachments: attachments ?? null,
    },
  })
}

export async function answerCallback(callbackId, text, attachments) {
  return api('POST', '/answers', {
    query: { callback_id: callbackId },
    body: {
      message: {
        text,
        format: 'markdown',
        attachments: attachments ?? null,
      },
    },
  })
}
