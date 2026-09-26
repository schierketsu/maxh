import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@maxhub/max-ui'
import cakeIcon from '../assets/icons/icon_cake.png'
import coffeeIcon from '../assets/icons/icon_coffe.png'
import { fetchCompanyByInn, fetchCompanyByMaxUserId, linkMaxUserToCompany } from '../lib/companyApi'
import { getMaxUserId, getMaxUserName, waitForMaxUserId } from '../lib/maxBridge'
import { useCompany } from '../context/CompanyContext'
import type { CompanyProfile } from '../types'

// Заглушка: реальной интеграции с Госуслугами нет, поэтому вместо неё —
// переключатель между двумя заранее подготовленными демо-аккаунтами
// (реальные ИНН, данные подтягиваются из DaData как обычно). Сессия
// сохраняется (persist=true) и дублируется привязкой на бэкенде, так что
// при повторном открытии мини-аппа входить заново не нужно — выйти можно
// только кнопкой "выйти" в профиле.
interface DemoAccount {
  id: string
  inn: string
  name: string
  avatarIcon: string
  avatarColor: string
  avatarIconClassName?: string
}

// Пауза на экране приветствия при автовходе по привязке из бота.
const WELCOME_DURATION_MS = 3000

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
  // Компания, найденная по привязке из бота — пока она здесь, показываем
  // экран приветствия вместо формы входа (см. WELCOME_DURATION_MS).
  const [welcome, setWelcome] = useState<CompanyProfile | null>(null)
  // Пока не выяснили, выбран ли аккаунт в чат-боте, форму входа не рисуем —
  // иначе она успевает мелькнуть перед экраном приветствия.
  const [checking, setChecking] = useState(true)
  const activeAccount = DEMO_ACCOUNTS.find((account) => account.id === activeAccountId) ?? DEMO_ACCOUNTS[0]

  // Аккаунт, выбранный в чат-боте (или сохранённый с прошлого раза), —
  // повод не показывать форму входа вообще: здороваемся и уводим внутрь.
  // Форма остаётся ровно для случая "в боте демо-юзер не выбран", и с неё
  // же переключаются на другой демо-аккаунт.
  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const greet = (profile: CompanyProfile) => {
      if (cancelled) return
      setWelcome(profile)
      setChecking(false)
      timer = setTimeout(() => navigate('/modes', { replace: true }), WELCOME_DURATION_MS)
    }

    // getMaxUserId() сразу после монтирования обычно ещё null: Bridge
    // заполняет initDataUnsafe асинхронно. Без ожидания мы бы решили, что
    // пользователь неизвестен, и показали форму входа вместо приветствия.
    waitForMaxUserId()
      .then((maxUserId) => {
        if (cancelled) return
        // Вне MAX (обычный браузер) спросить некого — идём по сохранённой сессии.
        if (!maxUserId) {
          if (company) greet(company)
          else setChecking(false)
          return
        }
        return fetchCompanyByMaxUserId(maxUserId).then((found) => {
          if (cancelled) return
          if (found) {
            // Чат-бот — источник правды: там могли переключить компанию
            // через /demo, и сохранённая в localStorage сессия тогда
            // устарела. Сверяемся на каждом заходе, иначе бот и мини-апп
            // показывали бы разные компании.
            if (!company || company.inn !== found.inn) setCompany(found, true)
            greet(found)
            return
          }
          // В боте аккаунт не выбран (или из него вышли) — снимаем и
          // локальную сессию, чтобы не остаться "залогиненными" в одном
          // интерфейсе из двух.
          if (company) setCompany(null)
          setChecking(false)
        })
      })
      .catch(() => {
        // Сеть недоступна — не разлогиниваем, работаем по сохранённой сессии.
        if (cancelled) return
        if (company) greet(company)
        else setChecking(false)
      })

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
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
      setCompany(company, true)
      // Та же связка ИНН↔MAX user_id, что делает InnGate при ручном вводе:
      // без неё бот не узнаёт, какую компанию представляет этот аккаунт, и
      // "мои заявки" в чате оказываются пустыми, хотя в мини-аппе они есть.
      const maxUserId = getMaxUserId()
      if (maxUserId) {
        linkMaxUserToCompany(company.inn, maxUserId).catch(() => {})
      }
      navigate('/modes')
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }

  // Короткая пауза, пока выясняем, выбран ли аккаунт в чат-боте: показываем
  // пустой фирменный фон, а не форму входа, которая иначе мелькнёт.
  if (checking) {
    return <div className="page onboarding mode-select-page welcome-screen" />
  }

  if (welcome) {
    const account = DEMO_ACCOUNTS.find((item) => item.inn === welcome.inn)
    const userName = getMaxUserName()
    return (
      <div className="page onboarding mode-select-page welcome-screen">
        {account && <AccountAvatar account={account} className="welcome-screen__avatar" />}
        <p className="welcome-screen__company">{account?.name ?? welcome.name}</p>
        <p className="welcome-screen__greeting">
          {userName ? (
            <>
              {userName},
              <br />
              с возвращением!
            </>
          ) : (
            'с возвращением!'
          )}
        </p>
      </div>
    )
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
          <span className="account-switcher__trigger-label">
            {accountMenuOpen ? 'скрыть' : 'сменить аккаунт'}
          </span>
          {/* Распорка держит ширину кнопки по самому длинному варианту текста,
              чтобы меню (оно равно ей по ширине) не дёргалось при открытии. */}
          <span className="account-switcher__trigger-sizer" aria-hidden="true">
            сменить аккаунт
          </span>
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
