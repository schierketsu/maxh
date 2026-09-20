import type {
  B2BOffer,
  B2BRequest,
  B2BRequestDirection,
  B2BRequestStatus,
  B2BRequestWithOffers,
  ParsedB2BRequest,
} from '../types'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error ?? `Запрос не удался (${res.status})`)
  }
  return res.json() as Promise<T>
}

// userId — MAX user_id тестера (см. lib/maxBridge.ts, getMaxUserId), та же
// личная песочница, что и в чат-боте (bot/src/b2bStore.js, testers): без
// него заявка/лента видна как общая, не привязанная ни к какому тестеру.
function userIdParam(userId?: number | null): string {
  return userId != null ? `&userId=${userId}` : ''
}

export async function fetchOpportunities(inn: string, userId?: number | null): Promise<B2BRequest[]> {
  const res = await fetch(`${API_BASE}/api/b2b/opportunities?inn=${inn}${userIdParam(userId)}`)
  const data = await handle<{ opportunities: B2BRequest[] }>(res)
  return data.opportunities
}

export async function fetchMyRequests(inn: string, userId?: number | null): Promise<B2BRequestWithOffers[]> {
  const res = await fetch(`${API_BASE}/api/b2b/my-requests?inn=${inn}${userIdParam(userId)}`)
  const data = await handle<{ requests: B2BRequestWithOffers[] }>(res)
  return data.requests
}

export async function fetchRequest(id: string): Promise<B2BRequest> {
  const res = await fetch(`${API_BASE}/api/b2b/requests/${id}`)
  const data = await handle<{ request: B2BRequest }>(res)
  return data.request
}

export async function parseRequestText(
  text: string,
  direction: B2BRequestDirection,
): Promise<ParsedB2BRequest> {
  const res = await fetch(`${API_BASE}/api/b2b/requests/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, direction }),
  })
  const data = await handle<{ parsed: ParsedB2BRequest }>(res)
  return data.parsed
}

export async function createRequest(
  inn: string,
  fields: ParsedB2BRequest,
  rawText: string | null,
  direction: B2BRequestDirection,
  userId?: number | null,
): Promise<{ request: B2BRequest; notified: number }> {
  const res = await fetch(`${API_BASE}/api/b2b/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inn, ...fields, rawText, direction, userId }),
  })
  return handle(res)
}

export async function setRequestStatus(id: string, status: B2BRequestStatus): Promise<B2BRequest> {
  const res = await fetch(`${API_BASE}/api/b2b/requests/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  const data = await handle<{ request: B2BRequest }>(res)
  return data.request
}

export async function deleteRequest(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/b2b/requests/${id}`, { method: 'DELETE' })
  await handle(res)
}

export async function submitOffer(
  requestId: string,
  inn: string,
  price: number | null,
  terms: string,
): Promise<{ offer: B2BOffer }> {
  const res = await fetch(`${API_BASE}/api/b2b/requests/${requestId}/offers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inn, price, terms }),
  })
  return handle(res)
}
