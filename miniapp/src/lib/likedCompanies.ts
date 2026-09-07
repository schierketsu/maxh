import type { CompanyProfile } from '../types'

const STORAGE_KEY = 'mera.likedCompanies'

export function getLikedCompanies(): CompanyProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as CompanyProfile[]
  } catch {
    return []
  }
}

export function isCompanyLiked(inn: string): boolean {
  return getLikedCompanies().some((c) => c.inn === inn)
}

export function setCompanyLiked(company: CompanyProfile, liked: boolean): CompanyProfile[] {
  const withoutCompany = getLikedCompanies().filter((c) => c.inn !== company.inn)
  const next = liked ? [company, ...withoutCompany] : withoutCompany
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // localStorage unavailable (private mode / quota) — liked list just won't persist
  }
  return next
}
