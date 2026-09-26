// Уведомления о новой заявке/предложении — общие для обоих путей создания:
// через HTTP API мини-аппа (server.js) и через чат бота напрямую (b2bChat.js).
// Раньше это дублировалось в server.js; вынесено, чтобы текст и логика не
// разъезжались между двумя путями к одному и тому же действию.
import { findMatchingCompanies } from './b2bStore.js'
import { DEMO_INNS, brandName } from './demoBrand.js'
import { keyboard, sendMessage } from './max.js'

// Кнопка ведёт на тот же callback b2b:offer:<id>, что обрабатывает
// b2bChat.js — получатель уже привязан (иначе бы его не нашли через
// findMatchingCompanies), так что предложение целиком оформляется в чате,
// без захода в мини-апп.
function offerButton(requestId) {
  return keyboard([[{ type: 'callback', text: 'предложить цену', payload: `b2b:offer:${requestId}` }]])
}

/** Уведомляет компании с подходящим ОКВЭД и известным MAX user_id о новой заявке. Возвращает число уведомлённых. */
export async function notifyNewRequest(request, requesterCompany) {
  const matches = findMatchingCompanies(requesterCompany.okved, request.requesterInn)
  for (const company of matches) {
    try {
      await sendMessage(
        company.userId,
        [
          `🤝 Новая возможность для вашей компании`,
          '',
          `**${request.item}**`,
          request.budget ? `Бюджет: до ${request.budget.toLocaleString('ru-RU')} ₽` : null,
          request.deadline ? `Срок: до ${request.deadline}` : null,
          '',
          `Подходит по вашему профилю (**${brandName(request.requesterInn, requesterCompany.name)}**).`,
        ]
          .filter(Boolean)
          .join('\n'),
        offerButton(request.id),
      )
    } catch (error) {
      console.error(`Notify ${company.inn} failed:`, error.message)
    }
  }
  return matches.length
}

/** Уведомляет заявителя о новом предложении — строго того тестера, который
 *  создал заявку (request.ownerUserId), а не "того, кто сейчас привязан к
 *  этому ИНН" — из-за песочниц это может быть уже другой человек. */
export async function notifyOfferSubmitted(request, offer) {
  if (!request.ownerUserId) return
  try {
    await sendMessage(
      request.ownerUserId,
      [
        `📩 Новое предложение по заявке «${request.item}»`,
        '',
        `**${brandName(offer.supplierInn, offer.supplierName)}**${offer.price ? ` — ${offer.price.toLocaleString('ru-RU')} ₽` : ''}`,
        offer.terms ?? null,
      ]
        .filter(Boolean)
        .join('\n'),
    )
  } catch (error) {
    console.error('Notify requester failed:', error.message)
  }
}

/** Мини-апп сообщил, что этот MAX-аккаунт вошёл в демо-профиль (или
 *  переключился на другой) — держим чат в том же состоянии, что и мини-апп,
 *  иначе бот продолжит отвечать про прежнюю компанию. */
export async function notifyAccountLinked(userId, current, previous) {
  if (!userId) return
  // brandName подставит витринное имя демо-компании ("КОФЕ ТОЧКА" вместо
  // юридического 'ООО "КОФЕЙНЯ №2"') — то же, что видно в мини-аппе.
  const companyName = current ? brandName(current.inn, current.name) : ''
  const previousName = previous ? brandName(previous.inn, previous.name) : ''
  const text = previousName && previousName !== companyName
    ? `🔄 Аккаунт переключён: **${previousName}** → **${companyName}**

Теперь бот работает с этой компанией.`
    : `✅ Вы вошли как **${companyName}**

Заявки и уведомления в чате теперь относятся к этой компании.`
  try {
    await sendMessage(userId, text)
  } catch (error) {
    console.error('Notify account linked failed:', error.message)
  }
}

/** Те же две демо-компании, что на экране входа в мини-аппе. Payload
 *  inn:<инн> уже обрабатывается в index.js (handleInn), так что вход
 *  делается прямо отсюда, одним нажатием. */
function demoChoiceKeyboard() {
  return keyboard(
    DEMO_INNS.map((inn) => [{ type: 'callback', text: brandName(inn, inn), payload: `inn:${inn}` }]),
  )
}

/** Мини-апп сообщил о выходе — говорим об этом в чате и сразу предлагаем
 *  выбрать компанию заново, чтобы не гонять пользователя обратно. */
export async function notifyAccountUnlinked(userId, previous) {
  if (!userId) return
  const name = previous ? brandName(previous.inn, previous.name) : ''
  try {
    await sendMessage(
      userId,
      `Вы вышли из аккаунта **${name}**, чтобы продолжить выберите компанию в которую хотите войти:`,
      demoChoiceKeyboard(),
    )
  } catch (error) {
    console.error('Notify account unlinked failed:', error.message)
  }
}
