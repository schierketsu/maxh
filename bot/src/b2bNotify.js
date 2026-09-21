// Уведомления о новой заявке/предложении — общие для обоих путей создания:
// через HTTP API мини-аппа (server.js) и через чат бота напрямую (b2bChat.js).
// Раньше это дублировалось в server.js; вынесено, чтобы текст и логика не
// разъезжались между двумя путями к одному и тому же действию.
import { findMatchingCompanies } from './b2bStore.js'
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
          `Подходит по вашему профилю (${requesterCompany.name}).`,
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
        `${offer.supplierName}${offer.price ? ` — ${offer.price.toLocaleString('ru-RU')} ₽` : ''}`,
        offer.terms ?? null,
      ]
        .filter(Boolean)
        .join('\n'),
    )
  } catch (error) {
    console.error('Notify requester failed:', error.message)
  }
}
