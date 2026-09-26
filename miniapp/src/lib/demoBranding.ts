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

/** Рейтинг демо-компании — те же значения, что в профиле (ProfilePage).
 *  Для остальных компаний рейтинга нет, и блок со звездой не показывается. */
const DEMO_RATINGS: Record<string, number> = {
  '7724351831': 4.7,
  '7717762862': 3.8,
}

/** Рейтинги витринных компаний из сид-заявок (bot/src/b2bStore.js) — у них
 *  нет ИНН, поэтому ключ здесь название. Значения вымышленные, как и сами
 *  компании: сеть на карте должна выглядеть живой. */
const SEED_RATINGS: Record<string, number> = {
  'Кофейня «Дом Помол»': 4.8,
  'Кондитерская «Пряный Пряник»': 4.6,
  '«Фуршет и Ко»': 4.4,
  'Пекарня «Хлебный Дом»': 4.9,
  'Кафе «Утренний Круассан»': 4.3,
  'Кофейня «Зёрна и Точка»': 4.7,
  'Кондитерская «Три Эклера»': 4.5,
  'Ресторан «Тёплый Хлеб»': 4.2,
  'ООО «Пекарня №1»': 4.6,
  'ООО «Молочный Дом»': 4.4,
  'ООО «Фреш Маркет»': 4.1,
  'ИП Соколова': 4.7,
  'ИП Кузьмин — кейтеринг': 4.3,
}

/** Рейтинг компании: сперва демо-аккаунты по ИНН, затем витринные компании
 *  по названию, иначе — устойчивое значение из имени в диапазоне 4,0–4,9,
 *  чтобы у карточки на карте всегда была оценка и она не прыгала. */
export function demoRating(inn: string | null | undefined, name?: string | null): number | null {
  if (inn && DEMO_RATINGS[inn] != null) return DEMO_RATINGS[inn]
  if (!name) return null
  if (SEED_RATINGS[name] != null) return SEED_RATINGS[name]
  let sum = 0
  for (let i = 0; i < name.length; i += 1) sum += name.charCodeAt(i)
  return 4 + (sum % 10) / 10
}

/** Род занятий — короткая подпись рядом с предметом заявки. */
const DEMO_KINDS: Record<string, string> = {
  '7724351831': 'кондитерская',
  '7717762862': 'кофейня',
}

/** Компании, у которых род занятий не стоит первым словом названия. */
const SEED_KINDS: Record<string, string> = {
  '«Фуршет и Ко»': 'кейтеринг',
}

/** Род занятий: у демо-аккаунтов задан явно, у витринных компаний он и так
 *  стоит первым словом названия ("Кофейня «Дом Помол»"). */
export function demoKind(inn: string | null | undefined, name?: string | null): string | null {
  if (inn && DEMO_KINDS[inn]) return DEMO_KINDS[inn]
  if (name && SEED_KINDS[name]) return SEED_KINDS[name]
  const first = (name ?? '').trim().split(/[\s«]/)[0]
  if (!first) return null
  const known = ['кофейня', 'кондитерская', 'пекарня', 'кафе', 'ресторан', 'кейтеринг']
  const lower = first.toLowerCase()
  return known.includes(lower) ? lower : null
}

/** Цвет кружка с первой буквой — тот же набор, что у аватаров в отзывах;
 *  выбирается детерминированно по названию, чтобы не прыгал между рендерами. */
const AVATAR_COLORS = [
  'var(--palette-blue)',
  'var(--palette-lime)',
  'var(--palette-purple)',
  'var(--palette-red)',
  'var(--palette-pink)',
]

export function avatarColor(seed: string): string {
  let sum = 0
  for (let i = 0; i < seed.length; i += 1) sum += seed.charCodeAt(i)
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]
}
