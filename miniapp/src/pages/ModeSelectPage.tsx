import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@maxhub/max-ui'
import gosuslugiLogo from '../assets/icons/gos_icon.png'
import { fetchCompanyByInn } from '../lib/companyApi'
import { useCompany } from '../context/CompanyContext'

// Заглушка: реальной интеграции с Госуслугами нет, поэтому ИНН зашит в код.
// Сессия не сохраняется (persist=false у setCompany) — после перезапуска
// приложения нужно будет "связать" аккаунт заново.
const GOSUSLUGI_STUB_INN = '7724351831'

// Декоративное облако тегов вокруг "mера" — идеология проекта, а не UI.
// Вместо сетки строк — 4 параллельные диагональные "линии" (top+left = const),
// вдоль которых слова идут вплотную друг за другом; тот же поворот -45°
// у каждого слова (.mode-select-tagcloud__item) совпадает с направлением
// линии, поэтому они читаются как длинные наклонные потоки текста.
const IDEOLOGY_TAGS = [
  // линия 1 (верхний левый угол, top+left≈30)
  { text: 'сила в сети', top: '30%', left: '0%', size: 26, opacity: 0.2 },
  { text: 'найди своих', top: '20%', left: '10%', size: 27, opacity: 0.22 },
  { text: 'гранты рядом', top: '10%', left: '20%', size: 25, opacity: 0.18 },
  { text: 'рядом', top: '0%', left: '30%', size: 29, opacity: 0.24 },
  // линия 2 (top+left≈75)
  { text: 'найди партнёра', top: '67%', left: '8%', size: 35, opacity: 0.32 },
  { text: 'не будь один', top: '46%', left: '29%', size: 30, opacity: 0.26 },
  { text: 'доверие', top: '25%', left: '50%', size: 31, opacity: 0.28 },
  { text: 'твоя сеть', top: '4%', left: '71%', size: 26, opacity: 0.2 },
  // линия 3 (top+left≈120)
  { text: 'вместе', top: '94%', left: '26%', size: 47, opacity: 0.4 },
  { text: 'поддержка', top: '73%', left: '47%', size: 34, opacity: 0.3 },
  { text: 'связи решают', top: '52%', left: '68%', size: 27, opacity: 0.22 },
  { text: 'сеть контактов', top: '31%', left: '89%', size: 31, opacity: 0.28 },
  // линия 4 (нижний правый угол, top+left≈165)
  { text: 'рынок открыт', top: '95%', left: '70%', size: 26, opacity: 0.2 },
  { text: 'заявки и предложения', top: '85%', left: '80%', size: 23, opacity: 0.18 },
  { text: 'бизнес для бизнеса', top: '75%', left: '90%', size: 23, opacity: 0.18 },
  { text: 'рост бизнеса', top: '67%', left: '98%', size: 29, opacity: 0.22 },
]

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
      <div className="mode-select-tagcloud" aria-hidden="true">
        {IDEOLOGY_TAGS.map((tag) => (
          <span
            key={tag.text}
            className="mode-select-tagcloud__item"
            style={{
              top: tag.top,
              left: tag.left,
              fontSize: tag.size,
              opacity: tag.opacity,
            }}
          >
            {tag.text}
          </span>
        ))}
      </div>

      <div className="mode-select-tiles">
        <div className="mode-select-tiles__row">
          <div className="mode-select-tile mode-select-tile--blue mode-select-tile--icon-left">
            <div className="mode-select-tile__text">
              <h1 className="mode-select-brand">mера</h1>
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
