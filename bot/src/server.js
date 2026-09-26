import { createServer } from 'node:http'
import {
  addBenefitApplication,
  addOffer,
  createRequest,
  deleteRequest,
  getCompany,
  getCompanyByUserId,
  getRequest,
  linkUser,
  listBenefitApplications,
  listMyRequests,
  listOpportunities,
  removeBenefitApplication,
  setRequestStatus,
  unlinkUserFromCompany,
  upsertCompany,
} from './b2bStore.js'
import {
  notifyAccountLinked,
  notifyBenefitApplied,
  notifyAccountUnlinked,
  notifyNewRequest,
  notifyOfferSubmitted,
} from './b2bNotify.js'
import { lookupCompanyByInn, lookupCompanyDetailsByInn } from './dadata.js'
import { extractRequest } from './llm.js'
import { recommendOpportunities } from './recommend.js'

const CACHE_TTL_MS = 10 * 60 * 1000
const cache = new Map()
const detailsCache = new Map()

async function getDadataCompany(inn) {
  const cached = cache.get(inn)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.company
  const company = await lookupCompanyByInn(inn)
  cache.set(inn, { company, at: Date.now() })
  return company
}

async function getDadataCompanyDetails(inn) {
  const cached = detailsCache.get(inn)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.details
  const details = await lookupCompanyDetailsByInn(inn)
  detailsCache.set(inn, { details, at: Date.now() })
  return details
}

// Источники, которым разрешено обращаться к API. Прод, где мини-апп и API
// живут на одном домене, в CORS вообще не нуждается — список нужен для
// разработки и для проверки, когда мини-апп поднимают локально, а данные
// берут с сервера. Дополнить можно переменной ALLOWED_ORIGINS
// (через запятую), не трогая код.
const DEFAULT_ORIGINS = [
  'https://hackmax.ru',
  'https://www.hackmax.ru',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]

const ALLOWED_ORIGINS = new Set(
  [...DEFAULT_ORIGINS, ...String(process.env.ALLOWED_ORIGINS ?? '').split(',')]
    .map((origin) => origin.trim())
    .filter(Boolean),
)

// Перечислены все методы, которые реально обслуживает API: без PATCH и
// DELETE браузер отклонял бы preflight на смене статуса заявки и на её
// отзыве.
const ALLOWED_METHODS = 'GET, POST, PATCH, DELETE, OPTIONS'

/** Проставляет CORS-заголовки один раз на запрос. Origin не подставляется
 *  звёздочкой, а возвращается ровно тот, что пришёл, — и только если он в
 *  списке; иначе заголовка нет вовсе и браузер сам заблокирует ответ.
 *  Vary: Origin обязателен, раз значение зависит от запроса. */
function applyCors(req, res) {
  const origin = req.headers.origin
  res.setHeader('Vary', 'Origin')
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  }
  res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  // Сутки — браузер не будет слать preflight перед каждым DELETE.
  res.setHeader('Access-Control-Max-Age', '86400')
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

/** Тело собирается буферами и декодируется целиком в самом конце.
 *  Раньше чанки склеивались как строки (`raw += chunk`), то есть каждый
 *  декодировался отдельно: символ кириллицы, разрезанный на границе чанков,
 *  превращался в два "ромбика". На коротких телах это не проявлялось, на
 *  длинном описании заявки — ломало текст. */
function readJsonBody(req) {
  return new Promise((resolvePromise, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > 1_000_000) {
        reject(new Error('Body too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      if (chunks.length === 0) {
        resolvePromise({})
        return
      }
      const raw = Buffer.concat(chunks).toString('utf8')
      if (!raw.trim()) {
        resolvePromise({})
        return
      }
      try {
        resolvePromise(JSON.parse(raw))
      } catch {
        reject(new Error('Invalid JSON body'))
      }
    })
    req.on('error', reject)
  })
}

