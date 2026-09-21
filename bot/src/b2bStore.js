import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DEMO_INNS } from './demoBrand.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_PATH = resolve(__dirname, '../data/b2b.json')

// Сид-заявки видны в ленте "Возможности" наравне с настоящими, чтобы сеть
// не выглядела пустой на защите — requesterInn у них нет (это не реальные
// компании), но координаты у них есть, вымышленные, но правдоподобные точки
// в Москве — той же "фейковой, но с координатами" природы, что и
// FAKE_NEARBY_REQUESTS в miniapp/src/pages/MapPage.tsx — иначе у них не было
// бы точки на карте и кнопка "перейти" из рекомендаций для них не работала
// бы. Тематика — кондитерские, кофейни, пекарни, кейтеринг: тот же
// кулинарный мир, что у демо-аккаунтов "ВКУСНЫЙ КЕЙК" и "КОФЕ ТОЧКА", чтобы
// сеть выглядела цельной, а не набором случайных фирм.
const DEMO_REQUESTS = [
  {
    requesterName: 'Кофейня «Дом Помол»',
    direction: 'demand',
    item: 'зерновой кофе (арабика), поставка ежемесячно',
    qty: '40 кг в месяц',
    deadline: null,
    budget: 180_000,
    notes: 'ищем обжарщика на постоянной основе, бюджет указан в месяц',
    lat: 55.7301,
    lon: 37.6389,
  },
  {
    requesterName: 'Кондитерская «Пряный Пряник»',
    direction: 'demand',
    item: 'бумажная упаковка для тортов с логотипом',
    qty: '3000 шт',
    deadline: '2026-10-01',
    budget: null,
    notes: 'нужна плотная коробка, размер под торт до 2 кг',
    lat: 55.7558,
    lon: 37.6176,
  },
  {
    requesterName: 'Кейтеринг «Фуршет и Ко»',
    direction: 'demand',
    item: 'кейтеринг-обслуживание на 50 человек',
    qty: '50 человек',
    deadline: '2026-10-20',
    budget: 250_000,
    notes: 'разовое корпоративное мероприятие, нужна посуда и официанты',
    lat: 55.7412,
    lon: 37.5547,
  },
  {
    requesterName: 'Пекарня «Хлебный Дом»',
    direction: 'supply',
    item: 'ремесленный хлеб на закваске, оптовые поставки',
    qty: 'от 100 булок в неделю',
    deadline: null,
    budget: null,
    notes: 'печём каждое утро, готовы возить по кафе и магазинам',
    lat: 55.7185,
    lon: 37.6009,
  },
  {
    requesterName: 'Кафе «Утренний Круассан»',
    direction: 'demand',
    item: 'сливочное масло для выпечки, 82,5%',
    qty: '80 кг в месяц',
    deadline: '2026-11-05',
    budget: 60_000,
    notes: 'важна стабильная жирность, готовы к дегустации перед контрактом',
    lat: 55.7622,
    lon: 37.6455,
  },
  {
    requesterName: 'Кофейня «Зёрна и Точка»',
    direction: 'supply',
    item: 'растительное молоко (овсяное, миндальное) оптом',
    qty: '200 л в месяц',
    deadline: null,
    budget: null,
    notes: 'своё производство, цена ниже рыночной при заказе от 150 л',
    lat: 55.7069,
    lon: 37.5872,
  },
  {
    requesterName: 'Кондитерская «Три Эклера»',
    direction: 'demand',
    item: 'свежая клубника и малина для десертов',
    qty: '15 кг в неделю',
    deadline: '2026-10-15',
    budget: 45_000,
    notes: 'нужна ягода без вмятин, доставка два раза в неделю',
    lat: 55.7345,
    lon: 37.5701,
  },
  {
    requesterName: 'Ресторан «Тёплый Хлеб»',
    direction: 'demand',
    item: 'аренда кофемашины с сервисным обслуживанием',
    qty: '1 шт',
    deadline: null,
    budget: 35_000,
    notes: 'бюджет в месяц, важно обслуживание и запчасти в комплекте',
    lat: 55.7501,
    lon: 37.6301,
  },
]

function seedData() {
  const now = new Date().toISOString()
  return {
    companies: {},
    // testers: личная песочница каждого MAX-аккаунта — какую компанию (ИНН)
    // он сейчас представляет. Раньше userId/chatId хранились прямо в
    // companies[inn], из-за чего два тестера, выбравших одну и ту же
    // демо-компанию, перезаписывали друг друга (см. миграцию ниже).
    testers: {},
    requests: DEMO_REQUESTS.map((req) => ({
      id: randomUUID(),
      requesterInn: null,
      ownerUserId: null,
      isDemo: true,
      status: 'active',
      rawText: null,
      createdAt: now,
      ...req,
    })),
    offers: [],
  }
}

