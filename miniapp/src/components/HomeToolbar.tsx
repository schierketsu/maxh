import { useLocation, useNavigate } from 'react-router-dom'

const TABS = [
  { path: '/modes', label: 'главная' },
  { path: '/map', label: 'карта' },
  { path: '/profile', label: 'профиль' },
]

/** Постоянная нижняя панель навигации — на всех экранах, кроме входа через Госуслуги. */
export function HomeToolbar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <div className="home-toolbar">
      {TABS.map((tab) => (
        <button
          key={tab.path}
          type="button"
          className={`home-toolbar__btn${pathname === tab.path ? ' is-active' : ''}`}
          onClick={() => navigate(tab.path)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
