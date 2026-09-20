// Многошаговые сценарии в чате (создать заявку, отправить предложение)
// требуют помнить, на каком шаге пользователь — MAX callback/сообщения сами
// по себе состояние не хранят. Простая in-memory карта по MAX user_id
// достаточна для масштаба хакатона (переживёт то же, что и b2bStore —
// т.е. не переживёт передеплой без volume, это не проблема хранения заявок).
const sessions = new Map()

export function getSession(userId) {
  return sessions.get(userId) ?? null
}

export function setSession(userId, session) {
  sessions.set(userId, session)
}

export function clearSession(userId) {
  sessions.delete(userId)
}
