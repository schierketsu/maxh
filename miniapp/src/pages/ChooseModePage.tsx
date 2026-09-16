import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { BenefitCard } from '../components/BenefitCard'
import { useCompany } from '../context/CompanyContext'
import { benefits } from '../data/benefits'
import govImage from '../assets/гос.png'

const BENEFITS_PAGE_SIZE = 2

export function ChooseModePage() {
  const { company } = useCompany()
  const navigate = useNavigate()
  const [visibleCount, setVisibleCount] = useState(BENEFITS_PAGE_SIZE)

  if (!company) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="page onboarding choose-mode">
      <div className="notice-tile">нет уведомлений</div>
      <button
        type="button"
        className="notice-tile notice-tile--gap-before notice-tile--image"
        onClick={() => navigate('/gov/dashboard')}
      >
        <img className="notice-tile__image" src={govImage} alt="" />
        <span className="notice-tile__caption">
          Государственные
          <br />
          <span className="notice-tile__caption-big">субсидии</span>
        </span>
      </button>

      <section className="benefits">
        <h2 className="benefits__title">
          ваша <span className="benefits__title-accent">mера</span>
        </h2>
        <div className="benefits__list">
          {benefits.slice(0, visibleCount).map((benefit, index) => (
            <BenefitCard key={benefit.id} benefit={benefit} index={index} />
          ))}
          {visibleCount < benefits.length && (
            <button
              type="button"
              className="benefits__more"
              onClick={() => setVisibleCount((prev) => Math.min(prev + BENEFITS_PAGE_SIZE, benefits.length))}
            >
              показать ещё
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
