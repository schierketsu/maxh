import './env.js'
import { getCompanyByUserId, linkUser, listMyRequests, unlinkUserFromCompany, upsertCompany } from './b2bStore.js'
import { handleB2BCallback, handleB2BEntry, handleB2BText } from './b2bChat.js'
import { benefits, PROMO_BADGES } from './benefits.js'
import { clearSession } from './chatSessions.js'
import { lookupCompanyByInn } from './dadata.js'
import { DEMO_INNS, brandName } from './demoBrand.js'
import { getDemoNotifications } from './demoNotifications.js'
import { getDemoProfile } from './demoProfiles.js'
import { answerCallback, api, chooseApiBase, extractSender, keyboard, sendMessage, sendTo } from './max.js'
import { recommendOpportunities } from './recommend.js'
import { startServer } from './server.js'

// Реальной авторизации (Госуслуги) в проекте нет — ни в боте, ни в мини-аппе
// отдельной кнопки для неё больше нет, войти можно только через демо. Текст
// ниже — общее сообщение для неавторизованного пользователя (используется
// как fallback в нескольких местах, не только в этом файле).
const GOSUSLUGI_NOTICE_TEXT =
  'Авторизация через Госуслуги предполагается в реализованном продукте, на данный момент вы можете протестировать прототип через демо-аккаунты.'

const demoLabelCache = new Map()

