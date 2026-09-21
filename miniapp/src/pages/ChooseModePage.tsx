import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { BenefitCard } from '../components/BenefitCard'
import { useCompany } from '../context/CompanyContext'
import { benefits } from '../data/benefits'
import { getDemoNotifications } from '../data/demoNotifications'
import govImage from '../assets/гос.png'

const BENEFITS_PAGE_SIZE = 2

export function ChooseModePage() {
  const { company } = useCompany()
  const navigate = useNavigate()
  const [visibleCount, setVisibleCount] = useState(BENEFITS_PAGE_SIZE)

  if (!company) {
    return <Navigate to="/" replace />
  }

  const notifications = getDemoNotifications(company.inn)

  return (
    <div className="page onboarding choose-mode">
      {notifications.length > 0 ? (
        <button type="button" className="notice-tile notice-tile--compact" onClick={() => navigate('/notifications')}>
          новое уведомление
          <svg className="notice-tile__dot" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <circle cx="5" cy="5" r="5" fill="var(--red)" />
          </svg>
        </button>
      ) : (
        <div className="notice-tile notice-tile--compact">нет уведомлений</div>
      )}
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
