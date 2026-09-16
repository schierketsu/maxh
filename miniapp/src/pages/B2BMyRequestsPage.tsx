import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '@maxhub/max-ui'
import { useCompany } from '../context/CompanyContext'
import { deleteRequest, fetchMyRequests, setRequestStatus } from '../lib/b2bApi'
import { getContactedRequests, removeContactedRequest, type ContactedRequest } from '../lib/contactedRequests'
import { formatMoney } from '../lib/matching'
import { brandCompanyName } from '../lib/demoBranding'
import type { B2BRequestWithOffers } from '../types'
import closeIcon from '../assets/icons/icon_close.png'
import pauseIcon from '../assets/icons/icon_pause.png'
import playIcon from '../assets/icons/icon_play.png'

function offersWord(n: number) {
  const mod100 = n % 100
  const mod10 = n % 10
  if (mod100 >= 11 && mod100 <= 14) return 'предложений'
  if (mod10 === 1) return 'предложение'
  if (mod10 >= 2 && mod10 <= 4) return 'предложения'
  return 'предложений'
}

function toggleInSet(set: Set<string>, id: string): Set<string> {
  const next = new Set(set)
  if (next.has(id)) {
    next.delete(id)
  } else {
    next.add(id)
  }
  return next
}

export function B2BMyRequestsPage() {
  const { company } = useCompany()
  const navigate = useNavigate()
  const [requests, setRequests] = useState<B2BRequestWithOffers[] | null>(null)
  const [contacted, setContacted] = useState<ContactedRequest[]>([])
  const [expandedRequests, setExpandedRequests] = useState<Set<string>>(new Set())
  const [expandedContacted, setExpandedContacted] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!company) return
    fetchMyRequests(company.inn)
      .then(setRequests)
      .catch(() => setRequests([]))
  }, [company])

  useEffect(() => {
    setContacted(company ? getContactedRequests(company.inn) : [])
  }, [company])

  const handleRemoveContacted = (id: string) => {
    if (!company) return
    setContacted(removeContactedRequest(company.inn, id))
  }

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
            const isExpanded = expandedRequests.has(request.id)
            return (
              <div className="requests-table__item" key={request.id}>
                <div
                  className={`requests-table__row${isActive ? '' : ' is-inactive'}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandedRequests((prev) => toggleInSet(prev, request.id))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setExpandedRequests((prev) => toggleInSet(prev, request.id))
                    }
                  }}
                >
                  <span className={`requests-table__direction requests-table__direction--${request.direction}`}>
                    {request.direction === 'supply' ? 'даю' : 'ищу'}
                  </span>
                  <span className="requests-table__title">{request.item}</span>
                  <span className={`requests-table__status${hasOffers && isActive ? ' is-active' : ''}`}>
                    {!isActive ? 'неактивна' : hasOffers ? `${request.offers.length} ${offersWord(request.offers.length)}` : 'ожидает'}
                  </span>
                  <button
                    type="button"
                    className={`requests-table__action ${isActive ? 'requests-table__action--pause' : 'requests-table__action--play'}`}
                    aria-label={isActive ? 'Деактивировать' : 'Активировать'}
                    onClick={(event) => {
                      event.stopPropagation()
                      toggleStatus(request)
                    }}
                  >
                    {isActive ? (
                      <img className="requests-table__action-icon" src={pauseIcon} alt="" />
                    ) : (
                      <img className="requests-table__action-icon" src={playIcon} alt="" />
                    )}
                  </button>
                  <button
                    type="button"
                    className="requests-table__action requests-table__action--danger"
                    aria-label="Удалить"
                    onClick={(event) => {
                      event.stopPropagation()
                      handleDelete(request.id)
                    }}
                  >
                    <img className="requests-table__action-icon" src={closeIcon} alt="" />
                  </button>
                </div>

                {isExpanded && (
                  <div className="requests-table__details">
                    {request.qty && <p><b>Количество:</b> {request.qty}</p>}
                    {request.deadline && <p><b>Срок:</b> {request.deadline}</p>}
                    {request.budget != null && <p><b>Бюджет:</b> {formatMoney(request.budget)}</p>}
                    {request.notes && <p>{request.notes}</p>}
                    {hasOffers && (
                      <div className="requests-table__offers">
                        {request.offers.map((offer) => (
                          <div className="requests-table__offer" key={offer.id}>
                            <span className="requests-table__offer-name">
                              {brandCompanyName(offer.supplierInn, offer.supplierName)}
                            </span>
                            {offer.price != null && <span>{formatMoney(offer.price)}</span>}
                            {offer.terms && <span>{offer.terms}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {contacted.length > 0 && (
        <section className="section-head">
          <h2>вы связывались:</h2>
        </section>
      )}
      {contacted.length > 0 && (
        <div className="requests-table">
          {contacted.map((item) => {
            const isExpanded = expandedContacted.has(item.id)
            return (
              <div className="requests-table__item" key={item.id}>
                <div
                  className="requests-table__row"
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandedContacted((prev) => toggleInSet(prev, item.id))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setExpandedContacted((prev) => toggleInSet(prev, item.id))
                    }
                  }}
                >
                  <span className="requests-table__title">{item.name}</span>
                  <button
                    type="button"
                    className="requests-table__action requests-table__action--danger"
                    aria-label="Убрать"
                    onClick={(event) => {
                      event.stopPropagation()
                      handleRemoveContacted(item.id)
                    }}
                  >
                    <img className="requests-table__action-icon" src={closeIcon} alt="" />
                  </button>
                </div>

                {isExpanded && (
                  <div className="requests-table__details">
                    <p>{item.need}</p>
                    {item.deadline && <p><b>Срок:</b> {item.deadline}</p>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