/** Заявки, сохранённые до появления полей status/direction, получают значения по
 *  умолчанию. Старые данные, где userId/chatId ещё лежали в companies[inn],
 *  переносятся в testers (по одному тестеру на MAX user_id, а не на ИНН) —
 *  и заявки задним числом получают ownerUserId, если владельца можно
 *  однозначно определить по тому, кто сейчас привязан к их ИНН. */
function migrate(loaded) {
  loaded.testers ??= {}
  for (const [inn, company] of Object.entries(loaded.companies ?? {})) {
    if (company.userId != null && loaded.testers[company.userId] === undefined) {
      loaded.testers[company.userId] = {
        inn,
        chatId: company.chatId,
        updatedAt: company.updatedAt ?? new Date().toISOString(),
      }
    }
    delete company.userId
    delete company.chatId
  }
  for (const request of loaded.requests) {
    request.status ??= 'active'
    request.direction ??= 'demand'
    if (request.ownerUserId === undefined) {
      const owner = request.requesterInn
        ? Object.entries(loaded.testers).find(([, t]) => t.inn === request.requesterInn)
        : null
      request.ownerUserId = owner ? Number(owner[0]) : null
    }
    // Сид-заявки, сохранённые до появления координат — задним числом
    // находим совпадение по имени в DEMO_REQUESTS и проставляем lat/lon,
    // иначе на карте у них по-прежнему не будет точки (см. комментарий у
    // DEMO_REQUESTS).
    if (request.isDemo && request.lat === undefined) {
      const seed = DEMO_REQUESTS.find((item) => item.requesterName === request.requesterName)
      request.lat = seed?.lat ?? null
      request.lon = seed?.lon ?? null
    }
  }
  return loaded
}

function load() {
  if (!existsSync(DATA_PATH)) {
    const seeded = seedData()
    mkdirSync(dirname(DATA_PATH), { recursive: true })
    writeFileSync(DATA_PATH, JSON.stringify(seeded, null, 2))
    return seeded
  }
  try {
    return migrate(JSON.parse(readFileSync(DATA_PATH, 'utf8')))
  } catch {
    return seedData()
  }
}

let data = load()

function save() {
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2))
}

function okvedClass(code) {
  return String(code ?? '').split('.')[0]
}

function sharesOkved(a, b) {
  const classesA = new Set((a ?? []).map(okvedClass))
  return (b ?? []).some((code) => classesA.has(okvedClass(code)))
}

export function upsertCompany(inn, fields) {
  const cleaned = String(inn).replace(/\D/g, '')
  const existing = data.companies[cleaned] ?? {}
  data.companies[cleaned] = {
    ...existing,
    ...Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined)),
    inn: cleaned,
    updatedAt: new Date().toISOString(),
  }
  save()
  return data.companies[cleaned]
}

export function getCompany(inn) {
  return data.companies[String(inn).replace(/\D/g, '')] ?? null
}

/** Called by the bot whenever it resolves a company for a chat user — записывает
 *  личную песочницу этого MAX-аккаунта (какой ИНН он сейчас представляет), а
 *  не общий профиль компании — так два тестера могут одновременно быть
 *  "ВКУСНЫЙ КЕЙК", не перезаписывая друг друга. */
export function linkUser(inn, userId, chatId) {
  const cleaned = String(inn).replace(/\D/g, '')
  const numeric = Number(userId)
  if (!Number.isFinite(numeric)) return null
  const existing = data.testers[numeric] ?? {}
  data.testers[numeric] = {
    inn: cleaned,
    chatId: chatId ?? existing.chatId,
    updatedAt: new Date().toISOString(),
  }
  save()
  return data.testers[numeric]
}

/** Обратный поиск: по MAX user_id находим, какую компанию сейчас представляет
 *  этот тестер (своя песочница, см. linkUser), и подмешиваем общий профиль
 *  компании (название/ОКВЭД и т.д.) для отображения. */
export function getCompanyByUserId(userId) {
  const numeric = Number(userId)
  if (!Number.isFinite(numeric)) return null
  const tester = data.testers[numeric]
  if (!tester) return null
  const company = data.companies[tester.inn] ?? { inn: tester.inn }
  return { ...company, inn: tester.inn, userId: numeric, chatId: tester.chatId }
}

/** "Выйти из аккаунта" в чате — убирает личную песочницу этого MAX-аккаунта,
 *  не трогая общий профиль компании (окведы и т.д. остаются в кэше на
 *  случай, если кто-то ещё привяжется к тому же ИНН). */
