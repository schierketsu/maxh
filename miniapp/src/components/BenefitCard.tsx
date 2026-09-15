import type { Benefit } from '../data/benefits'
import { statusLabel } from '../lib/matching'
import type { ProgramStatus } from '../types'
import newWindowIcon from '../assets/icon_new_window.png'

const PLACEHOLDER_COLORS = [
  'var(--palette-blue)',
  'var(--palette-purple)',
  'var(--palette-pink)',
  'var(--palette-lime)',
  'var(--palette-red)',
]

const PROMO_BADGES = ['Популярное', 'Топ', 'Выгодно', 'Новое']

interface BenefitCardProps {
  benefit: Benefit
  index: number
  statusTag?: ProgramStatus
}

export function BenefitCard({ benefit, index, statusTag }: BenefitCardProps) {
  const color = PLACEHOLDER_COLORS[index % PLACEHOLDER_COLORS.length]

  if (statusTag) {
    return (
      <div className="benefit-card">
        <div className="benefit-card__photo" style={{ background: color }} />

        <div className="benefit-card__tags">
          <span className={`program-card__status-tag program-card__status-tag--${statusTag}`}>
            {statusLabel(statusTag)}
          </span>
        </div>

        <h3 className="benefit-card__title">{benefit.title}</h3>
        <p className="benefit-card__desc">{benefit.description}</p>

        <div className="benefit-card__actions">
          <button type="button" className="benefit-card__cta">
            Подробнее
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="benefit-card benefit-card--solid" style={{ background: color }}>
      <div className="benefit-card__tags">
        <span className="benefit-card__tag">{PROMO_BADGES[index % PROMO_BADGES.length]}</span>
        <button type="button" className="benefit-card__cta benefit-card__cta--icon" aria-label="Подробнее">
          <img className="benefit-card__cta-icon" src={newWindowIcon} alt="" />
        </button>
      </div>

      <h3 className="benefit-card__title">{benefit.title}</h3>
      <p className="benefit-card__desc">{benefit.description}</p>
    </div>
  )
}
