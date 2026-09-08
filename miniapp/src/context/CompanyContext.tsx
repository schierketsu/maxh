import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { CompanyProfile, MatchedProgram } from '../types'
import { matchPrograms } from '../lib/matching'

interface CompanyContextValue {
  company: CompanyProfile | null
  matches: MatchedProgram[]
  /** persist=false keeps the company in memory only — gone on next page load (used by the Госуслуги stub). */
  setCompany: (company: CompanyProfile | null, persist?: boolean) => void
  clearCompany: () => void
}

const CompanyContext = createContext<CompanyContextValue | null>(null)

const STORAGE_KEY = 'mera.company'

function loadStored(): CompanyProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as CompanyProfile
  } catch {
    return null
  }
}

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [company, setCompanyState] = useState<CompanyProfile | null>(() => loadStored())

  const setCompany = useCallback((next: CompanyProfile | null, persist = true) => {
    setCompanyState(next)
    if (!persist) return
    if (next) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  const clearCompany = useCallback(() => setCompany(null), [setCompany])

  const matches = useMemo(
    () => (company ? matchPrograms(company) : []),
    [company],
  )

  const value = useMemo(
    () => ({ company, matches, setCompany, clearCompany }),
    [company, matches, setCompany, clearCompany],
  )

  return (
    <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>
  )
}

export function useCompany() {
  const ctx = useContext(CompanyContext)
  if (!ctx) throw new Error('useCompany must be used within CompanyProvider')
  return ctx
}
