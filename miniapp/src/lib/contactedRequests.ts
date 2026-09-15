export interface ContactedRequest {
  id: string
  name: string
  need: string
  deadline: string
}

const STORAGE_KEY = 'mera.contactedRequests'

export function getContactedRequests(): ContactedRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as ContactedRequest[]
  } catch {
    return []
  }
}

export function addContactedRequest(item: ContactedRequest): ContactedRequest[] {
  const withoutItem = getContactedRequests().filter((r) => r.id !== item.id)
  const next = [item, ...withoutItem]
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // localStorage недоступен (приватный режим / квота) — список просто не сохранится
  }
  return next
}

export function removeContactedRequest(id: string): ContactedRequest[] {
  const next = getContactedRequests().filter((r) => r.id !== id)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // localStorage недоступен
  }
  return next
}
