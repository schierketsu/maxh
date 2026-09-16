import './env.js'
import { linkUser, upsertCompany } from './b2bStore.js'
import { lookupCompanyByInn } from './dadata.js'
import { answerCallback, api, chooseApiBase, keyboard } from './max.js'
import { formatMoney, matchPrograms } from './matching.js'
import { startServer } from './server.js'

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

function extractSender(target) {
  const message = target.message ?? target
  const userId = message?.sender?.user_id ?? target.callback?.user?.user_id ?? message?.recipient?.user_id
  const chatId = message?.recipient?.chat_id ?? target.chat_id
  return { userId, chatId }
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

  const { userId, chatId } = extractSender(target)
  upsertCompany(company.inn, {
    name: company.name,
    region: company.region,
    industry: company.industry,
    okved: company.okved,
  })
  if (userId) linkUser(company.inn, userId, chatId)

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
