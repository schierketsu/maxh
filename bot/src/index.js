import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Agent, fetch as undiciFetch } from 'undici'
import { lookupCompanyByInn } from './dadata.js'
import { formatMoney, matchPrograms } from './matching.js'
import { startServer } from './server.js'

function loadEnvFile() {
  const envPath = resolve(dirname(fileURLToPath(import.meta.url)), '../.env')
  if (!existsSync(envPath)) return
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

const DEMO_INNS = ['7707083893', '500100732259', '1653001805']
const demoLabelCache = new Map()

async function demoLabel(inn) {
  if (demoLabelCache.has(inn)) return demoLabelCache.get(inn)
  try {
    const company = await lookupCompanyByInn(inn)
    const label = company?.name ?? inn
    demoLabelCache.set(inn, label)
    return label
  } catch {
    return inn
  }
}

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

async function api(method, path, { query, body } = {}) {
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

async function chooseApiBase() {
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

function keyboard(rows) {
  return [
    {
      type: 'inline_keyboard',
      payload: { buttons: rows },
    },
  ]
}

function mainMenu() {
  return keyboard([
    [{ type: 'callback', text: 'Подобрать меры', payload: 'menu:match' }],
    [
      { type: 'callback', text: 'Демо-компании', payload: 'menu:demo' },
      { type: 'callback', text: 'Как это работает', payload: 'menu:how' },
    ],
    [{ type: 'callback', text: 'Ping', payload: 'menu:ping' }],
  ])
}

async function demoMenu() {
  const rows = await Promise.all(
    DEMO_INNS.map(async (inn) => [
      { type: 'callback', text: await demoLabel(inn), payload: `inn:${inn}` },
    ]),
  )
  return keyboard(rows)
}

function startText(name) {
  const who = name ? `, ${name}` : ''
  return [
    `Привет${who}! Я Мера — AI-агент господдержки бизнеса.`,
    '',
    'Пришлите ИНН (10 или 12 цифр) или выберите демо-компанию.',
    'Я подберу 3–5 подходящих программ и объясню соответствие.',
  ].join('\n')
}

function companyText(company) {
  const matches = matchPrograms(company)
  const total = matches.reduce((sum, item) => sum + item.amountPotential, 0)
  const lines = [
    `Профиль: ${company.name}`,
    `${company.region} · ${company.industry} · ${company.employees} сотрудников`,
    '',
    `Нашлось ${matches.length} программ, потенциал до ${formatMoney(total)}.`,
    '',
  ]

  for (const item of matches) {
    const gaps = item.unmet.length
      ? ` · осталось ${item.unmet.length} усл.`
      : ' · подходит'
    lines.push(`• ${item.score}% · ${item.program.title} · ${formatMoney(item.amountPotential)}${gaps}`)
  }

  lines.push('', 'Пришлите другой ИНН или нажмите «Демо-компании».')
  return lines.join('\n')
}

async function sendTo(updateOrMessage, text, attachments) {
  const message = updateOrMessage.message ?? updateOrMessage
  const userId = message?.sender?.user_id ?? message?.recipient?.user_id
  const chatId = message?.recipient?.chat_id
  const query = userId ? { user_id: userId } : { chat_id: chatId }
  return api('POST', '/messages', {
    query,
    body: {
      text,
      format: 'markdown',
      attachments: attachments ?? null,
    },
  })
}

async function answerCallback(callbackId, text, attachments) {
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

async function handleInn(target, inn) {
  let company
  try {
    company = await lookupCompanyByInn(inn)
  } catch (error) {
    console.error('DaData lookup failed:', error.message)
    const text = 'Не удалось получить данные по ИНН. Попробуйте ещё раз чуть позже.'
    if (target.callback) {
      await answerCallback(target.callback.callback_id, text, mainMenu())
    } else {
      await sendTo(target, text, mainMenu())
    }
    return
  }

  if (!company) {
    const text = [
      `Компания с ИНН ${inn} не найдена.`,
      'Проверьте номер или попробуйте демо-компанию:',
    ].join('\n')
    if (target.callback) {
      await answerCallback(target.callback.callback_id, text, await demoMenu())
    } else {
      await sendTo(target, text, await demoMenu())
    }
    return
  }

  const text = companyText(company)
  if (target.callback) {
    await answerCallback(target.callback.callback_id, text, mainMenu())
  } else {
    await sendTo(target, text, mainMenu())
  }
}

async function handleCallback(update) {
  const payload = update.callback?.payload ?? ''
  const callbackId = update.callback.callback_id

  if (payload === 'menu:ping') {
    await answerCallback(callbackId, 'pong — бот на связи.', mainMenu())
    return
  }
  if (payload === 'menu:how') {
    await answerCallback(
      callbackId,
      [
        'Сценарий Меры:',
        '1. Берём ИНН и собираем профиль бизнеса.',
        '2. Сопоставляем его с требованиями программ.',
        '3. Показываем 3–5 самых реальных мер, а не весь каталог.',
        '',
        'Дальше подключим мини-приложение и уведомления о новых грантах.',
      ].join('\n'),
      mainMenu(),
    )
    return
  }
  if (payload === 'menu:demo' || payload === 'menu:match') {
    await answerCallback(
      callbackId,
      payload === 'menu:demo'
        ? 'Выберите демо-компанию или пришлите свой ИНН.'
        : 'Пришлите ИНН или выберите демо-компанию.',
      await demoMenu(),
    )
    return
  }
  if (payload.startsWith('inn:')) {
    await handleInn(update, payload.slice(4))
    return
  }

  await answerCallback(callbackId, 'Не распознал кнопку. Нажмите /start', mainMenu())
}

async function handleMessage(update) {
  const text = (update.message?.body?.text ?? '').trim()
  const name = update.message?.sender?.first_name
  const command = text.split(/\s+/)[0].replace(/^\//, '').split('@')[0].toLowerCase()

  if (!text || command === 'start') {
    await sendTo(update, startText(name), mainMenu())
    return
  }
  if (command === 'ping') {
    await sendTo(update, 'pong', mainMenu())
    return
  }
  if (command === 'help') {
    await sendTo(
      update,
      [
        'Команды:',
        '/start — начать',
        '/ping — проверка связи',
        '/help — эта справка',
        '/demo — демо-компании',
        '',
        'Или просто пришлите ИНН.',
      ].join('\n'),
      mainMenu(),
    )
    return
  }
  if (command === 'demo') {
    await sendTo(update, 'Выберите демо-компанию:', await demoMenu())
    return
  }

  const digits = text.replace(/\D/g, '')
  if (digits.length === 10 || digits.length === 12) {
    await handleInn(update, digits)
    return
  }

  await sendTo(
    update,
    'Не понял сообщение. Пришлите ИНН или нажмите кнопку ниже.',
    mainMenu(),
  )
}

async function handleUpdate(update) {
  const type = update.update_type
  console.log(`← ${type}`)

  if (type === 'bot_started') {
    const fake = {
      message: {
        sender: update.user,
        recipient: { chat_id: update.chat_id, user_id: update.user?.user_id },
      },
    }
    await sendTo(fake, startText(update.user?.first_name), mainMenu())
    return
  }
  if (type === 'message_callback') {
    await handleCallback(update)
    return
  }
  if (type === 'message_created') {
    if (update.message?.sender?.is_bot) return
    await handleMessage(update)
  }
}

async function registerCommands() {
  await api('PATCH', '/me/commands', {
    body: {
      commands: [
        { name: 'start', description: 'Запустить бота' },
        { name: 'demo', description: 'Демо-компании для подбора мер' },
        { name: 'ping', description: 'Проверить работоспособность бота' },
        { name: 'help', description: 'Показать справку по командам' },
      ],
    },
  })
  console.log('Bot commands updated: /start /demo /ping /help')
}

async function poll() {
  let marker
  console.log('Long polling started. Open MAX → t264_hakaton_bot and send /start')

  while (true) {
    try {
      const data = await api('GET', '/updates', {
        query: {
          timeout: 30,
          limit: 100,
          marker: marker ?? undefined,
          types: 'bot_started,message_created,message_callback',
        },
      })
      marker = data.marker ?? marker
      for (const update of data.updates ?? []) {
        try {
          await handleUpdate(update)
        } catch (error) {
          console.error('Update failed:', error.message, error.payload ?? '')
        }
      }
    } catch (error) {
      console.error('Poll failed:', error.message, error.payload ?? '')
      await new Promise((resolveWait) => setTimeout(resolveWait, 2000))
    }
  }
}

const me = await chooseApiBase()
const subs = await api('GET', '/subscriptions')
if ((subs.subscriptions ?? []).length > 0) {
  console.log('Webhook subscriptions exist; long polling may not receive events.')
  console.log(JSON.stringify(subs.subscriptions, null, 2))
}
await registerCommands()
startServer()
await poll()
void me
