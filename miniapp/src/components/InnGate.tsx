import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input } from '@maxhub/max-ui'
import type { CompanyProfile } from '../types'
import { fetchCompanyByInn, linkMaxUserToCompany } from '../lib/companyApi'
import { getLikedCompanies, setCompanyLiked } from '../lib/likedCompanies'
import { getMaxUserId } from '../lib/maxBridge'
import { useCompany } from '../context/CompanyContext'

interface InnGateProps {
  nextPath: string
}

/** ИНН-форма + список избранных компаний. Общая для гос- и B2B-режимов. */
export function InnGate({ nextPath }: InnGateProps) {
  const { setCompany } = useCompany()
  const navigate = useNavigate()
  const [inn, setInn] = useState('')
  const [invalid, setInvalid] = useState(false)
  const [loading, setLoading] = useState(false)
  const [liked, setLiked] = useState<CompanyProfile[]>(() => getLikedCompanies())
  const [subscribed, setSubscribed] = useState<Record<string, boolean>>({})

  const openCompany = (company: CompanyProfile) => {
    setCompany(company)
    // Запоминаем связку с MAX user_id, чтобы бот и мини-апп узнавали эту
    // компанию друг у друга — например, при следующем открытии мини-аппа
    // из бота через кнопку. Best-effort: не блокируем переход, если не
    // получилось (например, мы не внутри MAX).
    const maxUserId = getMaxUserId()
    if (maxUserId) {
      linkMaxUserToCompany(company.inn, maxUserId).catch(() => {})
    }
    navigate(nextPath)
  }

  const unlikeCompany = (company: CompanyProfile) => {
    setLiked(setCompanyLiked(company, false))
  }

  const toggleSubscribed = (inn: string) => {
    setSubscribed((prev) => ({ ...prev, [inn]: !prev[inn] }))
  }

  const submitInn = async (event: FormEvent) => {
    event.preventDefault()
    setInvalid(false)
    const cleaned = inn.replace(/\D/g, '')
    if (cleaned.length !== 10 && cleaned.length !== 12) {
      setInvalid(true)
      return
    }

    setLoading(true)
    try {
      const found = await fetchCompanyByInn(cleaned)
      if (!found) {
        setInvalid(true)
        return
      }
      openCompany(found)
    } catch {
      setInvalid(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <form className="inn-form" onSubmit={submitInn}>
        <div className="inn-row">
          <Input
            id="inn"
            name="inn"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Введите ИНН"
            value={inn}
            onChange={(e) => {
              setInn(e.target.value)
              setInvalid(false)
            }}
            disabled={loading}
            withClearButton={false}
            innerClassNames={{ container: invalid ? 'inn-input--invalid' : undefined }}
          />
          <Button
            type="submit"
            size="medium"
            loading={loading}
            disabled={loading}
            innerClassNames={{ content: 'inn-submit__label' }}
          >
            {loading ? 'Ищем…' : 'Найти'}
          </Button>
        </div>
      </form>

      {liked.length > 0 && (
        <div className="liked-companies">
          <div className="liked-companies__table">
            {liked.map((company) => (
              <div className="liked-companies__row" key={company.inn}>
                <button
                  type="button"
                  className="liked-companies__name"
                  onClick={() => openCompany(company)}
                >
                  {company.name}
                </button>
                <div className="liked-companies__actions">
                  <button
                    type="button"
                    className="liked-companies__action is-active"
                    aria-label="Убрать из избранного"
                    aria-pressed="true"
                    onClick={() => unlikeCompany(company)}
                  >
                    <span aria-hidden="true">❤️</span>
                  </button>
                  <button
                    type="button"
                    className={`liked-companies__action${subscribed[company.inn] ? ' is-active' : ''}`}
                    aria-label="Уведомления"
                    aria-pressed={Boolean(subscribed[company.inn])}
                    onClick={() => toggleSubscribed(company.inn)}
                  >
                    <span aria-hidden="true">{subscribed[company.inn] ? '🔔' : '🔕'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
