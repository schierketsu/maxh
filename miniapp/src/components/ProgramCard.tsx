import type { MatchedProgram } from '../types'
import { Panel } from '@maxhub/max-ui'
import { daysUntil, daysWord, formatMoney } from '../lib/matching'

interface ProgramCardProps {
  match: MatchedProgram
}

export function ProgramCard({ match }: ProgramCardProps) {
  const { program, status, amountPotential, unmet } = match
  const days = daysUntil(program.deadline)

  return (
    <Panel mode="secondary" className={`program-card status-${status}`}>
      <div className="program-card__meta">
        <span className="program-card__amount">до {formatMoney(amountPotential)}</span>
        <span className="program-card__deadline">
          {days === 0 ? 'истекает сегодня' : `осталось ${days} ${daysWord(days)}`}
        </span>
      </div>

      <h3 className="program-card__title">{program.title}</h3>
      <p className="program-card__desc">{program.shortDescription}</p>

      {unmet.length > 0 && (
        <p className="program-card__gap">
          Необходимо выполнить {unmet.length}{' '}
          {unmet.length === 1 ? 'условие' : unmet.length < 5 ? 'условия' : 'условий'}
        </p>
      )}
    </Panel>
  )
}
