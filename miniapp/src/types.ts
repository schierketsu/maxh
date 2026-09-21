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

export type B2BRequestStatus = 'active' | 'inactive'
export type B2BRequestDirection = 'demand' | 'supply'

export interface B2BRequest {
  id: string
  requesterInn: string | null
  requesterName: string
  isDemo: boolean
  status: B2BRequestStatus
  direction: B2BRequestDirection
  item: string
  qty: string | null
  deadline: string | null
  budget: number | null
  notes: string | null
  rawText: string | null
  createdAt: string
  /** Только у сид-заявок (isDemo) — вымышленные, но реальные координаты в
   *  Москве, чтобы у них тоже была точка на карте (bot/src/b2bStore.js). */
  lat?: number | null
  lon?: number | null
}

export interface ParsedB2BRequest {
  item: string
  qty: string | null
  deadline: string | null
  budget: number | null
  notes: string | null
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

export interface CompanyDetails {
  inn: string
  kpp: string | null
  ogrn: string | null
  fullName: string
  shortName: string
  opf: string | null
  status: string | null
  registrationDate: string | null
  address: string | null
  lat: number | null
  lon: number | null
  okved: string | null
  okvedName: string | null
  managerName: string | null
  managerPost: string | null
  employeeCount: number | null
  capital: number | null
  taxSystem: string | null
  income: number | null
  revenue: number | null
  phones: string[] | null
  emails: string[] | null
  sites: string[] | null
}