export function unlinkUserFromCompany(userId) {
  const numeric = Number(userId)
  if (!Number.isFinite(numeric)) return null
  const existing = data.testers[numeric]
  if (!existing) return null
  delete data.testers[numeric]
  save()
  return existing
}

export function createRequest({
  requesterInn,
  requesterName,
  ownerUserId,
  item,
  qty,
  deadline,
  budget,
  notes,
  rawText,
  direction,
}) {
  const request = {
    id: randomUUID(),
    requesterInn,
    requesterName,
    ownerUserId: ownerUserId == null ? null : Number(ownerUserId),
    isDemo: false,
    status: 'active',
    direction: direction === 'supply' ? 'supply' : 'demand',
    item,
    qty: qty ?? null,
    deadline: deadline ?? null,
    budget: budget ?? null,
    notes: notes ?? null,
    rawText,
    createdAt: new Date().toISOString(),
  }
  data.requests.unshift(request)
  save()
  return request
}

export function getRequest(id) {
  return data.requests.find((r) => r.id === id) ?? null
}

export function setRequestStatus(id, status) {
  const request = getRequest(id)
  if (!request) return null
  request.status = status
  save()
  return request
}

export function deleteRequest(id) {
  const index = data.requests.findIndex((r) => r.id === id)
  if (index === -1) return false
  data.requests.splice(index, 1)
  data.offers = data.offers.filter((o) => o.requestId !== id)
  save()
  return true
}

/** Чужие открытые заявки. Своя песочница: помимо общих сид-заявок видны
 *  только заявки БЕЗ владельца (сиды) или созданные тем же тестером под
 *  другой из его демо-личностей (чтобы можно было соло-продемонстрировать
 *  цикл заявка→предложение, переключаясь между двумя демо-компаниями) —
 *  чужие живые заявки других тестеров не протекают в эту ленту. */
export function listOpportunities(excludeInn, myOkved, ownerUserId) {
  const cleaned = String(excludeInn ?? '').replace(/\D/g, '')
  const numericOwner = ownerUserId == null ? null : Number(ownerUserId)
  const open = data.requests.filter(
    (r) => r.requesterInn !== cleaned && r.status === 'active' && (r.ownerUserId == null || r.ownerUserId === numericOwner),
  )
  if (!myOkved?.length) return open
  return [...open].sort((a, b) => {
    const aMatch = sharesOkved(myOkved, getCompany(a.requesterInn)?.okved) ? 1 : 0
    const bMatch = sharesOkved(myOkved, getCompany(b.requesterInn)?.okved) ? 1 : 0
    return bMatch - aMatch
  })
}

/** "Мои заявки" — заявки от этого ИНН, созданные именно этим тестером
 *  (ownerUserId), а не любым, кто когда-либо был привязан к тому же
 *  демо-ИНН. */
export function listMyRequests(inn, ownerUserId) {
  const cleaned = String(inn).replace(/\D/g, '')
  const numericOwner = ownerUserId == null ? null : Number(ownerUserId)
  return data.requests
    .filter((r) => r.requesterInn === cleaned && (r.ownerUserId ?? null) === numericOwner)
    .map((r) => ({ ...r, offers: data.offers.filter((o) => o.requestId === r.id) }))
}

export function addOffer({ requestId, supplierInn, supplierName, price, terms }) {
  const request = getRequest(requestId)
  if (!request) return null
  const offer = {
    id: randomUUID(),
    requestId,
    supplierInn,
    supplierName,
    price: price ?? null,
    terms: terms ?? null,
    createdAt: new Date().toISOString(),
  }
  data.offers.push(offer)
  save()
  return { offer, request }
}

/** Кандидаты на MAX-пуш о новой заявке — компании с известным тестером и
 *  пересекающимся ОКВЭД. Демо-ИНН сюда намеренно не попадают: демо-компанию
 *  в любой момент представляет N разных тестеров в своих песочницах, и
 *  пушить чужому реальному MAX-аккаунту только потому, что он тоже когда-то
 *  выбрал ту же демо-компанию, было бы утечкой между песочницами. Для
 *  реальных ИНН такой неоднозначности нет — один тестер, один ИНН. */
export function findMatchingCompanies(okvedList, excludeInn) {
  const cleaned = String(excludeInn ?? '').replace(/\D/g, '')
  const candidates = []
  for (const [userId, tester] of Object.entries(data.testers)) {
    if (tester.inn === cleaned || DEMO_INNS.includes(tester.inn)) continue
    const company = data.companies[tester.inn]
    if (!company || !sharesOkved(okvedList, company.okved)) continue
    candidates.push({ ...company, userId: Number(userId), chatId: tester.chatId })
  }
  return candidates
}
