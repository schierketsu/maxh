import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@maxhub/max-ui'
import gosuslugiLogo from '../assets/icons/gos_icon.png'
import cakeIcon from '../assets/icons/icon_cake.png'
import coffeeIcon from '../assets/icons/icon_coffe.png'
import { fetchCompanyByInn } from '../lib/companyApi'
import { useCompany } from '../context/CompanyContext'

// Заглушка: реальной интеграции с Госуслугами нет, поэтому вместо неё —
// переключатель между двумя заранее подготовленными демо-аккаунтами
// (реальные ИНН, данные подтягиваются из DaData как обычно). Сессия не
// сохраняется (persist=false у setCompany) — после перезапуска приложения
// нужно будет "связать" аккаунт заново.
interface DemoAccount {
  id: string
  inn: string
  name: string
  avatarIcon: string
  avatarColor: string
  avatarIconClassName?: string
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  { id: 'cake', inn: '7724351831', name: 'ВКУСНЫЙ КЕЙК', avatarIcon: cakeIcon, avatarColor: 'var(--palette-red)' },
  {
    id: 'demo2',
    inn: '7717762862',
    name: 'КОФЕ ТОЧКА',
    avatarIcon: coffeeIcon,
    avatarColor: '#2878fd',
    avatarIconClassName: 'account-avatar__icon--coffee',
  },
]

function AccountAvatar({ account, className }: { account: DemoAccount; className?: string }) {
  const cls = ['account-avatar', className].filter(Boolean).join(' ')
  const iconCls = ['account-avatar__icon', account.avatarIconClassName].filter(Boolean).join(' ')
  return (
    <span className={cls} style={{ background: account.avatarColor }} aria-hidden="true">
      <img className={iconCls} src={account.avatarIcon} alt="" />
    </span>
  )
}

// Декоративное облако тегов вокруг "mера" — идеология проекта, а не UI.
// Вместо сетки строк — 4 параллельные диагональные "линии" (top+left = const),
// вдоль которых слова идут вплотную друг за другом; тот же поворот -45°
// у каждого слова (.mode-select-tagcloud__item) совпадает с направлением
// линии, поэтому они читаются как длинные наклонные потоки текста.
const IDEOLOGY_TAGS = [
  // линия 1 (верхний левый угол, top+left≈30)
  { text: 'сила в сети', top: '30%', left: '0%', size: 26, opacity: 0.1 },
  { text: 'найди своих', top: '20%', left: '10%', size: 27, opacity: 0.11 },
  { text: 'гранты рядом', top: '10%', left: '20%', size: 25, opacity: 0.09 },
  { text: 'рядом', top: '0%', left: '30%', size: 29, opacity: 0.12 },
  // линия 2 (top+left≈75)
  { text: 'найди партнёра', top: '67%', left: '8%', size: 35, opacity: 0.16 },
  { text: 'не будь один', top: '46%', left: '29%', size: 30, opacity: 0.13 },
  { text: 'доверие', top: '25%', left: '50%', size: 31, opacity: 0.14 },
  { text: 'твоя сеть', top: '4%', left: '71%', size: 26, opacity: 0.1 },
  // линия 3 (top+left≈120)
  { text: 'вместе', top: '94%', left: '26%', size: 47, opacity: 0.2 },
  { text: 'поддержка', top: '73%', left: '47%', size: 34, opacity: 0.15 },
  { text: 'связи решают', top: '52%', left: '68%', size: 27, opacity: 0.11 },
  { text: 'сеть контактов', top: '31%', left: '89%', size: 31, opacity: 0.14 },
  // линия 4 (нижний правый угол, top+left≈165)
  { text: 'рынок открыт', top: '95%', left: '70%', size: 26, opacity: 0.1 },
  { text: 'заявки и предложения', top: '85%', left: '80%', size: 23, opacity: 0.09 },
  { text: 'бизнес для бизнеса', top: '75%', left: '90%', size: 23, opacity: 0.09 },
  { text: 'рост бизнеса', top: '67%', left: '98%', size: 29, opacity: 0.11 },
]

const GOSUSLUGI_NOTICE_TEXT = 'Авторизация через Госуслуги предполагается в реализованном продукте, на данный момент вы можете протестировать прототип через демо-аккаунты.'
const NOTICE_TIMEOUT_MS = 5000

export function ModeSelectPage() {
  const { setCompany } = useCompany()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [activeAccountId, setActiveAccountId] = useState(DEMO_ACCOUNTS[0].id)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const noticeTimerRef = useRef<number | null>(null)
  const activeAccount = DEMO_ACCOUNTS.find((account) => account.id === activeAccountId) ?? DEMO_ACCOUNTS[0]

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current)
    }
  }, [])

  const showNotice = (text: string) => {
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current)
    setNotice(text)
    noticeTimerRef.current = window.setTimeout(() => setNotice(null), NOTICE_TIMEOUT_MS)
  }

  const handleGosuslugiClick = () => showNotice(GOSUSLUGI_NOTICE_TEXT)

  const loginWithDemo = async () => {
    setLoading(true)
    setFailed(false)
    try {
      const company = await fetchCompanyByInn(activeAccount.inn)
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
      {notice && (
        <div className="top-notice" role="status">
          {notice}
        </div>
      )}

      <div className="account-switcher">
        <button
          type="button"
          className="account-switcher__trigger account-switcher__trigger--text"
          aria-expanded={accountMenuOpen}
          onClick={() => setAccountMenuOpen((open) => !open)}
        >
          сменить аккаунт
        </button>

        {accountMenuOpen && (
          <>
            <button
              type="button"
              className="account-switcher__backdrop"
              aria-label="Закрыть меню аккаунтов"
              onClick={() => setAccountMenuOpen(false)}
            />
            <div className="account-switcher__menu">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  className={`account-switcher__item${account.id === activeAccount.id ? ' is-active' : ''}`}
                  onClick={() => {
                    setActiveAccountId(account.id)
                    setAccountMenuOpen(false)
                  }}
                >
                  <AccountAvatar account={account} className="account-switcher__item-avatar" />
                  <span className="account-switcher__item-name">{account.name}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

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
              <div className="mode-select-brand-wrap">
                <h1 className="mode-select-brand">mера</h1>
                <p className="mode-select-slogan">
                  инструмент
                  <br />
                  для малого бизнеса
                </p>
              </div>
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
          onClick={loginWithDemo}
        >
          <span className="gosuslugi-cta__label-text">{loading ? 'Связываем…' : 'войти через демо'}</span>
        </Button>
        <Button
          type="button"
          className="gosuslugi-cta"
          innerClassNames={{ content: 'gosuslugi-cta__label' }}
          onClick={handleGosuslugiClick}
        >
          <img className="gosuslugi-cta__logo" src={gosuslugiLogo} alt="Связать через Госуслуги" />
        </Button>
      </div>
    </div>
  )
}