async function demoLabel(inn) {
  const brand = brandName(inn, null)
  if (brand) return brand
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

/** Номер меры поддержки (1..6) — кнопка открывает её подробное описание
 *  (см. payload benefit:<id> в handleCallback). Эмодзи-цифрой, как и везде
 *  на кнопках с числами (см. numberEmoji). */
function benefitNumberRow() {
  return benefits.map((benefit, index) => ({
    type: 'callback',
    text: numberEmoji(index + 1),
    payload: `benefit:${benefit.id}`,
  }))
}

/** Главный экран после привязки компании (демо) — каталог мер поддержки
 *  прямо тут же (не за отдельной кнопкой, см. companyText), плюс переход к
 *  партнёрам, профилю и уведомлениям. До привязки этой клавиатуры нет —
 *  сначала нужно выбрать демо-компанию (см. authMenu). */
function mainMenu(userId) {
  const linked = userId ? getCompanyByUserId(userId) : null
  if (!linked) return undefined
  return keyboard([
    benefitNumberRow(),
    [{ type: 'callback', text: 'партнёры рядом', payload: 'menu:b2b' }],
    [{ type: 'callback', text: 'профиль', payload: 'menu:profile' }],
    [{ type: 'callback', text: 'уведомления', payload: 'menu:notifications' }],
  ])
}

/** Клавиатура для неавторизованного пользователя — те же демо-компании, что
 *  и на экране входа в мини-аппе (реальной авторизации пока нет, см.
 *  GOSUSLUGI_NOTICE_TEXT). */
async function authMenu() {
  const rows = await Promise.all(
    DEMO_INNS.map(async (inn) => [{ type: 'callback', text: await demoLabel(inn), payload: `inn:${inn}` }]),
  )
  return keyboard(rows)
}

/** Меню для уже привязанной компании, иначе — экран входа. */
async function currentMenu(userId) {
  return mainMenu(userId) ?? (await authMenu())
}

/** Текст для уже привязанной компании — сразу каталог мер (companyText),
 *  иначе приветствие с просьбой выбрать демо. */
function landingText(userId, name) {
  const linked = userId ? getCompanyByUserId(userId) : null
  return linked ? companyText(linked) : startText(name)
}

function startText(name) {
  const who = name ? `, ${name}` : ''
  return [
    `Привет${who}! Я Мера — ИИI-агент господдержки и партнёрской сети для бизнеса.`,
    '',
    'Профиль подтверждён через Госуслуги — нашли компании, которыми вы владеете:',
  ].join('\n')
}

/** Число полученных предложений по своим заявкам плюс демо-уведомления
 *  (см. demoNotifications.js) — тот же смысл, что и у плашки уведомлений в
 *  мини-аппе (ChooseModePage.tsx). */
function notificationsCount(inn, ownerUserId) {
  const realCount = listMyRequests(inn, ownerUserId).reduce((sum, request) => sum + request.offers.length, 0)
  return realCount + getDemoNotifications(inn).length
}

/** 1️⃣2️⃣… — юникодная "клавиша с цифрой", той же цифрой, что и у кнопки под
 *  этим пунктом (benefitNumberRow), чтобы в тексте и в клавиатуре было
 *  видно одно и то же число. */
function numberEmoji(n) {
  return `${n}️⃣`
}

/** Короткая версия — заголовок и только первая строка описания, полный
 *  текст доступен по кнопке-цифре (см. benefitDetailText). */
function companyText(company) {
  const lines = [brandName(company.inn, company.name), `Уведомления: ${notificationsCount(company.inn, company.userId)}`, '']

  benefits.forEach((benefit, index) => {
    const shortDescription = benefit.description.split('\n')[0]
    lines.push(`${numberEmoji(index + 1)} ${benefit.title}`, shortDescription, '')
  })

  lines.push('Хотите ознакомиться с чем-то?')
  return lines.join('\n')
}

function benefitDetailText(benefit, index) {
  return [benefit.title, '', benefit.description, '', PROMO_BADGES[index % PROMO_BADGES.length]].join('\n')
}

/** Столько же звёзд, сколько заливается в мини-аппе при округлении рейтинга
 *  до целого — там это плавная заливка по проценту, тут только целые. */
function starsText(rating) {
  const filled = Math.round(rating)
  return '★'.repeat(filled) + '☆'.repeat(5 - filled)
}

function ratingText(rating) {
  return `${rating.toFixed(1).replace('.', ',')} ${starsText(rating)}`
}

function profileText(linked) {
  const demo = getDemoProfile(linked.inn)
  const lines = [brandName(linked.inn, linked.name)]
  if (demo) lines.push(ratingText(demo.rating))
  return lines.join('\n')
}

function profileMenu(linked) {
  const demo = getDemoProfile(linked.inn)
  const rows = []
  const quickRow = []
  if (demo?.reviews.length) quickRow.push({ type: 'callback', text: 'отзывы', payload: 'profile:reviews' })
  quickRow.push({ type: 'callback', text: 'заявки', payload: 'b2b:my' })
  rows.push(quickRow)
  rows.push([{ type: 'callback', text: 'выйти из аккаунта', payload: 'profile:logout' }])
  rows.push([{ type: 'callback', text: 'назад', payload: 'menu:main' }])
  return keyboard(rows)
}

function reviewsText(linked) {
  const demo = getDemoProfile(linked.inn)
  if (!demo) return 'Отзывов пока нет.'
  const lines = [`${ratingText(demo.rating)} · на основании ${demo.reviews.length} оценок`, '']
  for (const review of demo.reviews.slice(0, 5)) {
    lines.push(`${review.title} · ${starsText(review.rating)} · ${review.date}`, review.text, '')
  }
  if (demo.reviews.length > 5) lines.push(`И ещё ${demo.reviews.length - 5}.`)
  return lines.join('\n')
}

async function handleInn(target, inn) {
  const { userId, chatId } = extractSender(target)

  let company
  try {
    company = await lookupCompanyByInn(inn)
  } catch (error) {
    console.error('DaData lookup failed:', error.message)
    const text = 'Не удалось получить данные по ИНН. Попробуйте ещё раз чуть позже.'
    if (target.callback) {
      await answerCallback(target.callback.callback_id, text, await currentMenu(userId))
    } else {
      await sendTo(target, text, await currentMenu(userId))
    }
    return
  }

  if (!company) {
    const text = [`Компания с ИНН ${inn} не найдена.`, 'Попробуйте демо-компанию:'].join('\n')
    if (target.callback) {
      await answerCallback(target.callback.callback_id, text, await authMenu())
    } else {
      await sendTo(target, text, await authMenu())
    }
    return
  }

  upsertCompany(company.inn, {
    name: company.name,
    region: company.region,
    industry: company.industry,
    okved: company.okved,
  })
  if (userId) linkUser(company.inn, userId, chatId)

  const text = companyText(company)
  if (target.callback) {
    await answerCallback(target.callback.callback_id, text, mainMenu(userId))
  } else {
    await sendTo(target, text, mainMenu(userId))
  }
}

/** Пуш с персональной рекомендацией чужой заявки (см. recommend.js) —
 *  отдельным сообщением, после того как пользователь вышел из раздела
 *  партнёров (см. payload b2b:exit). Молча ничего не делает, если
 *  рекомендаций нет или отправка не удалась — это дополнение к основному
 *  ответу, а не критичная часть флоу. */
async function sendRecommendationPush(userId, linked) {
  if (!userId) return
  let recommendations
  try {
    recommendations = await recommendOpportunities(linked, userId)
  } catch (error) {
    console.error('Recommendation push failed:', error.message)
    return
  }
  if (recommendations.length === 0) return

  const top = recommendations[0]
  const text = [
    'Пока вы смотрели партнёров, мы подобрали для вас возможность:',
    '',
    `«${brandName(top.requesterInn, top.requesterName)}» ${top.direction === 'supply' ? 'предлагает' : 'ищет'}: ${top.item}`,
  ].join('\n')

  try {
    await sendMessage(
      userId,
      text,
      keyboard([[{ type: 'callback', text: 'предложить цену', payload: `b2b:offer:${top.id}` }]]),
    )
  } catch (error) {
    console.error('Recommendation push send failed:', error.message)
  }
}

async function handleCallback(update) {
  const payload = update.callback?.payload ?? ''
  const callbackId = update.callback.callback_id
  const { userId } = extractSender(update)

  if (payload.startsWith('inn:')) {
    await handleInn(update, payload.slice(4))
    return
  }
  if (payload === 'menu:main') {
    if (userId) clearSession(userId)
    const linked = userId ? getCompanyByUserId(userId) : null
    if (!linked) {
      await answerCallback(callbackId, GOSUSLUGI_NOTICE_TEXT, await authMenu())
      return
    }
    await answerCallback(callbackId, companyText(linked), mainMenu(userId))
    return
  }
  if (payload === 'b2b:exit') {
    if (userId) clearSession(userId)
    const linked = userId ? getCompanyByUserId(userId) : null
    if (!linked) {
      await answerCallback(callbackId, GOSUSLUGI_NOTICE_TEXT, await authMenu())
      return
    }
    await answerCallback(callbackId, companyText(linked), mainMenu(userId))
    await sendRecommendationPush(userId, linked)
    return
  }
  if (payload === 'menu:b2b') {
    await handleB2BEntry(update)
    return
  }
  if (payload.startsWith('b2b:')) {
    await handleB2BCallback(update, payload)
    return
  }
  if (payload.startsWith('benefit:')) {
    const id = payload.slice('benefit:'.length)
    const index = benefits.findIndex((benefit) => benefit.id === id)
    if (index === -1) {
      await answerCallback(callbackId, 'Не нашёл эту меру поддержки.', await currentMenu(userId))
      return
    }
    await answerCallback(
      callbackId,
      benefitDetailText(benefits[index], index),
      keyboard([[{ type: 'callback', text: 'назад', payload: 'menu:main' }]]),
    )
    return
  }
  if (payload === 'menu:notifications') {
    const linked = userId ? getCompanyByUserId(userId) : null
    if (!linked) {
      await answerCallback(callbackId, GOSUSLUGI_NOTICE_TEXT, await authMenu())
      return
    }
    const demoNotifications = getDemoNotifications(linked.inn)
    await answerCallback(
      callbackId,
      demoNotifications.length > 0 ? demoNotifications.join('\n') : 'Ожидается разработка',
      keyboard([[{ type: 'callback', text: 'назад', payload: 'menu:main' }]]),
    )
    return
  }
  if (payload === 'menu:profile') {
    const linked = userId ? getCompanyByUserId(userId) : null
    if (!linked) {
      await answerCallback(callbackId, GOSUSLUGI_NOTICE_TEXT, await authMenu())
      return
    }
    await answerCallback(callbackId, profileText(linked), profileMenu(linked))
    return
  }
  if (payload === 'profile:reviews') {
    const linked = userId ? getCompanyByUserId(userId) : null
    if (!linked) {
      await answerCallback(callbackId, GOSUSLUGI_NOTICE_TEXT, await authMenu())
      return
    }
    await answerCallback(
      callbackId,
      reviewsText(linked),
      keyboard([[{ type: 'callback', text: 'назад', payload: 'menu:profile' }]]),
    )
    return
  }
  if (payload === 'profile:logout') {
    if (userId) unlinkUserFromCompany(userId)
    if (userId) clearSession(userId)
    await answerCallback(callbackId, 'Вы вышли из аккаунта. Выберите демо-компанию заново:', await authMenu())
    return
  }

  await answerCallback(callbackId, 'Не распознал кнопку. Нажмите /start', await currentMenu(userId))
}

async function handleMessage(update) {
  const text = (update.message?.body?.text ?? '').trim()
  const name = update.message?.sender?.first_name
  const command = text.split(/\s+/)[0].replace(/^\//, '').split('@')[0].toLowerCase()
  const { userId } = extractSender(update)

  if (text.startsWith('/') && userId) clearSession(userId)

  if (!text || command === 'start') {
    await sendTo(update, landingText(userId, name), await currentMenu(userId))
    return
  }
  if (command === 'help') {
    await sendTo(
      update,
      ['Команды:', '/start — начать', '/demo — демо-компании', '/help — эта справка'].join('\n'),
      await currentMenu(userId),
    )
    return
  }
  if (command === 'demo') {
    await sendTo(update, 'Выберите демо-компанию:', await authMenu())
    return
  }

  if (await handleB2BText(update, text)) return

  const linked = userId ? getCompanyByUserId(userId) : null
  if (!linked) {
    await sendTo(update, GOSUSLUGI_NOTICE_TEXT, await authMenu())
    return
  }

  await sendTo(update, 'Не понял сообщение. Нажмите кнопку ниже.', mainMenu(userId))
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
    await sendTo(fake, landingText(update.user?.user_id, update.user?.first_name), await currentMenu(update.user?.user_id))
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
        { name: 'demo', description: 'Демо-компании' },
        { name: 'help', description: 'Показать справку по командам' },
      ],
    },
  })
  console.log('Bot commands updated: /start /demo /help')
}

async function poll() {
  let marker
  console.log('Long polling started. Open MAX → t215_hakaton_max_bot and send /start')

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
