const programs = [
  {
    id: 'equip-subsidy-msk',
    title: 'Субсидия на приобретение оборудования',
    amountMax: 850_000,
    deadline: '2026-09-28',
    requirements: [
      { label: 'Регион регистрации', check: 'region', value: ['Москва', 'Московская область'] },
      { label: 'Статус МСП', check: 'is_sme' },
      { label: 'Возраст компании от 12 мес.', check: 'min_age', value: 12 },
      { label: 'Численность до 250 чел.', check: 'max_employees', value: 250 },
    ],
  },
  {
    id: 'it-grant-federal',
    title: 'Грант на разработку IT-продукта',
    amountMax: 1_500_000,
    deadline: '2026-10-15',
    requirements: [
      { label: 'Статус МСП', check: 'is_sme' },
      { label: 'ОКВЭД в сфере IT', check: 'okved', value: ['62.01', '62.02', '63.11'] },
      { label: 'Возраст компании от 12 мес.', check: 'min_age', value: 12 },
      { label: 'Форма ООО или АО', check: 'company_type', value: ['ООО', 'АО'] },
      { label: 'Выручка от 5 млн ₽', check: 'min_revenue', value: 5_000_000 },
    ],
  },
  {
    id: 'hire-compensation',
    title: 'Компенсация затрат на найм',
    amountMax: 450_000,
    deadline: '2026-11-30',
    requirements: [
      { label: 'Статус МСП', check: 'is_sme' },
      { label: 'Возраст компании от 6 мес.', check: 'min_age', value: 6 },
    ],
  },
  {
    id: 'tatarstan-food',
    title: 'Региональная поддержка пищевых производств',
    amountMax: 2_000_000,
    deadline: '2026-09-20',
    requirements: [
      { label: 'Регион: Татарстан', check: 'region', value: ['Республика Татарстан'] },
      { label: 'Статус МСП', check: 'is_sme' },
      { label: 'ОКВЭД пищевой отрасли', check: 'okved', value: ['10.71', '10.72', '10.85'] },
      { label: 'Возраст компании от 24 мес.', check: 'min_age', value: 24 },
      { label: 'Выручка от 10 млн ₽', check: 'min_revenue', value: 10_000_000 },
    ],
  },
  {
    id: 'soft-loan-msp',
    title: 'Льготный кредит для МСП',
    amountMax: 5_000_000,
    deadline: '2026-12-31',
    requirements: [
      { label: 'Статус МСП', check: 'is_sme' },
      { label: 'Возраст компании от 12 мес.', check: 'min_age', value: 12 },
      { label: 'Выручка от 3 млн ₽', check: 'min_revenue', value: 3_000_000 },
    ],
  },
  {
    id: 'export-support',
    title: 'Поддержка выхода на экспорт',
    amountMax: 1_200_000,
    deadline: '2026-10-01',
    requirements: [
      { label: 'Статус МСП', check: 'is_sme' },
      { label: 'Возраст компании от 36 мес.', check: 'min_age', value: 36 },
      { label: 'Выручка от 20 млн ₽', check: 'min_revenue', value: 20_000_000 },
      { label: 'Форма ООО или АО', check: 'company_type', value: ['ООО', 'АО'] },
    ],
  },
]

function check(company, req) {
  switch (req.check) {
    case 'region':
      return (req.value ?? []).includes(company.region)
    case 'is_sme':
      return Boolean(company.isSme)
    case 'min_age':
      return company.companyAgeMonths >= Number(req.value)
    case 'okved':
      return company.okved.some((code) => req.value.includes(code))
    case 'max_employees':
      return company.employees <= Number(req.value)
    case 'min_revenue':
      return company.revenue >= Number(req.value)
    case 'company_type':
      return (req.value ?? []).includes(company.companyType)
    default:
      return false
  }
}

export function matchPrograms(company) {
  return programs
    .map((program) => {
      const results = program.requirements.map((req) => ({
        label: req.label,
        met: check(company, req),
      }))
      const met = results.filter((r) => r.met)
      const unmet = results.filter((r) => !r.met)
      const score = Math.round((met.length / results.length) * 100)
      if (score < 40) return null
      return {
        program,
        score,
        unmet,
        amountPotential: Math.round(program.amountMax * (score / 100)),
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || b.amountPotential - a.amountPotential)
    .slice(0, 5)
}

export function formatMoney(value) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value)
}
