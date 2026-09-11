import { useNavigate } from 'react-router-dom'

/** Постоянная нижняя панель навигации — на всех экранах, кроме входа через Госуслуги. */
export function HomeToolbar() {
  const navigate = useNavigate()

  return (
    <div className="home-toolbar">
      <button type="button" className="home-toolbar__btn" onClick={() => navigate('/modes')}>
        главная
      </button>
      <button type="button" className="home-toolbar__btn" onClick={() => navigate('/map')}>
        карта
      </button>
      <button type="button" className="home-toolbar__btn" onClick={() => navigate('/profile')}>
        профиль
      </button>
    </div>
  )
}
