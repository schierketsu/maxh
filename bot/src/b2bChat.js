// B2B-сеть в чате бота — повторяет ту же логику, что и B2B-раздел
// мини-аппа (miniapp/src/pages/B2BHomePage.tsx, B2BNewRequestPage.tsx,
// B2BMyRequestsPage.tsx, B2BOfferPage.tsx), на тех же данных и функциях
// b2bStore.js, просто в виде пошагового диалога вместо форм и карты.
import {
  addOffer,
  createRequest,
  deleteRequest,
  getCompanyByUserId,
  getRequest,
  listMyRequests,
  listOpportunities,
  setRequestStatus,
} from './b2bStore.js'
import { clearSession, getSession, setSession } from './chatSessions.js'
import { brandName } from './demoBrand.js'
import { extractRequest } from './llm.js'
import { notifyNewRequest, notifyOfferSubmitted } from './b2bNotify.js'
import { formatMoney } from './matching.js'
import { answerCallback, extractSender, keyboard, sendTo } from './max.js'

const PAGE_SIZE = 5

function backRow(payload = 'menu:b2b') {
  return [{ type: 'callback', text: 'назад', payload }]
}

function b2bMenu() {
  return keyboard([
    [{ type: 'callback', text: 'мне что-то нужно', payload: 'b2b:new' }],
    [{ type: 'callback', text: 'мои заявки', payload: 'b2b:my' }],
    [{ type: 'callback', text: 'заявки рядом', payload: 'b2b:opps' }],
    // Отдельный payload (не menu:main) — чтобы index.js мог отличить именно
    // выход из раздела партнёров и следом прислать пуш с рекомендацией (см.
    // sendRecommendationPush в index.js), а не при любом "назад" в приложении.
    // Смайлик вместо текста — функционально это тоже "назад", просто из
    // самого верхнего уровня раздела.
    [{ type: 'callback', text: '⬅️', payload: 'b2b:exit' }],
  ])
}

function directionLabel(direction) {
  return direction === 'supply' ? 'даю' : 'ищу'
}

function numberEmoji(n) {
  return `${n}️⃣`
}

function requestLine(index, request) {
  const statusTag = request.status === 'active' ? '🟩' : '🟨'
  const parts = [`${index}. ${statusTag} «${directionLabel(request.direction)}» ${request.item}`]
  if (request.qty) parts.push(request.qty)
  if (request.budget) parts.push(formatMoney(request.budget))
  if (request.deadline) parts.push(`до ${request.deadline}`)
  return parts.join(' · ')
}

function notLinkedText() {
  return 'Сначала выберите демо-компанию — команда /demo.'
}

/** Вход в раздел партнёров — и с главного меню, и как "назад" из под-экранов. */
export async function handleB2BEntry(update) {
  const callback = update.callback
  const { userId } = extractSender(update)
  const linked = userId ? getCompanyByUserId(userId) : null

  if (!linked) {
    if (callback) {
      await answerCallback(callback.callback_id, notLinkedText(), undefined)
    } else {
      await sendTo(update, notLinkedText())
    }
    return
  }

  if (userId) clearSession(userId)
  const text = `Партнёры рядом — ${brandName(linked.inn, linked.name)}.\nЧто хотите сделать?`
  if (callback) {
    await answerCallback(callback.callback_id, text, b2bMenu())
  } else {
    await sendTo(update, text, b2bMenu())
  }
}

async function showMyRequests(callbackId, linked) {
  const requests = listMyRequests(linked.inn, linked.userId)
  if (requests.length === 0) {
    await answerCallback(callbackId, 'У вас пока нет заявок.', b2bMenu())
    return
  }
  const shown = requests.slice(0, PAGE_SIZE)
  const lines = shown.map((r, i) => {
    const offersPart = r.offers.length > 0 ? ` · ${r.offers.length} предл.` : ''
    return requestLine(i + 1, r) + offersPart
  })
  const numberRow = shown.map((r, i) => ({
    type: 'callback',
    text: numberEmoji(i + 1),
    payload: `b2b:my:manage:${r.id}`,
  }))
  const rows = [numberRow, backRow()]
  await answerCallback(callbackId, ['Ваши заявки:', '', ...lines].join('\n'), keyboard(rows))
}

async function showRequestManage(callbackId, linked, id) {
  const request = getRequest(id)
  if (!request || request.requesterInn !== linked.inn) {
    await answerCallback(callbackId, 'Заявка не найдена.', b2bMenu())
    return
  }
  const offers = listMyRequests(linked.inn, linked.userId).find((r) => r.id === id)?.offers ?? []

  const lines = [
    `«${directionLabel(request.direction)}» ${request.item}`,
    [request.qty, request.budget ? formatMoney(request.budget) : null, request.deadline ? `до ${request.deadline}` : null]
      .filter(Boolean)
      .join(' · '),
    request.notes,
    '',
    `Статус: ${request.status === 'active' ? 'активна' : 'на паузе'}`,
  ].filter((line) => line)

  if (offers.length > 0) {
    lines.push('', 'Предложения:')
    for (const offer of offers) {
      const price = offer.price ? ` — ${formatMoney(offer.price)}` : ''
      const terms = offer.terms ? ` (${offer.terms})` : ''
      lines.push(`• ${brandName(offer.supplierInn, offer.supplierName)}${price}${terms}`)
    }
  } else {
    lines.push('', 'Предложений пока нет.')
  }

  const rows = [
    [
      {
        type: 'callback',
        text: request.status === 'active' ? 'деактивировать' : 'активировать',
        payload: `b2b:my:toggle:${id}`,
      },
      { type: 'callback', text: 'удалить', payload: `b2b:my:delete:${id}` },
    ],
    backRow('b2b:my'),
  ]
  await answerCallback(callbackId, lines.join('\n'), keyboard(rows))
}

