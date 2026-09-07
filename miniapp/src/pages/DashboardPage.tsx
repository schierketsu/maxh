import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { OpportunitySummary } from '../components/OpportunitySummary'
import { ProgramCard } from '../components/ProgramCard'
import { useCompany } from '../context/CompanyContext'
import { isCompanyLiked, setCompanyLiked } from '../lib/likedCompanies'
import { getWebApp } from '../lib/maxBridge'

export function DashboardPage() {
  const { company, matches, clearCompany } = useCompany()
  const [liked, setLiked] = useState(false)
  const [subscribed, setSubscribed] = useState(false)

  useEffect(() => {
    setLiked(company ? isCompanyLiked(company.inn) : false)
  }, [company])

  useEffect(() => {
    const wa = getWebApp()
    if (!wa?.BackButton) return

    const onBack = () => {
      clearCompany()
    }

    wa.BackButton.show()
    wa.BackButton.onClick(onBack)
    return () => {
      wa.BackButton?.offClick(onBack)
      wa.BackButton?.hide()
    }
  }, [clearCompany])

  if (!company) {
    return <Navigate to="/" replace />
  }

  const toggleLiked = () => {
    const next = !liked
    setLiked(next)
    setCompanyLiked(company, next)
  }

  return (
    <div className="page dashboard">
      <div className="dash-panel">
        <div className="dash-toolbar">
          <button
            type="button"
            className="dash-toolbar__btn dash-toolbar__btn--icon"
            aria-label="Назад"
            onClick={clearCompany}
          >
            <span aria-hidden="true">⬅️</span>
          </button>
          <div className="dash-toolbar__group">
            <button
              type="button"
              className={`dash-toolbar__btn dash-toolbar__btn--icon${liked ? ' is-active' : ''}`}
              aria-label="Лайк"
              aria-pressed={liked}
              onClick={toggleLiked}
            >
              <span aria-hidden="true">{liked ? '❤️' : '🤍'}</span>
            </button>
            <button
              type="button"
              className={`dash-toolbar__btn dash-toolbar__btn--icon${subscribed ? ' is-active' : ''}`}
              aria-label="Уведомления"
              aria-pressed={subscribed}
              onClick={() => setSubscribed((v) => !v)}
            >
              <span aria-hidden="true">{subscribed ? '🔔' : '🔕'}</span>
            </button>
          </div>
        </div>

        <OpportunitySummary company={company} matches={matches} />
      </div>

      <section className="programs">
        <div className="section-head">
          <h2>Подходящие меры</h2>
        </div>

        {matches.length === 0 ? (
          <p className="empty">
            Пока нет подходящих программ. Уточните профиль или попробуйте другую
            компанию.
          </p>
        ) : (
          <div className="program-list">
            {matches.map((match) => (
              <ProgramCard key={match.program.id} match={match} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
