/**
 * Бэкенд для заявок/предложений всегда берёт настоящее имя компании из
 * DaData заново (см. bot/src/server.js) — так и должно быть для реальных
 * пользователей, но для двух демо-аккаунтов из-за этого на карте, в своих
 * заявках и в списке предложений вместо "КОФЕ ТОЧКА"/"ВКУСНЫЙ КЕЙК"
 * выскакивало официальное юрлицо ("ООО «КОФЕЙНЯ №2»" и т.п.). Здесь —
 * единая подмена отображаемого имени по ИНН, применяется в UI везде, где
 * показывается название компании, полученное не из ProfilePage.
 */
const DEMO_BRAND_NAMES: Record<string, string> = {
  '7724351831': 'ВКУСНЫЙ КЕЙК',
  '7717762862': 'КОФЕ ТОЧКА',
}

export function brandCompanyName(inn: string | null | undefined, fallbackName: string): string {
  if (!inn) return fallbackName
  return DEMO_BRAND_NAMES[inn] ?? fallbackName
}