async function showOpportunities(callbackId, linked) {
  const opportunities = listOpportunities(linked.inn, linked.okved, linked.userId)
  if (opportunities.length === 0) {
    await answerCallback(callbackId, 'Пока нет открытых заявок от других компаний.', b2bMenu())
    return
  }
  const shown = opportunities.slice(0, PAGE_SIZE)
  const lines = shown.map((r, i) => `${requestLine(i + 1, r)}\n   ${brandName(r.requesterInn, r.requesterName)}`)
  const rows = shown.map((r, i) => [
    { type: 'callback', text: `${numberEmoji(i + 1)} связаться`, payload: `b2b:offer:${r.id}` },
  ])
  rows.push(backRow())
  await answerCallback(callbackId, ['Заявки рядом:', '', ...lines].join('\n'), keyboard(rows))
}

export async function handleB2BCallback(update, payload) {
  const callbackId = update.callback.callback_id
  const { userId } = extractSender(update)
  const linked = userId ? getCompanyByUserId(userId) : null

  if (!linked) {
    await answerCallback(callbackId, notLinkedText(), undefined)
    return
  }

  if (payload === 'b2b:new') {
    setSession(userId, { flow: 'b2b_new', step: 'direction' })
    await answerCallback(
      callbackId,
      'Вы что-то ищете или предлагаете?',
      keyboard([
        [
          { type: 'callback', text: 'ищу', payload: 'b2b:new:dir:demand' },
          { type: 'callback', text: 'даю', payload: 'b2b:new:dir:supply' },
        ],
        backRow(),
      ]),
    )
    return
  }

  if (payload === 'b2b:new:dir:demand' || payload === 'b2b:new:dir:supply') {
    const direction = payload.endsWith('supply') ? 'supply' : 'demand'
    setSession(userId, { flow: 'b2b_new', step: 'text', direction })
    const prompt =
      direction === 'supply'
        ? 'Опишите свободным текстом, что вы можете поставить — например: «есть 20 л молока в наличии, поставляем еженедельно».'
        : 'Опишите свободным текстом, что вам нужно — например: «нужно 20 л молока до завтра».'
    await answerCallback(callbackId, prompt, keyboard([backRow('b2b:new')]))
    return
  }

  if (payload === 'b2b:new:confirm') {
    const session = getSession(userId)
    if (session?.flow !== 'b2b_new' || session.step !== 'confirm') {
      await answerCallback(callbackId, 'Сессия истекла, начните заново.', b2bMenu())
      return
    }
    const { direction, fields, rawText } = session
    const request = createRequest({
      requesterInn: linked.inn,
      requesterName: linked.name,
      ownerUserId: userId,
      item: fields.item,
      qty: fields.qty,
      deadline: fields.deadline,
      budget: fields.budget,
      notes: fields.notes,
      rawText,
      direction,
    })
    clearSession(userId)
    const notified = await notifyNewRequest(request, linked)
    const text = [
      'Заявка создана.',
      notified > 0
        ? `Уведомили ${notified} подходящих компаний в MAX.`
        : 'Подходящих компаний с известным MAX-аккаунтом пока не нашлось — заявка всё равно видна в «Заявках рядом».',
    ].join('\n')
    await answerCallback(callbackId, text, b2bMenu())
    return
  }

  if (payload === 'b2b:new:retry') {
    const session = getSession(userId)
    const direction = session?.direction ?? 'demand'
    setSession(userId, { flow: 'b2b_new', step: 'text', direction })
    await answerCallback(callbackId, 'Хорошо, опишите ещё раз.', keyboard([backRow('b2b:new')]))
    return
  }

  if (payload === 'b2b:my') {
    clearSession(userId)
    await showMyRequests(callbackId, linked)
    return
  }

  if (payload.startsWith('b2b:my:manage:')) {
    await showRequestManage(callbackId, linked, payload.slice('b2b:my:manage:'.length))
    return
  }

  if (payload.startsWith('b2b:my:toggle:')) {
    const id = payload.slice('b2b:my:toggle:'.length)
    const request = getRequest(id)
    if (request && request.requesterInn === linked.inn) {
      setRequestStatus(id, request.status === 'active' ? 'inactive' : 'active')
    }
    await showRequestManage(callbackId, linked, id)
    return
  }

  if (payload.startsWith('b2b:my:delete:confirm:')) {
    const id = payload.slice('b2b:my:delete:confirm:'.length)
    const request = getRequest(id)
    if (request && request.requesterInn === linked.inn) {
      deleteRequest(id)
    }
    await answerCallback(callbackId, 'Заявка удалена.', b2bMenu())
    return
  }

  if (payload.startsWith('b2b:my:delete:')) {
    const id = payload.slice('b2b:my:delete:'.length)
    await answerCallback(
      callbackId,
      'Удалить заявку без возможности восстановления?',
      keyboard([
        [
          { type: 'callback', text: 'да, удалить', payload: `b2b:my:delete:confirm:${id}` },
          { type: 'callback', text: 'отмена', payload: `b2b:my:manage:${id}` },
        ],
      ]),
    )
    return
  }

  if (payload === 'b2b:opps') {
    clearSession(userId)
    await showOpportunities(callbackId, linked)
    return
  }

  if (payload.startsWith('b2b:offer:')) {
    const id = payload.slice('b2b:offer:'.length)
    const request = getRequest(id)
    if (!request) {
      await answerCallback(callbackId, 'Заявка не найдена — возможно, её уже удалили.', b2bMenu())
      return
    }
    if (request.requesterInn === linked.inn) {
      await answerCallback(callbackId, 'Это ваша собственная заявка.', b2bMenu())
      return
    }
    setSession(userId, { flow: 'b2b_offer', step: 'price', requestId: id })
    await answerCallback(
      callbackId,
      `Предложение по заявке «${request.item}».\nУкажите цену в рублях (или «-», если без цены).`,
      keyboard([backRow('b2b:opps')]),
    )
    return
  }

  await answerCallback(callbackId, 'Не распознал кнопку.', b2bMenu())
}

