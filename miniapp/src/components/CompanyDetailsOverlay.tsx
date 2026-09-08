import { useEffect, useState } from 'react'
import { fetchCompanyDetails } from '../lib/companyApi'
import { formatMoney } from '../lib/matching'
import type { CompanyDetails } from '../types'

interface CompanyDetailsOverlayProps {
  inn: string | null
  onClose: () => void
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="company-details__row">
      <span className="company-details__label">{label}</span>
      <span className="company-details__value">{value}</span>
    </div>
  )
}

export function CompanyDetailsOverlay({ inn, onClose }: CompanyDetailsOverlayProps) {
  const [details, setDetails] = useState<CompanyDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!inn) {
      setDetails(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    fetchCompanyDetails(inn)
      .then((result) => {
        if (!cancelled) setDetails(result)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [inn])

  return (
    <div className="company-details">
      <button type="button" className="company-details__close" aria-label="Закрыть" onClick={onClose}>
        ✕
      </button>

      <div className="company-details__content">
        {loading && <p className="empty">Загружаем…</p>}

        {!loading && !inn && (
          <p className="empty">Компания не определена — авторизуйтесь через Госуслуги ещё раз.</p>
        )}

        {!loading && inn && !details && <p className="empty">Не удалось получить данные компании.</p>}

        {details && (
          <>
            <h1 className="company-details__title">{details.shortName}</h1>

            <div className="company-details__group">
              <Row label="Полное наименование" value={details.fullName} />
              <Row label="Форма" value={details.opf} />
              <Row label="Статус" value={details.status} />
              <Row label="ИНН" value={details.inn} />
              <Row label="КПП" value={details.kpp} />
              <Row label="ОГРН" value={details.ogrn} />
              <Row label="Дата регистрации" value={details.registrationDate} />
              <Row label="Адрес" value={details.address} />
            </div>

            <div className="company-details__group">
              <Row
                label="ОКВЭД"
                value={details.okved ? `${details.okved}${details.okvedName ? ` — ${details.okvedName}` : ''}` : null}
              />
              <Row label="Руководитель" value={details.managerName} />
              <Row label="Должность" value={details.managerPost} />
              <Row label="Численность" value={details.employeeCount ? `${details.employeeCount} чел.` : null} />
              <Row label="Уставный капитал" value={details.capital ? formatMoney(details.capital) : null} />
            </div>

            <div className="company-details__group">
              <Row label="Налоговый режим" value={details.taxSystem} />
              <Row label="Доход" value={details.income ? formatMoney(details.income) : null} />
              <Row label="Выручка" value={details.revenue ? formatMoney(details.revenue) : null} />
            </div>

            <div className="company-details__group">
              <Row label="Телефон" value={details.phones?.join(', ')} />
              <Row label="Email" value={details.emails?.join(', ')} />
              <Row label="Сайт" value={details.sites?.join(', ')} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
