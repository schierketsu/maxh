import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useCompany } from '../context/CompanyContext'
import { benefits, govBenefits, type GovBenefit } from '../data/benefits'
import type { ProgramRequirement } from '../types'
import {
  fetchBenefitApplications,
  submitBenefitApplication,
  withdrawBenefitApplication,
} from '../lib/benefitApplications'
import { getMaxUserId } from '../lib/maxBridge'

/** Этапы обработки заявки. Задержки отсчитываются от момента подачи:
 *  первые ступени проходятся быстро, чтобы на демонстрации сразу было видно
 *  движение, а решение остаётся впереди — его выносит человек. */
const STAGES: Array<{ id: string; label: string; note: string; afterMinutes: number | null }> = [
  { id: 'submitted', label: 'Заявка подана', note: 'Мы получили вашу заявку', afterMinutes: 0 },
  { id: 'registered', label: 'Заявка зарегистрирована', note: 'Присвоен номер в реестре', afterMinutes: 1 },
  { id: 'documents', label: 'Проверка документов', note: 'Сверяем данные с ЕГРЮЛ и реестром МСП', afterMinutes: 10 },
  { id: 'review', label: 'Ожидает рассмотрения', note: 'Заявка передана в комиссию', afterMinutes: 60 },
  { id: 'decision', label: 'Решение по заявке', note: 'Комиссия сообщит результат', afterMinutes: null },
]

function formatStageTime(iso: string, afterMinutes: number): string {
  const date = new Date(new Date(iso).getTime() + afterMinutes * 60_000)
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Мера поддержки ищется в обоих каталогах: benefits показывается на главной,
 *  govBenefits — на странице господдержки, id у них не пересекаются. */
function findBenefit(id: string | undefined) {
  if (!id) return null
  const all = [...govBenefits, ...benefits]
  const found = all.find((item) => item.id === id)
  return found ? { benefit: found } : null
}

export function BenefitDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { company } = useCompany()
  const navigate = useNavigate()
  const found = findBenefit(id)
  // Заявка живёт на бэкенде, поэтому её состояние подтягивается запросом,
  // а не читается синхронно при первом рендере.
  const [submittedAt, setSubmittedAt] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const applied = submittedAt != null

  useEffect(() => {
    if (!company || !found) return
    let cancelled = false
    fetchBenefitApplications(company.inn, getMaxUserId())
      .then((items) => {
        if (cancelled) return
        setSubmittedAt(items.find((item) => item.benefitId === found.benefit.id)?.submittedAt ?? null)
      })
      .catch(() => {
        // Сеть недоступна — считаем, что заявки нет; кнопка останется активной
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company?.inn, found?.benefit.id])
  // Этапы наступают по времени, поэтому раз в полминуты пересчитываем «сейчас» —
  // иначе история застыла бы в том виде, в каком открыли страницу.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!applied) return
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [applied])

  if (!company) return <Navigate to="/" replace />
  if (!found) return <Navigate to="/gov/dashboard" replace />

  const { benefit } = found
  // Описание в данных — одна строка с переносами: каждая строка это
  // отдельный пункт условий, поэтому разбиваем и показываем списком.
  const lines = benefit.description.split('\n').filter((line) => line.trim().length > 0)
  // benefits и govBenefits лежат в одном массиве, поэтому сужаем вручную:
  // требования есть только у мер господдержки.
  const requirements: ProgramRequirement[] =
    'requirements' in benefit ? (benefit as GovBenefit).requirements : []

  const toggleApplication = async () => {
    if (pending) return
    setPending(true)
    const maxUserId = getMaxUserId()
    try {
      if (applied) {
        await withdrawBenefitApplication(company.inn, benefit.id, maxUserId)
        setSubmittedAt(null)
      } else {
        const application = await submitBenefitApplication(
          company.inn,
          benefit.id,
          benefit.title,
          maxUserId,
        )
        setSubmittedAt(application.submittedAt)
        setNow(Date.now())
      }
    } catch {
      // Бэкенд не ответил — состояние не меняем, пользователь может повторить
    } finally {
      setPending(false)
    }
  }

  // Этап пройден, если с момента подачи прошло достаточно времени. Первый
  // непройденный — текущий, остальные показываем блёклыми.
  const base = submittedAt ? new Date(submittedAt).getTime() : 0
  const passed = STAGES.map(
    (stage) => stage.afterMinutes != null && now >= base + stage.afterMinutes * 60_000,
  )
  const currentIndex = passed.findIndex((done) => !done)

  return (
    <div className="page benefit-detail">
      <button type="button" className="company-reviews-list__back" onClick={() => navigate(-1)}>
        назад
      </button>

      <div className="benefit-detail__tags">
        {benefit.tags.map((tag) => (
          <span className="benefit-detail__tag" key={tag}>
            {tag}
          </span>
        ))}
      </div>

      <h1 className="benefit-detail__title">{benefit.title}</h1>

      <ul className="benefit-detail__list">
        {lines.map((line) => (
          <li className="benefit-detail__list-item" key={line}>
            {line}
          </li>
        ))}
      </ul>

      {requirements.length > 0 && (
        <>
          <h2 className="benefit-detail__subtitle">Требования</h2>
          <ul className="benefit-detail__list">
            {requirements.map((req) => (
              <li className="benefit-detail__list-item" key={req.id}>
                {req.label}
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="benefit-detail__actions">
        <button
          type="button"
          className={`benefit-detail__cta${applied ? ' is-applied' : ''}`}
          disabled={pending}
          onClick={toggleApplication}
        >
          {pending
            ? 'отправляем…'
            : applied
              ? 'отозвать заявку'
              : 'подать заявку'}
        </button>
        {applied && (
          <p className="benefit-detail__hint">
            Заявка подана — она видна в разделе «заявки» и в чате бота.
          </p>
        )}
      </div>

      {applied && submittedAt && (
        <section className="benefit-status">
          <h2 className="benefit-status__title">Статус заявки</h2>
          <ol className="benefit-status__list">
            {STAGES.map((stage, index) => {
              const isDone = passed[index]
              const isCurrent = index === currentIndex
              const state = isDone ? ' is-done' : isCurrent ? ' is-current' : ''
              return (
                <li className={`benefit-status__step${state}`} key={stage.id}>
                  <span className="benefit-status__dot" aria-hidden="true" />
                  <div className="benefit-status__body">
                    <p className="benefit-status__label">{stage.label}</p>
                    <p className="benefit-status__note">{stage.note}</p>
                    {isDone && stage.afterMinutes != null && (
                      <p className="benefit-status__time">
                        {formatStageTime(submittedAt, stage.afterMinutes)}
                      </p>
                    )}
                    {isCurrent && <p className="benefit-status__time">в работе</p>}
                  </div>
                </li>
              )
            })}
          </ol>
        </section>
      )}
    </div>
  )
}
