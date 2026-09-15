import { Navigate, useNavigate } from 'react-router-dom'
import { BenefitCard } from '../components/BenefitCard'
import { useCompany } from '../context/CompanyContext'
import { benefits } from '../data/benefits'
import govImage from '../assets/гос.png'

export function ChooseModePage() {
  const { company } = useCompany()
  const navigate = useNavigate()

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
          ваша <span className="benefits__title-accent">мера</span>
        </h2>
        <div className="benefits__list">
          {benefits.map((benefit, index) => (
            <BenefitCard key={benefit.id} benefit={benefit} index={index} />
          ))}
        </div>
      </section>
    </div>
  )
}
