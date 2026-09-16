export interface ContactedRequest {
  id: string
  name: string
  need: string
  deadline: string
}

// Список ведётся отдельно для каждой компании (ИНН) — иначе после
// переключения демо-аккаунта было бы видно "вы связывались" чужого аккаунта.
function storageKey(inn: string): string {
  return `mera.contactedRequests.${inn}`
}

export function getContactedRequests(inn: string): ContactedRequest[] {
  try {
    const raw = localStorage.getItem(storageKey(inn))
    if (!raw) return []
    return JSON.parse(raw) as ContactedRequest[]
  } catch {
    return []
  }
}

export function addContactedRequest(inn: string, item: ContactedRequest): ContactedRequest[] {
  const withoutItem = getContactedRequests(inn).filter((r) => r.id !== item.id)
  const next = [item, ...withoutItem]
  try {
    localStorage.setItem(storageKey(inn), JSON.stringify(next))
  } catch {
    // localStorage недоступен (приватный режим / квота) — список просто не сохранится
  }
  return next
}

export function removeContactedRequest(inn: string, id: string): ContactedRequest[] {
  const next = getContactedRequests(inn).filter((r) => r.id !== id)
  try {
    localStorage.setItem(storageKey(inn), JSON.stringify(next))
  } catch {
    // localStorage недоступен
  }
  return next
}
