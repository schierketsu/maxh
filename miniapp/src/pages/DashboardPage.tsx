import { useEffect, useMemo } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { BenefitCard } from '../components/BenefitCard'
import { useCompany } from '../context/CompanyContext'
import { govBenefits } from '../data/benefits'
import { getWebApp } from '../lib/maxBridge'
import { matchRequirementStatus } from '../lib/matching'

const STEPS = [
  { number: '01', label: 'Выберите меру поддержки' },
  { number: '02', label: 'Подайте заявку' },
  { number: '03', label: 'Дождитесь решения' },
  { number: '04', label: 'Получите поддержку' },
]

export function DashboardPage() {
  const { company } = useCompany()
  const navigate = useNavigate()

  useEffect(() => {
    const wa = getWebApp()
    if (!wa?.BackButton) return

    const onBack = () => navigate('/modes')

    wa.BackButton.show()
    wa.BackButton.onClick(onBack)
    return () => {
      wa.BackButton?.offClick(onBack)
      wa.BackButton?.hide()
    }
  }, [navigate])

  const govMatches = useMemo(() => {
    if (!company) return []
    return govBenefits
      .map((benefit, index) => ({
        benefit,
        index,
        status: benefit.forceStatus ?? matchRequirementStatus(company, benefit.requirements),
      }))
      .filter((item) => item.status !== 'ineligible')
  }, [company])

  if (!company) {
    return <Navigate to="/gov" replace />
  }

  return (
    <div className="page dashboard">
      <button
        type="button"
        className="company-reviews-list__back"
        aria-label="Назад"
        onClick={() => navigate('/modes')}
      >
        назад
      </button>

      <div className="dashboard__steps">
        {STEPS.map((step) => (
          <div className="dashboard__step" key={step.number}>
            <span className="dashboard__step-number">{step.number}</span>
            <p className="dashboard__step-label">{step.label}</p>
          </div>
        ))}
      </div>

      <section className="benefits">
        <div className="benefits__list">
          {govMatches.map(({ benefit, index, status }) => (
            <BenefitCard key={benefit.id} benefit={benefit} index={index} statusTag={status} />
          ))}
        </div>
      </section>
    </div>
  )
}
