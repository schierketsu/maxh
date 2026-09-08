import { useCompany } from '../context/CompanyContext'
import govImage from '../assets/гос.png'

export function ChooseModePage() {
  const { company } = useCompany()

  const initial = company?.name.trim().charAt(0).toUpperCase() ?? '?'

  return (
    <div className="page onboarding choose-mode">
      <header className="profile-header">
        <span className="profile-avatar" aria-hidden="true">{initial}</span>
      </header>

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
