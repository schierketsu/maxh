import type { CompanyProfile } from '../types'

/** Demo companies keyed by INN. Unknown INN falls back to manual profile. */
export const companiesByInn: Record<string, CompanyProfile> = {
  '7707083893': {
    inn: '7707083893',
    name: 'ООО «ТехноЛаб»',
    ogrn: '1027700132195',
    region: 'Москва',
    companyType: 'ООО',
    industry: 'IT',
    okved: ['62.01', '62.02'],
    companyAgeMonths: 26,
    employees: 12,
    revenue: 18_000_000,
    isSme: true,
    taxRegime: 'УСН',
    goals: ['найм сотрудников', 'разработка нового продукта'],
  },
  '500100732259': {
    inn: '500100732259',
    name: 'ИП Смирнова А.В.',
    ogrn: '304500136400152',
    region: 'Московская область',
    companyType: 'ИП',
    industry: 'Производство',
    okved: ['25.11', '25.62'],
    companyAgeMonths: 48,
    employees: 4,
    revenue: 6_200_000,
    isSme: true,
    taxRegime: 'УСН',
    goals: ['покупка оборудования'],
  },
  '1653001805': {
    inn: '1653001805',
    name: 'ООО «Казань Фуд»',
    ogrn: '1021602842344',
    region: 'Республика Татарстан',
    companyType: 'ООО',
    industry: 'Пищевая промышленность',
    okved: ['10.71', '10.85'],
    companyAgeMonths: 84,
    employees: 35,
    revenue: 42_000_000,
    isSme: true,
    taxRegime: 'ОСН',
    goals: ['расширение производства', 'найм сотрудников'],
  },
}

export const demoInns = Object.keys(companiesByInn)

export function lookupCompanyByInn(inn: string): CompanyProfile | null {
  const cleaned = inn.replace(/\D/g, '')
  return companiesByInn[cleaned] ?? null
}
