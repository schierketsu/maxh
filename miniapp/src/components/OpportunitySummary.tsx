import type { CompanyProfile, MatchedProgram } from '../types'
import { Panel } from '@maxhub/max-ui'
import { daysUntil, formatMoney } from '../lib/matching'

interface OpportunitySummaryProps {
  company: CompanyProfile
  matches: MatchedProgram[]
}

export function OpportunitySummary({ company, matches }: OpportunitySummaryProps) {
  const totalPotential = matches.reduce((sum, m) => sum + m.amountPotential, 0)
  const actionNeeded = matches.filter((m) => m.unmet.length > 0).length
  const nearest = matches
    .map((m) => daysUntil(m.program.deadline))
    .sort((a, b) => a - b)[0]

  return (
    <Panel mode="secondary" className="summary">
      <div className="summary__business">
        <h2>{company.name}</h2>
        <p className="summary__tags">
          {company.region} · {company.industry} · {company.employees} сотрудников
        </p>
      </div>

      <div className="summary__stat summary__stat--potential">
        <span className="meta-label">Потенциал господдержки</span>
        <strong>{formatMoney(totalPotential)}</strong>
      </div>

      <div className="summary__grid">
        <div className="summary__stat">
          <span className="meta-label">Подходят сейчас</span>
          <strong>
            {matches.length}{' '}
            {matches.length === 1
              ? 'программа'
              : matches.length < 5
                ? 'программы'
                : 'программ'}
          </strong>
          <span className="summary__hint">подходят сейчас</span>
        </div>
        <div className="summary__stat">
          <span className="meta-label">Нужны шаги</span>
          <strong>{actionNeeded}</strong>
          <span className="summary__hint">программы с пробелами</span>
        </div>
        <div className="summary__stat">
          <span className="meta-label">Ближайший дедлайн</span>
          <strong>{nearest != null ? `${nearest} дн.` : '—'}</strong>
          <span className="summary__hint">не пропустите срок</span>
        </div>
      </div>
    </Panel>
  )
}
