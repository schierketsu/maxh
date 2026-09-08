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