export function startServer(port = process.env.PORT ?? 3001) {
  const server = createServer(async (req, res) => {
    applyCors(req, res)

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    const url = new URL(req.url, 'http://localhost')
    const { pathname } = url

    // Автораспознавание в мини-аппе через MAX Bridge: если этот MAX user_id
    // уже был привязан к ИНН (написал боту или один раз подтвердил себя в
    // мини-аппе), возвращаем его компанию без повторного ввода ИНН.
    const byUserMatch = pathname.match(/^\/api\/company\/by-user\/(\d+)$/)
    if (req.method === 'GET' && byUserMatch) {
      const linked = getCompanyByUserId(byUserMatch[1])
      if (!linked) {
        sendJson(res, 404, { error: 'Компания не найдена' })
        return
      }
      try {
        const company = await getDadataCompany(linked.inn)
        if (!company) {
          sendJson(res, 404, { error: 'Компания не найдена' })
          return
        }
        sendJson(res, 200, { company })
      } catch (error) {
        console.error('Company lookup failed:', error.message)
        sendJson(res, 502, { error: 'Не удалось получить данные компании' })
      }
      return
    }

    const companyMatch = pathname.match(/^\/api\/company\/(\d{10,12})$/)
    if (req.method === 'GET' && companyMatch) {
      const inn = companyMatch[1]
      try {
        const company = await getDadataCompany(inn)
        if (!company) {
          sendJson(res, 404, { error: 'Компания не найдена' })
          return
        }
        upsertCompany(inn, {
          name: company.name,
          region: company.region,
          industry: company.industry,
          okved: company.okved,
        })
        sendJson(res, 200, { company })
      } catch (error) {
        console.error('Company lookup failed:', error.message)
        sendJson(res, 502, { error: 'Не удалось получить данные компании' })
      }
      return
    }

    // Мини-апп зовёт это сразу после того, как пользователь сам подтвердил
    // свой ИНН (InnGate) и мы знаем его MAX user_id через Bridge — чтобы
    // при следующем открытии мини-аппа (или сообщении боту) его узнавали
    // без повторного ввода. Тот же linkUser, что использует чат-бот.
    const linkUserMatch = pathname.match(/^\/api\/company\/(\d{10,12})\/link-user$/)
    if (req.method === 'POST' && linkUserMatch) {
      const inn = linkUserMatch[1]
      try {
        const { userId } = await readJsonBody(req)
        const numericUserId = Number(userId)
        if (!Number.isFinite(numericUserId)) {
          sendJson(res, 400, { error: 'Нужен userId' })
          return
        }
        // До привязки — чтобы понять, вход это или переключение аккаунта.
        const previous = getCompanyByUserId(numericUserId)
        linkUser(inn, numericUserId, undefined)
        const dadataCompany = await getDadataCompany(inn).catch(() => null)
        // Best-effort: ответ мини-аппу не ждёт доставки сообщения в чат.
        notifyAccountLinked(
          numericUserId,
          { inn, name: dadataCompany?.name ?? inn },
          previous ? { inn: previous.inn, name: previous.name } : null,
        )
        sendJson(res, 200, { ok: true })
      } catch (error) {
        console.error('Link user failed:', error.message)
        sendJson(res, 502, { error: 'Не удалось привязать пользователя' })
      }
      return
    }

    // "Выйти" в мини-аппе: снимаем привязку MAX-аккаунта к компании, иначе
    // мини-апп при следующем открытии сам залогинится обратно через
    // /api/company/by-user/, а бот продолжит отвечать про прежнюю компанию.
    if (req.method === 'POST' && pathname === '/api/company/unlink-user') {
      try {
        const { userId } = await readJsonBody(req)
        const numericUserId = Number(userId)
        if (!Number.isFinite(numericUserId)) {
          sendJson(res, 400, { error: 'Нужен userId' })
          return
        }
        const previous = getCompanyByUserId(numericUserId)
        unlinkUserFromCompany(numericUserId)
        notifyAccountUnlinked(numericUserId, previous ? { inn: previous.inn, name: previous.name } : null)
        sendJson(res, 200, { ok: true })
      } catch (error) {
        console.error('Unlink user failed:', error.message)
        sendJson(res, 502, { error: 'Не удалось выйти из аккаунта' })
      }
      return
    }

    // --- Заявки на меры господдержки ------------------------------------
    // Лежат на бэкенде, а не в localStorage: иначе бот не знает о поданных
    // заявках и сценарий обрывается на границе мини-аппа.
    if (req.method === 'GET' && pathname === '/api/benefits/applications') {
      const inn = String(url.searchParams.get('inn') ?? '').replace(/\D/g, '')
      const userId = url.searchParams.get('userId')
      if (!inn) {
        sendJson(res, 400, { error: 'Нужен inn' })
        return
      }
      sendJson(res, 200, { applications: listBenefitApplications(inn, userId) })
      return
    }

    if (req.method === 'POST' && pathname === '/api/benefits/applications') {
      try {
        const { inn, userId, benefitId, title } = await readJsonBody(req)
        const cleanedInn = String(inn ?? '').replace(/\D/g, '')
        if (!cleanedInn || !benefitId) {
          sendJson(res, 400, { error: 'Нужны inn и benefitId' })
          return
        }
        const application = addBenefitApplication({
          inn: cleanedInn,
          ownerUserId: Number.isFinite(Number(userId)) ? Number(userId) : null,
          benefitId,
          title: title ?? benefitId,
        })
        // Best-effort: ответ мини-аппу не ждёт доставки сообщения в чат.
        notifyBenefitApplied(application.ownerUserId, application.title)
        sendJson(res, 201, { application })
      } catch (error) {
        console.error('Create benefit application failed:', error.message)
        sendJson(res, 502, { error: 'Не удалось подать заявку' })
      }
      return
    }

    const benefitAppMatch = pathname.match(/^\/api\/benefits\/applications\/([^/]+)$/)
    if (req.method === 'DELETE' && benefitAppMatch) {
      const inn = String(url.searchParams.get('inn') ?? '').replace(/\D/g, '')
      const userId = url.searchParams.get('userId')
      if (!inn) {
        sendJson(res, 400, { error: 'Нужен inn' })
        return
      }
      const removed = removeBenefitApplication({
        inn,
        ownerUserId: Number.isFinite(Number(userId)) ? Number(userId) : null,
        benefitId: benefitAppMatch[1],
      })
      if (!removed) {
        sendJson(res, 404, { error: 'Заявка не найдена' })
        return
      }
      sendJson(res, 200, { ok: true })
      return
    }

    const detailsMatch = pathname.match(/^\/api\/company\/(\d{10,12})\/details$/)
    if (req.method === 'GET' && detailsMatch) {
      const inn = detailsMatch[1]
      try {
        const details = await getDadataCompanyDetails(inn)
        if (!details) {
          sendJson(res, 404, { error: 'Компания не найдена' })
          return
        }
        sendJson(res, 200, { details })
      } catch (error) {
        console.error('Company details lookup failed:', error.message)
        sendJson(res, 502, { error: 'Не удалось получить данные компании' })
      }
      return
    }

    if (req.method === 'POST' && pathname === '/api/b2b/requests/parse') {
      try {
        const { text, direction } = await readJsonBody(req)
        if (!text?.trim()) {
          sendJson(res, 400, { error: 'Нужен text' })
          return
        }
        const parsed = await extractRequest(text.trim(), direction === 'supply' ? 'supply' : 'demand')
        sendJson(res, 200, { parsed })
      } catch (error) {
        console.error('Parse request failed:', error.message)
        sendJson(res, 502, { error: 'Не удалось разобрать текст' })
      }
      return
    }

    if (req.method === 'POST' && pathname === '/api/b2b/requests') {
      try {
        const { inn, item, qty, deadline, budget, notes, rawText, direction, userId } = await readJsonBody(req)
        const cleanedInn = String(inn ?? '').replace(/\D/g, '')
        if (!cleanedInn || !item?.trim()) {
          sendJson(res, 400, { error: 'Нужны inn и item' })
          return
        }

        const dadataCompany = await getDadataCompany(cleanedInn)
        if (!dadataCompany) {
          sendJson(res, 404, { error: 'Компания не найдена' })
          return
        }
        const requesterCompany = upsertCompany(cleanedInn, {
          name: dadataCompany.name,
          region: dadataCompany.region,
          industry: dadataCompany.industry,
          okved: dadataCompany.okved,
        })

        const request = createRequest({
          requesterInn: cleanedInn,
          requesterName: requesterCompany.name,
          ownerUserId: Number.isFinite(Number(userId)) ? Number(userId) : null,
          item: item.trim(),
          qty: qty ?? null,
          deadline: deadline ?? null,
          budget: budget ?? null,
          notes: notes ?? null,
          rawText: rawText ?? null,
          direction,
        })

        const notified = await notifyNewRequest(request, requesterCompany)
        sendJson(res, 201, { request, notified })
      } catch (error) {
        console.error('Create request failed:', error.message)
        sendJson(res, 502, { error: 'Не удалось создать заявку' })
      }
      return
    }

    const requestStatusMatch = pathname.match(/^\/api\/b2b\/requests\/([^/]+)$/)
    if (req.method === 'PATCH' && requestStatusMatch) {
      try {
        const { status } = await readJsonBody(req)
        if (status !== 'active' && status !== 'inactive') {
          sendJson(res, 400, { error: 'status должен быть active или inactive' })
          return
        }
        const request = setRequestStatus(requestStatusMatch[1], status)
        if (!request) {
          sendJson(res, 404, { error: 'Заявка не найдена' })
          return
        }
        sendJson(res, 200, { request })
      } catch (error) {
        console.error('Update request status failed:', error.message)
        sendJson(res, 502, { error: 'Не удалось обновить заявку' })
      }
      return
    }
    if (req.method === 'DELETE' && requestStatusMatch) {
      const ok = deleteRequest(requestStatusMatch[1])
      if (!ok) {
        sendJson(res, 404, { error: 'Заявка не найдена' })
        return
      }
      sendJson(res, 200, { ok: true })
      return
    }

    const offerMatch = pathname.match(/^\/api\/b2b\/requests\/([^/]+)\/offers$/)
    if (req.method === 'POST' && offerMatch) {
      const requestId = offerMatch[1]
      try {
        const { inn, price, terms } = await readJsonBody(req)
        const cleanedInn = String(inn ?? '').replace(/\D/g, '')
        const request = getRequest(requestId)
        if (!request) {
          sendJson(res, 404, { error: 'Заявка не найдена' })
          return
        }
        if (!cleanedInn) {
          sendJson(res, 400, { error: 'Нужен inn' })
          return
        }

        const dadataCompany = await getDadataCompany(cleanedInn)
        if (!dadataCompany) {
          sendJson(res, 404, { error: 'Компания не найдена' })
          return
        }
        upsertCompany(cleanedInn, {
          name: dadataCompany.name,
          region: dadataCompany.region,
          industry: dadataCompany.industry,
          okved: dadataCompany.okved,
        })

        const result = addOffer({
          requestId,
          supplierInn: cleanedInn,
          supplierName: dadataCompany.name,
          price: price ?? null,
          terms: terms ?? null,
        })

        await notifyOfferSubmitted(result.request, result.offer)

        sendJson(res, 201, { offer: result.offer })
      } catch (error) {
        console.error('Create offer failed:', error.message)
        sendJson(res, 502, { error: 'Не удалось отправить предложение' })
      }
      return
    }

    const requestMatch = pathname.match(/^\/api\/b2b\/requests\/([^/]+)$/)
    if (req.method === 'GET' && requestMatch) {
      const request = getRequest(requestMatch[1])
      if (!request) {
        sendJson(res, 404, { error: 'Заявка не найдена' })
        return
      }
      sendJson(res, 200, { request })
      return
    }

    if (req.method === 'GET' && pathname === '/api/b2b/opportunities') {
      const inn = String(url.searchParams.get('inn') ?? '').replace(/\D/g, '')
      const userId = url.searchParams.get('userId')
      const requesterCompany = inn ? getCompany(inn) : null
      const opportunities = listOpportunities(inn, requesterCompany?.okved, userId)
      sendJson(res, 200, { opportunities })
      return
    }

    if (req.method === 'GET' && pathname === '/api/b2b/my-requests') {
      const inn = String(url.searchParams.get('inn') ?? '').replace(/\D/g, '')
      const userId = url.searchParams.get('userId')
      if (!inn) {
        sendJson(res, 400, { error: 'Нужен inn' })
        return
      }
      sendJson(res, 200, { requests: listMyRequests(inn, userId) })
      return
    }

    if (req.method === 'GET' && pathname === '/api/b2b/recommendations') {
      const inn = String(url.searchParams.get('inn') ?? '').replace(/\D/g, '')
      const userId = url.searchParams.get('userId')
      const linked = inn ? getCompany(inn) : null
      if (!linked) {
        sendJson(res, 400, { error: 'Нужен inn' })
        return
      }
      try {
        const recommendations = await recommendOpportunities(linked, userId)
        sendJson(res, 200, { recommendations })
      } catch (error) {
        console.error('Recommendations failed:', error.message)
        sendJson(res, 502, { error: 'Не удалось получить рекомендации' })
      }
      return
    }

    sendJson(res, 404, { error: 'Not found' })
  })

  server.listen(port, () => {
    console.log(`Company API listening on http://localhost:${port}`)
  })

  return server
}
