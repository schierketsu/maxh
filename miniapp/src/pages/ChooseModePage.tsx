import { Navigate } from 'react-router-dom'
import { useCompany } from '../context/CompanyContext'
import govImage from '../assets/гос.png'

export function ChooseModePage() {
  const { company } = useCompany()

  if (!company) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="page onboarding choose-mode">
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
