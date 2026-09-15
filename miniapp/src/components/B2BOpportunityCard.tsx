import { useNavigate } from 'react-router-dom'
import { Button } from '@maxhub/max-ui'
import type { B2BRequest } from '../types'
import { formatMoney } from '../lib/matching'

export function B2BOpportunityCard({ request }: { request: B2BRequest }) {
  const navigate = useNavigate()

  return (
    <div className="program-card">
      <div className="program-card__meta">
        <span className="program-card__amount">
          {request.budget ? `до ${formatMoney(request.budget)}` : 'бюджет не указан'}
        </span>
        {request.deadline && <span className="program-card__deadline">до {request.deadline}</span>}
      </div>

      <h3 className="program-card__title">{request.item}</h3>
      {request.notes && <p className="program-card__desc">{request.notes}</p>}

      <Button
        type="button"
        size="small"
        className="b2b-offer-cta"
        onClick={() => navigate(`/b2b/offer/${request.id}`)}
      >
        Предложить цену
      </Button>
    </div>
  )
}
