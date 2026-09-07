import { createServer } from 'node:http'
import { lookupCompanyByInn } from './dadata.js'

const CACHE_TTL_MS = 10 * 60 * 1000
const cache = new Map()

async function getCompany(inn) {
  const cached = cache.get(inn)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.company
  const company = await lookupCompanyByInn(inn)
  cache.set(inn, { company, at: Date.now() })
  return company
}

function withCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

function sendJson(res, status, body) {
  withCors(res)
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
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
    const match = url.pathname.match(/^\/api\/company\/(\d{10,12})$/)

    if (req.method === 'GET' && match) {
      const inn = match[1]
      try {
        const company = await getCompany(inn)
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

    sendJson(res, 404, { error: 'Not found' })
  })

  server.listen(port, () => {
    console.log(`Company API listening on http://localhost:${port}`)
  })

  return server
}
