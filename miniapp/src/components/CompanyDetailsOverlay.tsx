import cakeIcon from '../assets/icon_cake.png'
import type { CompanyProfile } from '../types'

interface CompanyDetailsOverlayProps {
  company: CompanyProfile | null
  onClose: () => void
}

export function CompanyDetailsOverlay({ company, onClose }: CompanyDetailsOverlayProps) {
  const sinceYear = company
    ? new Date().getFullYear() - Math.floor(company.companyAgeMonths / 12)
    : null

  return (
    <div className="company-details">
      <button type="button" className="company-details__close" aria-label="Закрыть" onClick={onClose}>
        ✕
      </button>

      <div className="company-details__content">
        {!company && (
          <p className="empty">Компания не определена — авторизуйтесь через Госуслуги ещё раз.</p>
        )}

        {company && (
          <div className="company-details__profile">
            <div className="company-details__avatar-wrap">
              <div className="company-details__avatar">
                <img className="company-details__avatar-icon" src={cakeIcon} alt="" />
              </div>
            </div>

            <div className="company-details__profile-body">
              <h1 className="company-details__name">{company.name}</h1>
              <p className="company-details__meta-line">На Мера с {sinceYear} года</p>
              <p className="company-details__meta-line">{company.companyType}</p>
              <div className="company-details__rating">
                <span className="company-details__rating-value">0,0</span>
                <span className="company-details__stars" aria-hidden="true">★★★★★</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