/** Перехватывает свободный текст, если у пользователя открыт b2b-сценарий
 *  (описание заявки, цена, условия предложения). true — сообщение обработано
 *  здесь, false — пусть handleMessage разбирается сам (ИНН, /help и т.п.). */
export async function handleB2BText(update, text) {
  const { userId } = extractSender(update)
  if (!userId) return false
  const session = getSession(userId)
  if (!session) return false

  const linked = getCompanyByUserId(userId)
  if (!linked) {
    clearSession(userId)
    return false
  }

  if (session.flow === 'b2b_new' && session.step === 'text') {
    const trimmed = text.trim()
    if (!trimmed) {
      await sendTo(update, 'Пусто. Опишите текстом, что вам нужно/что вы предлагаете, или нажмите «Назад».')
      return true
    }
    let parsed
    try {
      parsed = await extractRequest(trimmed, session.direction)
    } catch (error) {
      console.error('extractRequest failed:', error.message)
      await sendTo(update, 'Не удалось разобрать текст, попробуйте переформулировать.')
      return true
    }
    setSession(userId, { flow: 'b2b_new', step: 'confirm', direction: session.direction, fields: parsed, rawText: trimmed })
    const lines = [
      'Вот что получилось:',
      '',
      `${session.direction === 'supply' ? 'Предлагаем' : 'Требуется'}: ${parsed.item}`,
      parsed.qty ? `Количество: ${parsed.qty}` : null,
      parsed.deadline ? `Срок: ${parsed.deadline}` : null,
      parsed.budget ? `Бюджет: ${formatMoney(parsed.budget)}` : null,
      parsed.notes ? `Комментарий: ${parsed.notes}` : null,
    ].filter((line) => line !== null)
    await sendTo(
      update,
      lines.join('\n'),
      keyboard([
        [{ type: 'callback', text: 'создать заявку', payload: 'b2b:new:confirm' }],
        [{ type: 'callback', text: 'ввести заново', payload: 'b2b:new:retry' }],
        backRow(),
      ]),
    )
    return true
  }

  if (session.flow === 'b2b_offer' && session.step === 'price') {
    const trimmed = text.trim()
    const price = trimmed === '-' ? null : Number(trimmed.replace(/[^\d.,]/g, '').replace(',', '.'))
    if (trimmed !== '-' && (!Number.isFinite(price) || price <= 0)) {
      await sendTo(update, 'Не понял цену. Пришлите число в рублях или «-», если без цены.')
      return true
    }
    setSession(userId, { ...session, step: 'terms', price })
    await sendTo(update, 'Условия или комментарий (например, срок поставки) — или «-», если нечего добавить.')
    return true
  }

  if (session.flow === 'b2b_offer' && session.step === 'terms') {
    const trimmed = text.trim()
    const terms = trimmed === '-' ? null : trimmed
    const result = addOffer({
      requestId: session.requestId,
      supplierInn: linked.inn,
      supplierName: linked.name,
      price: session.price,
      terms,
    })
    clearSession(userId)
    if (!result) {
      await sendTo(update, 'Заявка не найдена — возможно, её уже удалили.', b2bMenu())
      return true
    }
    await notifyOfferSubmitted(result.request, result.offer)
    await sendTo(update, 'Предложение отправлено.', b2bMenu())
    return true
  }

  return false
}
