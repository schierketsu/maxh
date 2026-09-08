import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '@maxhub/max-ui'
import { B2BOpportunityCard } from '../components/B2BOpportunityCard'
import { useCompany } from '../context/CompanyContext'
import { fetchOpportunities } from '../lib/b2bApi'
import type { B2BRequest } from '../types'

export function B2BHomePage() {
  const { company, clearCompany } = useCompany()
  const navigate = useNavigate()
  const [opportunities, setOpportunities] = useState<B2BRequest[] | null>(null)

  useEffect(() => {
    if (!company) return
    fetchOpportunities(company.inn)
      .then(setOpportunities)
      .catch(() => setOpportunities([]))
  }, [company])

  if (!company) {
    return <Navigate to="/b2b" replace />
  }

  return (
    <div className="page b2b-home">
      <header className="dash-header--simple">
        <button type="button" className="b2b-back" aria-label="Сменить компанию" onClick={clearCompany}>
          <span aria-hidden="true">⬅️</span>
        </button>
      </header>

      <header className="brand-block">
        <h1>{company.name}</h1>
      </header>
      <p className="b2b-home__meta">
        {company.region} · {company.industry}
      </p>

      <div className="b2b-actions">
        <Button type="button" onClick={() => navigate('/b2b/requests/new')}>
          Мне что-то нужно
        </Button>
        <Button type="button" variant="secondary" onClick={() => navigate('/b2b/requests')}>
          Мои заявки
        </Button>
      </div>

      <section className="programs">
        <div className="section-head">
          <h2>Возможности</h2>
        </div>

        {opportunities === null ? (
          <p className="empty">Загружаем…</p>
        ) : opportunities.length === 0 ? (
          <p className="empty">Пока нет подходящих заявок от других компаний.</p>
        ) : (
          <div className="program-list">
            {opportunities.map((request) => (
              <B2BOpportunityCard key={request.id} request={request} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
