import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_PATH = resolve(__dirname, '../data/b2b.json')

const DEMO_REQUESTS = [
  {
    item: 'зерновой кофе, поставка ежемесячно',
    qty: null,
    deadline: null,
    budget: 180_000,
    notes: 'бюджет указан в месяц',
  },
  {
    item: 'бумажная упаковка с логотипом',
    qty: '3000 шт',
    deadline: '2026-10-01',
    budget: null,
    notes: null,
  },
  {
    item: 'кейтеринг на 50 человек',
    qty: '50 человек',
    deadline: '2026-10-20',
    budget: 250_000,
    notes: 'разовое мероприятие',
  },
]

function seedData() {
  const now = new Date().toISOString()
  return {
    companies: {},
    requests: DEMO_REQUESTS.map((req) => ({
      id: randomUUID(),
      requesterInn: null,
      requesterName: 'Демо-компания',
      isDemo: true,
      status: 'active',
      direction: 'demand',
      rawText: null,
      createdAt: now,
      ...req,
    })),
    offers: [],
  }
}

/** Заявки, сохранённые до появления полей status/direction, получают значения по умолчанию. */
function migrate(loaded) {
  for (const request of loaded.requests) {
    request.status ??= 'active'
    request.direction ??= 'demand'
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

/** Called by the bot whenever it resolves a company for a chat user — this is how we learn userId↔ИНН. */
export function linkUser(inn, userId, chatId) {
  return upsertCompany(inn, { userId, chatId })
}

export function createRequest({ requesterInn, requesterName, item, qty, deadline, budget, notes, rawText, direction }) {
  const request = {
    id: randomUUID(),
    requesterInn,
    requesterName,
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

export function listOpportunities(excludeInn, myOkved) {
  const cleaned = String(excludeInn ?? '').replace(/\D/g, '')
  const open = data.requests.filter((r) => r.requesterInn !== cleaned && r.status === 'active')
  if (!myOkved?.length) return open
  return [...open].sort((a, b) => {
    const aMatch = sharesOkved(myOkved, getCompany(a.requesterInn)?.okved) ? 1 : 0
    const bMatch = sharesOkved(myOkved, getCompany(b.requesterInn)?.okved) ? 1 : 0
    return bMatch - aMatch
  })
}

export function listMyRequests(inn) {
  const cleaned = String(inn).replace(/\D/g, '')
  return data.requests
    .filter((r) => r.requesterInn === cleaned)
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

/** Companies with a known MAX userId whose ОКВЭД overlaps the request's requester — candidates to notify. */
export function findMatchingCompanies(okvedList, excludeInn) {
  const cleaned = String(excludeInn ?? '').replace(/\D/g, '')
  return Object.values(data.companies).filter(
    (c) => c.inn !== cleaned && c.userId && sharesOkved(okvedList, c.okved),
  )
}
