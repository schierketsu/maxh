import type { B2BOffer, B2BRequest, B2BRequestWithOffers } from '../types'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error ?? `Запрос не удался (${res.status})`)
  }
  return res.json() as Promise<T>
}

export async function fetchOpportunities(inn: string): Promise<B2BRequest[]> {
  const res = await fetch(`${API_BASE}/api/b2b/opportunities?inn=${inn}`)
  const data = await handle<{ opportunities: B2BRequest[] }>(res)
  return data.opportunities
}

export async function fetchMyRequests(inn: string): Promise<B2BRequestWithOffers[]> {
  const res = await fetch(`${API_BASE}/api/b2b/my-requests?inn=${inn}`)
  const data = await handle<{ requests: B2BRequestWithOffers[] }>(res)
  return data.requests
}

export async function fetchRequest(id: string): Promise<B2BRequest> {
  const res = await fetch(`${API_BASE}/api/b2b/requests/${id}`)
  const data = await handle<{ request: B2BRequest }>(res)
  return data.request
}

export async function createRequest(
  inn: string,
  text: string,
): Promise<{ request: B2BRequest; notified: number }> {
  const res = await fetch(`${API_BASE}/api/b2b/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inn, text }),
  })
  return handle(res)
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
