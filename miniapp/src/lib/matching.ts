import type {
  CompanyProfile,
  MatchedCriterion,
  MatchedProgram,
  ProgramRequirement,
  ProgramStatus,
  SupportProgram,
} from '../types'
import { supportPrograms } from '../data/programs'

function checkRequirement(
  company: CompanyProfile,
  req: ProgramRequirement,
): MatchedCriterion {
  switch (req.check) {
    case 'region': {
      const allowed = (req.value as string[]) ?? []
      const met = allowed.includes(company.region)
      return {
        label: req.label,
        met,
        detail: met
          ? `Регион: ${company.region}`
          : `Нужен регион: ${allowed.join(', ')}; сейчас — ${company.region}`,
      }
    }
    case 'is_sme': {
      return {
        label: req.label,
        met: company.isSme,
        detail: company.isSme ? 'Компания в реестре МСП' : 'Нет статуса МСП',
      }
    }
    case 'min_age': {
      const min = Number(req.value ?? 0)
      const met = company.companyAgeMonths >= min
      return {
        label: req.label,
        met,
        detail: met
          ? `${company.companyAgeMonths} мес. (≥ ${min})`
          : `Сейчас ${company.companyAgeMonths} мес., нужно ≥ ${min}`,
      }
    }
    case 'okved': {
      const needed = (req.value as string[]) ?? []
      const met = company.okved.some((code) => needed.includes(code))
      return {
        label: req.label,
        met,
        detail: met
          ? `ОКВЭД: ${company.okved.join(', ')}`
          : `Нужен один из: ${needed.join(', ')}`,
      }
    }
    case 'max_employees': {
      const max = Number(req.value ?? 0)
      const met = company.employees <= max
      return {
        label: req.label,
        met,
        detail: met
          ? `${company.employees} чел. (≤ ${max})`
          : `${company.employees} чел., лимит ${max}`,
      }
    }
    case 'min_revenue': {
      const min = Number(req.value ?? 0)
      const met = company.revenue >= min
      return {
        label: req.label,
        met,
        detail: met
          ? `Выручка ${(company.revenue / 1_000_000).toFixed(1)} млн ₽`
          : `Нужна выручка от ${(min / 1_000_000).toFixed(1)} млн ₽`,
      }
    }
    case 'max_revenue': {
      const max = Number(req.value ?? 0)
      const met = company.revenue <= max
      return {
        label: req.label,
        met,
        detail: met
          ? `Выручка в допустимом диапазоне`
          : `Выручка превышает ${(max / 1_000_000).toFixed(0)} млн ₽`,
      }
    }
    case 'company_type': {
      const allowed = (req.value as string[]) ?? []
      const met = allowed.includes(company.companyType)
      return {
        label: req.label,
        met,
        detail: met
          ? `Форма: ${company.companyType}`
          : `Нужна форма: ${allowed.join(' / ')}; сейчас — ${company.companyType}`,
      }
    }
    default:
      return { label: req.label, met: false, detail: 'Не удалось проверить' }
  }
}

function scoreToStatus(score: number, unmetCount: number): ProgramStatus {
  if (score >= 85 && unmetCount === 0) return 'eligible'
  if (score >= 60) return 'almost'
  if (score >= 40) return 'need_data'
  return 'ineligible'
}

function matchOne(company: CompanyProfile, program: SupportProgram): MatchedProgram {
  const results = program.requirements.map((req) => checkRequirement(company, req))
  const met = results.filter((r) => r.met)
  const unmet = results.filter((r) => !r.met)
  const score = Math.round((met.length / results.length) * 100)
  const status = scoreToStatus(score, unmet.length)

  const nextActions = unmet.slice(0, 3).map((u) => {
    if (u.label.toLowerCase().includes('задолжен')) {
      return 'Получите справку об отсутствии налоговой задолженности'
    }
    return `Закройте условие: ${u.label.toLowerCase()}`
  })

  if (status === 'eligible' || status === 'almost') {
    nextActions.push('Подготовьте пакет документов по чек-листу')
  }

  const amountPotential =
    status === 'ineligible' ? 0 : Math.round(program.amountMax * (score / 100))

  return {
    program,
    score,
    status,
    amountPotential,
    met,
    unmet,
    nextActions,
  }
}

export function matchPrograms(company: CompanyProfile): MatchedProgram[] {
  return supportPrograms
    .map((program) => matchOne(company, program))
    .filter((m) => m.status !== 'ineligible')
    .sort((a, b) => b.score - a.score || b.amountPotential - a.amountPotential)
    .slice(0, 5)
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value)
}

export function daysUntil(dateIso: string): number {
  const end = new Date(dateIso)
  const now = new Date()
  const diff = end.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export function statusLabel(status: ProgramStatus): string {
  switch (status) {
    case 'eligible':
      return 'Подходит'
    case 'almost':
      return 'Почти подходит'
    case 'need_data':
      return 'Нужны данные'
    case 'ineligible':
      return 'Не подходит'
  }
}
