import { fetch as undiciFetch } from 'undici'

const DADATA_URL = 'https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party'

const TAX_REGIME_LABELS = {
  USN_INCOME: 'УСН (доходы)',
  USN_INCOME_MINUS_EXPENSES: 'УСН (доходы минус расходы)',
  ESHN: 'ЕСХН',
  PATENT: 'Патент',
  OSN: 'ОСН',
}

function loadApiKey() {
  const key = process.env.DADATA_API_KEY
  if (!key) throw new Error('DADATA_API_KEY is not set')
  return key.trim()
}

function monthsSince(raw) {
  if (!raw) return 0
  const date = /^\d+$/.test(String(raw)) ? new Date(Number(raw)) : new Date(raw)
  if (Number.isNaN(date.getTime())) return 0
  const now = new Date()
  return Math.max(
    0,
    (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth()),
  )
}

function companyType(data) {
  if (data.type === 'INDIVIDUAL') return 'ИП'
  const opf = (data.opf?.short ?? data.opf?.full ?? '').toUpperCase()
  if (opf.includes('АО')) return 'АО'
  return 'ООО'
}

function normalize(suggestion) {
  const data = suggestion.data
  const okvedsWithNames = data.okveds ?? []
  const okved = okvedsWithNames.length
    ? okvedsWithNames.map((o) => o.code).filter(Boolean)
    : [data.okved].filter(Boolean)
  const employees = data.employee_count ?? null
  const revenue = data.finance?.income ?? null
  const taxSystem = data.finance?.tax_system

  return {
    inn: data.inn,
    name: suggestion.value,
    ogrn: data.ogrn ?? data.ogrnip ?? '',
    region: data.address?.data?.region_with_type ?? data.address?.value ?? 'Не указан',
    companyType: companyType(data),
    industry: okvedsWithNames[0]?.name ?? 'Не указана',
    okved,
    companyAgeMonths: monthsSince(data.state?.registration_date),
    employees: employees ?? 0,
    revenue: revenue ?? 0,
    isSme: employees == null ? true : employees <= 250,
    taxRegime: (taxSystem && TAX_REGIME_LABELS[taxSystem]) ?? taxSystem ?? 'Не указан',
    goals: [],
  }
}

async function fetchSuggestion(inn) {
  const cleaned = String(inn).replace(/\D/g, '')
  const res = await undiciFetch(DADATA_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Token ${loadApiKey()}`,
    },
    body: JSON.stringify({ query: cleaned }),
  })

  if (!res.ok) {
    const error = new Error(`DaData ${res.status}`)
    error.status = res.status
    throw error
  }

  const json = await res.json()
  return json.suggestions?.[0] ?? null
}

export async function lookupCompanyByInn(inn) {
  const suggestion = await fetchSuggestion(inn)
  if (!suggestion) return null
  return normalize(suggestion)
}

function formatDate(raw) {
  if (!raw) return null
  const date = /^\d+$/.test(String(raw)) ? new Date(Number(raw)) : new Date(raw)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('ru-RU')
}

const STATUS_LABELS = {
  ACTIVE: 'Действующая',
  LIQUIDATING: 'В процессе ликвидации',
  LIQUIDATED: 'Ликвидирована',
  REORGANIZING: 'В процессе реорганизации',
  BANKRUPT: 'Банкротство',
}

/** Максимум подробностей о компании из DaData — для карточки "вся информация" в мини-аппе. */
export async function lookupCompanyDetailsByInn(inn) {
  const suggestion = await fetchSuggestion(inn)
  if (!suggestion) return null
  const data = suggestion.data

  return {
    inn: data.inn,
    kpp: data.kpp ?? null,
    ogrn: data.ogrn ?? data.ogrnip ?? null,
    fullName: data.name?.full_with_opf ?? suggestion.value,
    shortName: data.name?.short_with_opf ?? suggestion.value,
    opf: data.opf?.full ?? null,
    status: (data.state?.status && STATUS_LABELS[data.state.status]) ?? data.state?.status ?? null,
    registrationDate: formatDate(data.state?.registration_date),
    address: data.address?.unrestricted_value ?? data.address?.value ?? null,
    lat: data.address?.data?.geo_lat ? Number(data.address.data.geo_lat) : null,
    lon: data.address?.data?.geo_lon ? Number(data.address.data.geo_lon) : null,
    okved: data.okved ?? null,
    okvedName: data.okveds?.[0]?.name ?? null,
    managerName: data.management?.name ?? null,
    managerPost: data.management?.post ?? null,
    employeeCount: data.employee_count ?? null,
    capital: data.capital?.value ?? null,
    taxSystem: (data.finance?.tax_system && TAX_REGIME_LABELS[data.finance.tax_system]) ?? data.finance?.tax_system ?? null,
    income: data.finance?.income ?? null,
    revenue: data.finance?.revenue ?? null,
    phones: data.phones?.map((p) => p.value ?? p.source) ?? null,
    emails: data.emails?.map((e) => e.value ?? e.source) ?? null,
    sites: data.sites?.map((s) => s.value ?? s.source) ?? null,
  }
}
