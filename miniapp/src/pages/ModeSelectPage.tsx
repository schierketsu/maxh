import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@maxhub/max-ui'
import gosuslugiLogo from '../assets/gos_icon.png'
import mapTileIcon from '../assets/back_pod_panel.png'
import { fetchCompanyByInn } from '../lib/companyApi'
import { useCompany } from '../context/CompanyContext'

// Заглушка: реальной интеграции с Госуслугами нет, поэтому ИНН зашит в код.
// Сессия не сохраняется (persist=false у setCompany) — после перезапуска
// приложения нужно будет "связать" аккаунт заново.
const GOSUSLUGI_STUB_INN = '7724351831'

export function ModeSelectPage() {
  const { setCompany } = useCompany()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  const linkViaGosuslugi = async () => {
    setLoading(true)
    setFailed(false)
    try {
      const company = await fetchCompanyByInn(GOSUSLUGI_STUB_INN)
      if (!company) {
        setFailed(true)
        return
      }
      setCompany(company, false)
      navigate('/modes')
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page onboarding mode-select-page">
      <div className="mode-select-tiles">
        <div className="mode-select-tiles__row">
          <div className="mode-select-tile mode-select-tile--blue mode-select-tile--icon-left">
            <img className="mode-select-tile__icon" src={mapTileIcon} alt="" />
            <div className="mode-select-tile__text">
              <h1 className="mode-select-brand">мера</h1>
              <p className="mode-select-tile__caption">
                находи
                <br />
                партнёров
                <br />
                своему
                <br />
                бизнесу
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="gosuslugi-bar">
        {failed && <p className="empty">Не удалось связать аккаунт. Попробуйте ещё раз.</p>}
        <Button
          type="button"
          className="gosuslugi-cta"
          loading={loading}
          disabled={loading}
          innerClassNames={{ content: 'gosuslugi-cta__label' }}
          onClick={linkViaGosuslugi}
        >
          {loading ? (
            'Связываем…'
          ) : (
            <img className="gosuslugi-cta__logo" src={gosuslugiLogo} alt="Связать через Госуслуги" />
          )}
        </Button>
      </div>
    </div>
  )
}
