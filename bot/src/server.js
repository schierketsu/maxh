import { createServer } from 'node:http'
import {
  addOffer,
  createRequest,
  deleteRequest,
  findMatchingCompanies,
  getCompany,
  getRequest,
  listMyRequests,
  listOpportunities,
  setRequestStatus,
  upsertCompany,
} from './b2bStore.js'
import { lookupCompanyByInn, lookupCompanyDetailsByInn } from './dadata.js'
import { extractRequest } from './llm.js'
import { keyboard, sendMessage } from './max.js'

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

function withCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function sendJson(res, status, body) {
  withCors(res)
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

function readJsonBody(req) {
  return new Promise((resolvePromise, reject) => {
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
      if (raw.length > 1_000_000) {
        reject(new Error('Body too large'))
        req.destroy()
      }
    })
    req.on('end', () => {
      if (!raw) {
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

function offerButton(requestId) {
  const base = process.env.MINIAPP_URL
  if (!base) return undefined
  return keyboard([[{ type: 'link', text: 'Предложить цену', url: `${base.replace(/\/$/, '')}/b2b/offer/${requestId}` }]])
}

async function notifyMatches(request, requesterCompany) {
  const matches = findMatchingCompanies(requesterCompany.okved, request.requesterInn)
  for (const company of matches) {
    try {
      await sendMessage(
        company.userId,
        [
          `🤝 Новая возможность для вашей компании`,
          '',
          `**${request.title}**`,
          request.item,
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

export function startServer(port = process.env.PORT ?? 3001) {
  const server = createServer(async (req, res) => {
    if (req.method === 'OPTIONS') {
      withCors(res)
      res.writeHead(204)
      res.end()
      return
    }

    const url = new URL(req.url, 'http://localhost')
    const { pathname } = url

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
        const { text } = await readJsonBody(req)
        if (!text?.trim()) {
          sendJson(res, 400, { error: 'Нужен text' })
          return
        }
        const parsed = await extractRequest(text.trim())
        sendJson(res, 200, { parsed })
      } catch (error) {
        console.error('Parse request failed:', error.message)
        sendJson(res, 502, { error: 'Не удалось разобрать текст' })
      }
      return
    }

    if (req.method === 'POST' && pathname === '/api/b2b/requests') {
      try {
        const { inn, title, item, qty, region, deadline, budget, notes, rawText } = await readJsonBody(req)
        const cleanedInn = String(inn ?? '').replace(/\D/g, '')
        if (!cleanedInn || !title?.trim() || !item?.trim()) {
          sendJson(res, 400, { error: 'Нужны inn, title и item' })
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
          title: title.trim(),
          item: item.trim(),
          qty: qty ?? null,
          region: region ?? null,
          deadline: deadline ?? null,
          budget: budget ?? null,
          notes: notes ?? null,
          rawText: rawText ?? null,
        })

        const notified = await notifyMatches(request, requesterCompany)
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

        const requesterCompany = request.requesterInn ? getCompany(request.requesterInn) : null
        if (requesterCompany?.userId) {
          try {
            await sendMessage(
              requesterCompany.userId,
              [
                `📩 Новое предложение по заявке «${request.title}»`,
                '',
                `${dadataCompany.name}${result.offer.price ? ` — ${result.offer.price.toLocaleString('ru-RU')} ₽` : ''}`,
                result.offer.terms ?? null,
              ]
                .filter(Boolean)
                .join('\n'),
            )
          } catch (error) {
            console.error('Notify requester failed:', error.message)
          }
        }

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
      const requesterCompany = inn ? getCompany(inn) : null
      const opportunities = listOpportunities(inn, requesterCompany?.okved)
      sendJson(res, 200, { opportunities })
      return
    }

    if (req.method === 'GET' && pathname === '/api/b2b/my-requests') {
      const inn = String(url.searchParams.get('inn') ?? '').replace(/\D/g, '')
      if (!inn) {
        sendJson(res, 400, { error: 'Нужен inn' })
        return
      }
      sendJson(res, 200, { requests: listMyRequests(inn) })
      return
    }

    sendJson(res, 404, { error: 'Not found' })
  })

  server.listen(port, () => {
    console.log(`Company API listening on http://localhost:${port}`)
  })

  return server
}
