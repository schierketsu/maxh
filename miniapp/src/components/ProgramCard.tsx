import type { MatchedProgram } from '../types'
import { daysUntil, formatMoney, statusLabel } from '../lib/matching'

interface ProgramCardProps {
  match: MatchedProgram
}

export function ProgramCard({ match }: ProgramCardProps) {
  const { program, score, status, amountPotential, unmet } = match
  const days = daysUntil(program.deadline)

  return (
    <article className={`program-card status-${status}`}>
      <div className="program-card__top">
        <span className={`status-pill status-pill--${status}`}>
          {statusLabel(status)}
        </span>
        <span className="program-card__score">{score}%</span>
      </div>

      <h3 className="program-card__title">{program.title}</h3>
      <p className="program-card__desc">{program.shortDescription}</p>

      <div className="program-card__meta">
        <div>
          <span className="meta-label">Потенциал</span>
          <strong>{formatMoney(amountPotential)}</strong>
        </div>
        <div>
          <span className="meta-label">Дедлайн</span>
          <strong>{days === 0 ? 'Сегодня' : `${days} дн.`}</strong>
        </div>
      </div>

      {unmet.length > 0 && (
        <p className="program-card__gap">
          Осталось закрыть {unmet.length}{' '}
          {unmet.length === 1 ? 'условие' : unmet.length < 5 ? 'условия' : 'условий'}
        </p>
      )}
    </article>
  )
}
