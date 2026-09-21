import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@maxhub/max-ui'
import cakeIcon from '../assets/icons/icon_cake.png'
import coffeeIcon from '../assets/icons/icon_coffe.png'
import { fetchCompanyByInn, fetchCompanyByMaxUserId } from '../lib/companyApi'
import { getMaxUserId } from '../lib/maxBridge'
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

export function ModeSelectPage() {
  const { company, setCompany } = useCompany()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [activeAccountId, setActiveAccountId] = useState(DEMO_ACCOUNTS[0].id)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const activeAccount = DEMO_ACCOUNTS.find((account) => account.id === activeAccountId) ?? DEMO_ACCOUNTS[0]

  // Мини-апп открыта из бота (кнопка open_app) — если этот MAX user_id уже
  // привязан к компании (писал боту или раньше подтвердил себя тут через
  // InnGate), узнаём его сразу и уводим на дашборд без ручного входа. Не
  // трогаем, если компания уже выбрана (например, восстановлена из
  // localStorage) — только на "холодный" заход.
  useEffect(() => {
    if (company) return
    const maxUserId = getMaxUserId()
    if (!maxUserId) return
    let cancelled = false
    fetchCompanyByMaxUserId(maxUserId)
      .then((found) => {
        if (cancelled || !found) return
        setCompany(found, true)
        navigate('/modes', { replace: true })
      })
      .catch(() => {
        // тихо игнорируем — просто останемся на обычном экране входа
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      <div className="account-switcher">
        <button
          type="button"
          className={`account-switcher__trigger account-switcher__trigger--text${accountMenuOpen ? ' is-open' : ''}`}
          aria-expanded={accountMenuOpen}
          onClick={() => setAccountMenuOpen((open) => !open)}
        >
          {accountMenuOpen ? 'скрыть' : 'сменить аккаунт'}
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
        <p className="gosuslugi-verified">
          Профиль подтверждён через Госуслуги — нашли компании, которыми вы владеете
        </p>
        <Button
          type="button"
          className={`gosuslugi-cta${failed ? ' inn-input--invalid' : ''}`}
          loading={loading}
          disabled={loading}
          innerClassNames={{ content: 'gosuslugi-cta__label' }}
          onClick={loginWithDemo}
        >
          <span className="gosuslugi-cta__label-text">{loading ? 'Связываем…' : 'войти'}</span>
        </Button>
      </div>
    </div>
  )
}
