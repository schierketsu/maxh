import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { Button } from '@maxhub/max-ui'
import { OpportunitySummary } from '../components/OpportunitySummary'
import { ProgramCard } from '../components/ProgramCard'
import { useCompany } from '../context/CompanyContext'
import { getWebApp } from '../lib/maxBridge'

export function DashboardPage() {
  const { company, matches, clearCompany } = useCompany()

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

  return (
    <div className="page dashboard">
      <header className="dash-header">
        <p className="brand">Мера</p>
        <Button type="button" variant="ghost" size="small" onClick={clearCompany}>
          Сменить компанию
        </Button>
      </header>

      <OpportunitySummary company={company} matches={matches} />

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

      <p className="footnote">
        Следующий шаг — детальная карточка программы и чек-лист документов.
      </p>
    </div>
  )
}
