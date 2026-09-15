import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '@maxhub/max-ui'
import { useCompany } from '../context/CompanyContext'
import { deleteRequest, fetchMyRequests, setRequestStatus } from '../lib/b2bApi'
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
  const navigate = useNavigate()
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

  const toggleStatus = async (request: B2BRequestWithOffers) => {
    const nextStatus = request.status === 'active' ? 'inactive' : 'active'
    try {
      const updated = await setRequestStatus(request.id, nextStatus)
      setRequests((prev) =>
        prev?.map((r) => (r.id === request.id ? { ...r, status: updated.status } : r)) ?? prev,
      )
    } catch {
      // тихо игнорируем — статус просто останется прежним на экране
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Удалить заявку без возможности восстановления?')) return
    try {
      await deleteRequest(id)
      setRequests((prev) => prev?.filter((r) => r.id !== id) ?? prev)
    } catch {
      // тихо игнорируем — заявка останется в списке
    }
  }

  return (
    <div className="page b2b-my-requests">
      <div className="b2b-my-requests__header">
        <Button type="button" className="b2b-parse-cta" onClick={() => navigate('/b2b/requests/new')}>
          + новая заявка
        </Button>
      </div>

      <div className="requests-table">
        {requests === null ? (
          <div className="requests-table__row requests-table__row--empty">Загружаем…</div>
        ) : requests.length === 0 ? (
          <div className="requests-table__row requests-table__row--empty">Пока пусто</div>
        ) : (
          requests.map((request) => {
            const hasOffers = request.offers.length > 0
            const isActive = request.status === 'active'
            return (
              <div
                className={`requests-table__row${isActive ? '' : ' is-inactive'}`}
                key={request.id}
              >
                <span
                  className={`requests-table__dot${hasOffers && isActive ? ' is-active' : ''}`}
                  aria-hidden="true"
                />
                <span className={`requests-table__direction requests-table__direction--${request.direction}`}>
                  {request.direction === 'supply' ? 'даю' : 'ищу'}
                </span>
                <span className="requests-table__title">{request.title}</span>
                <span className={`requests-table__status${hasOffers && isActive ? ' is-active' : ''}`}>
                  {!isActive ? 'неактивна' : hasOffers ? `${request.offers.length} ${offersWord(request.offers.length)}` : 'ожидает'}
                </span>
                <button
                  type="button"
                  className="requests-table__action"
                  aria-label={isActive ? 'Деактивировать' : 'Активировать'}
                  onClick={() => toggleStatus(request)}
                >
                  {isActive ? '⏸' : '▶'}
                </button>
                <button
                  type="button"
                  className="requests-table__action requests-table__action--danger"
                  aria-label="Удалить"
                  onClick={() => handleDelete(request.id)}
                >
                  ✕
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
