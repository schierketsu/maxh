import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useCompany } from '../context/CompanyContext'
import { fetchMyRequests } from '../lib/b2bApi'
import type { B2BRequestWithOffers } from '../types'

function offersWord(n: number) {
  const mod100 = n % 100
  const mod10 = n % 10
  if (mod100 >= 11 && mod100 <= 14) return 'предложений'
  if (mod10 === 1) return 'предложение'
  if (mod10 >= 2 && mod10 <= 4) return 'предложения'
  return 'предложений'
}

export function B2BMyRequestsPage() {
  const { company } = useCompany()
  const [requests, setRequests] = useState<B2BRequestWithOffers[] | null>(null)

  useEffect(() => {
    if (!company) return
    fetchMyRequests(company.inn)
      .then(setRequests)
      .catch(() => setRequests([]))
  }, [company])

  if (!company) {
    return <Navigate to="/b2b" replace />
  }

  return (
    <div className="page b2b-my-requests">
      <div className="requests-table">
        {requests === null ? (
          <div className="requests-table__row requests-table__row--empty">Загружаем…</div>
        ) : requests.length === 0 ? (
          <div className="requests-table__row requests-table__row--empty">Пока пусто</div>
        ) : (
          requests.map((request) => {
            const hasOffers = request.offers.length > 0
            return (
              <div className="requests-table__row" key={request.id}>
                <span
                  className={`requests-table__dot${hasOffers ? ' is-active' : ''}`}
                  aria-hidden="true"
                />
                <span className="requests-table__title">{request.title}</span>
                <span className={`requests-table__status${hasOffers ? ' is-active' : ''}`}>
                  {hasOffers
                    ? `${request.offers.length} ${offersWord(request.offers.length)}`
                    : 'ожидает'}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
