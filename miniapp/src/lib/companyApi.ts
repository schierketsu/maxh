import type { CompanyDetails, CompanyProfile } from '../types'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

export async function fetchCompanyByInn(inn: string): Promise<CompanyProfile | null> {
  const res = await fetch(`${API_BASE}/api/company/${inn}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error('Не удалось получить данные компании')
  const json = await res.json()
  return json.company as CompanyProfile
}

export async function fetchCompanyDetails(inn: string): Promise<CompanyDetails | null> {
  const res = await fetch(`${API_BASE}/api/company/${inn}/details`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error('Не удалось получить данные компании')
  const json = await res.json()
  return json.details as CompanyDetails
}

/** Компания, уже привязанная к этому MAX user_id (написал боту или раньше
 *  подтвердил свой ИНН в мини-аппе) — для автораспознавания через Bridge. */
export async function fetchCompanyByMaxUserId(userId: number): Promise<CompanyProfile | null> {
  const res = await fetch(`${API_BASE}/api/company/by-user/${userId}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error('Не удалось получить данные компании')
  const json = await res.json()
  return json.company as CompanyProfile
}

/** Запоминает связку ИНН↔MAX user_id на бэкенде — та же linkUser, что
 *  использует бот при разборе ИНН в чате. */
export async function linkMaxUserToCompany(inn: string, userId: number): Promise<void> {
  await fetch(`${API_BASE}/api/company/${inn}/link-user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  })
}
