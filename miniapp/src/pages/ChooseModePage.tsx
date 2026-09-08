import { useState } from 'react'
import { CompanyDetailsOverlay } from '../components/CompanyDetailsOverlay'
import { useCompany } from '../context/CompanyContext'
import cakeIcon from '../assets/icon_cake.png'
import govImage from '../assets/гос.png'

export function ChooseModePage() {
  const { company } = useCompany()
  const [showDetails, setShowDetails] = useState(false)

  return (
    <div className="page onboarding choose-mode">
      <header className="profile-header">
        <button
          type="button"
          className="profile-avatar"
          aria-label="Информация о компании"
          onClick={() => setShowDetails(true)}
        >
          <img className="profile-avatar__icon" src={cakeIcon} alt="" />
        </button>
      </header>

      {showDetails && (
        <CompanyDetailsOverlay inn={company?.inn ?? null} onClose={() => setShowDetails(false)} />
      )}

      <div className="notice-tile">нет уведомлений</div>
      <div className="notice-tile notice-tile--fill notice-tile--gap-before notice-tile--image">
        <img className="notice-tile__image" src={govImage} alt="" />
        <span className="notice-tile__caption">
          Государственные
          <br />
          субсидии
        </span>
      </div>
      <div className="notice-tile notice-tile--fill" />
    </div>
  )
}
