import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '@maxhub/max-ui'
import { useCompany } from '../context/CompanyContext'
import { createRequest, parseRequestText } from '../lib/b2bApi'
import { getMaxUserId } from '../lib/maxBridge'
import type { B2BRequestDirection, ParsedB2BRequest } from '../types'

type Step = 'input' | 'confirm' | 'done'

export function B2BNewRequestPage() {
  const { company } = useCompany()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('input')
  const [direction, setDirection] = useState<B2BRequestDirection>('demand')
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fields, setFields] = useState<ParsedB2BRequest | null>(null)
  const [notified, setNotified] = useState(0)

  if (!company) {
    return <Navigate to="/b2b" replace />
  }

  const parse = async (event: FormEvent) => {
    event.preventDefault()
    if (!text.trim()) {
      setError(direction === 'demand' ? 'Опишите, что вам нужно' : 'Опишите, что вы можете поставить')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const parsed = await parseRequestText(text.trim(), direction)
      setFields(parsed)
      setStep('confirm')
    } catch {
      setError('Не удалось разобрать текст, попробуйте переформулировать')
    } finally {
      setLoading(false)
    }
  }

  const confirm = async () => {
    if (!fields) return
    if (!fields.item.trim()) {
      setError('Заполните, что требуется')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await createRequest(company.inn, fields, text.trim(), direction, getMaxUserId())
      setNotified(result.notified)
      setStep('done')
    } catch {
      setError('Не удалось создать заявку')
    } finally {
      setLoading(false)
    }
  }

  function updateField<K extends keyof ParsedB2BRequest>(key: K, value: ParsedB2BRequest[K]) {
    setFields((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  if (step === 'done') {
    return (
      <div className="page b2b-new-request b2b-new-request--done">
        <p className="b2b-done__notice">
          {notified > 0
            ? `Уведомили ${notified} подходящих компаний в MAX.`
            : 'Подходящих компаний с известным MAX-аккаунтом пока не нашлось — заявка всё равно видна в общей ленте возможностей.'}
        </p>
        <div className="b2b-done__center">
          <h1 className="b2b-done__title">
            Заявка
            <br />
            создана
          </h1>
          <Button type="button" className="b2b-parse-cta" onClick={() => navigate('/b2b/requests')}>
            к моим заявкам
          </Button>
        </div>
      </div>
    )
  }

  if (step === 'confirm' && fields) {
    return (
      <div className="page b2b-new-request b2b-new-request--confirm">
        <button
          type="button"
          className="company-reviews-list__back"
          aria-label="Назад"
          onClick={() => setStep('input')}
        >
          назад
        </button>

        <form
          className="b2b-request-form"
          onSubmit={(event) => {
            event.preventDefault()
            confirm()
          }}
        >
          <label className="b2b-field">
            <span className="b2b-field__label">{direction === 'supply' ? 'что предлагаете' : 'что требуется'}</span>
            <input
              className="b2b-field__input"
              value={fields.item}
              onChange={(event) => updateField('item', event.target.value)}
            />
          </label>
          <div className="b2b-field-row">
            <label className="b2b-field">
              <span className="b2b-field__label">количество</span>
              <input
                className="b2b-field__input"
                type="text"
                placeholder="например: 20 кг"
                value={fields.qty ?? ''}
                onChange={(event) => updateField('qty', event.target.value || null)}
              />
            </label>
            <label className="b2b-field">
              <span className="b2b-field__label">срок</span>
              <input
                className="b2b-field__input"
                type="date"
                value={fields.deadline ?? ''}
                onChange={(event) => updateField('deadline', event.target.value || null)}
              />
            </label>
          </div>
          <label className="b2b-field">
            <span className="b2b-field__label">бюджет, ₽</span>
            <input
              className="b2b-field__input"
              type="number"
              value={fields.budget ?? ''}
              onChange={(event) =>
                updateField('budget', event.target.value ? Number(event.target.value) : null)
              }
            />
          </label>
          <label className="b2b-field">
            <span className="b2b-field__label">комментарий</span>
            <textarea
              className="b2b-textarea"
              rows={3}
              value={fields.notes ?? ''}
              onChange={(event) => updateField('notes', event.target.value || null)}
            />
          </label>

          {error && <p className="empty">{error}</p>}

          <Button type="submit" className="b2b-parse-cta" loading={loading} disabled={loading}>
            подтвердить заявку
          </Button>
        </form>
      </div>
    )
  }

  return (
    <div className="page b2b-new-request">
      <Button type="button" className="b2b-parse-cta" onClick={() => navigate(-1)}>
        отменить
      </Button>

      <div className="b2b-direction-toggle" role="group" aria-label="Тип заявки">
        <button
          type="button"
          className={`b2b-direction-toggle__option${direction === 'demand' ? ' is-active' : ''}`}
          onClick={() => setDirection('demand')}
        >
          мне нужно
        </button>
        <button
          type="button"
          className={`b2b-direction-toggle__option${direction === 'supply' ? ' is-active' : ''}`}
          onClick={() => setDirection('supply')}
        >
          я даю
        </button>
      </div>

      <form className="b2b-request-form" onSubmit={parse}>
        <textarea
          className={`b2b-textarea b2b-textarea--main b2b-textarea--${direction}${error ? ' inn-input--invalid' : ''}`}
          placeholder={
            direction === 'demand'
              ? 'например: нужно 20 литров молока до завтра'
              : 'например: есть 20 литров молока в наличии, готовы поставлять еженедельно'
          }
          value={text}
          onChange={(event) => {
            setText(event.target.value)
            setError(null)
          }}
          disabled={loading}
        />
        {error && <p className="empty">{error}</p>}
        <Button type="submit" className="b2b-parse-cta" loading={loading} disabled={loading}>
          {loading ? 'Разбираем…' : 'разобрать заявку'}
        </Button>
      </form>
    </div>
  )
}
