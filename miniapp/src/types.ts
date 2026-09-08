export type CompanyType = 'ООО' | 'ИП' | 'АО'

export type ProgramStatus = 'eligible' | 'almost' | 'need_data' | 'ineligible'

export interface CompanyProfile {
  inn: string
  name: string
  ogrn: string
  region: string
  companyType: CompanyType
  industry: string
  okved: string[]
  companyAgeMonths: number
  employees: number
  revenue: number
  isSme: boolean
  taxRegime: string
  goals: string[]
}

export interface ProgramRequirement {
  id: string
  label: string
  /** Key on CompanyProfile or custom check id */
  check: 'region' | 'is_sme' | 'min_age' | 'okved' | 'max_employees' | 'min_revenue' | 'max_revenue' | 'company_type'
  value?: string | number | string[]
}

export interface SupportProgram {
  id: string
  title: string
  shortDescription: string
  amountMax: number
  deadline: string
  complexity: 'low' | 'medium' | 'high'
  regions: string[] | 'all'
  requirements: ProgramRequirement[]
  documents: string[]
}

export interface MatchedCriterion {
  label: string
  met: boolean
  detail: string
}

export interface MatchedProgram {
  program: SupportProgram
  score: number
  status: ProgramStatus
  amountPotential: number
  met: MatchedCriterion[]
  unmet: MatchedCriterion[]
  nextActions: string[]
}

export interface B2BRequest {
  id: string
  requesterInn: string | null
  requesterName: string
  isDemo: boolean
  title: string
  item: string
  qty: number | null
  region: string | null
  deadline: string | null
  budget: number | null
  notes: string | null
  rawText: string | null
  createdAt: string
}

export interface B2BOffer {
  id: string
  requestId: string
  supplierInn: string
  supplierName: string
  price: number | null
  terms: string | null
  createdAt: string
}

export interface B2BRequestWithOffers extends B2BRequest {
  offers: B2BOffer[]
}
