import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '@maxhub/max-ui'
import { useCompany } from '../context/CompanyContext'
import { createRequest, parseRequestText } from '../lib/b2bApi'
import type { ParsedB2BRequest } from '../types'

type Step = 'input' | 'confirm' | 'done'

export function B2BNewRequestPage() {
  const { company } = useCompany()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('input')
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
      setError('Опишите, что вам нужно')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const parsed = await parseRequestText(text.trim())
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
    if (!fields.title.trim() || !fields.item.trim()) {
      setError('Заполните название и что требуется')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await createRequest(company.inn, fields, text.trim())
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
      <div className="page b2b-new-request">
        <header className="brand-block">
          <h1>Заявка создана</h1>
        </header>
        <p className="empty">
          {notified > 0
            ? `Уведомили ${notified} подходящих компаний в MAX.`
            : 'Подходящих компаний с известным MAX-аккаунтом пока не нашлось — заявка всё равно видна в общей ленте возможностей.'}
        </p>
        <Button type="button" onClick={() => navigate('/b2b/requests')}>
          К моим заявкам
        </Button>
      </div>
    )
  }

  if (step === 'confirm' && fields) {
    return (
      <div className="page b2b-new-request">
        <header className="brand-block">
          <h1>Проверьте заявку</h1>
        </header>

        <form
          className="b2b-request-form"
          onSubmit={(event) => {
            event.preventDefault()
            confirm()
          }}
        >
          <label className="b2b-field">
            <span className="b2b-field__label">Название</span>
            <input
              className="b2b-field__input"
              value={fields.title}
              onChange={(event) => updateField('title', event.target.value)}
            />
          </label>
          <label className="b2b-field">
            <span className="b2b-field__label">Что требуется</span>
            <input
              className="b2b-field__input"
              value={fields.item}
              onChange={(event) => updateField('item', event.target.value)}
            />
          </label>
          <div className="b2b-field-row">
            <label className="b2b-field">
              <span className="b2b-field__label">Количество</span>
              <input
                className="b2b-field__input"
                type="number"
                value={fields.qty ?? ''}
                onChange={(event) =>
                  updateField('qty', event.target.value ? Number(event.target.value) : null)
                }
              />
            </label>
            <label className="b2b-field">
              <span className="b2b-field__label">Срок</span>
              <input
                className="b2b-field__input"
                type="date"
                value={fields.deadline ?? ''}
                onChange={(event) => updateField('deadline', event.target.value || null)}
              />
            </label>
          </div>
          <div className="b2b-field-row">
            <label className="b2b-field">
              <span className="b2b-field__label">Регион</span>
              <input
                className="b2b-field__input"
                value={fields.region ?? ''}
                onChange={(event) => updateField('region', event.target.value || null)}
              />
            </label>
            <label className="b2b-field">
              <span className="b2b-field__label">Бюджет, ₽</span>
              <input
                className="b2b-field__input"
                type="number"
                value={fields.budget ?? ''}
                onChange={(event) =>
                  updateField('budget', event.target.value ? Number(event.target.value) : null)
                }
              />
            </label>
          </div>
          <label className="b2b-field">
            <span className="b2b-field__label">Дополнительное</span>
            <textarea
              className="b2b-textarea"
              rows={3}
              value={fields.notes ?? ''}
              onChange={(event) => updateField('notes', event.target.value || null)}
            />
          </label>

          {error && <p className="empty">{error}</p>}

          <Button type="submit" loading={loading} disabled={loading}>
            Подтвердить заявку
          </Button>
          <Button type="button" variant="secondary" disabled={loading} onClick={() => setStep('input')}>
            Изменить текст
          </Button>
        </form>
      </div>
    )
  }

  return (
    <div className="page b2b-new-request">
      <header className="brand-block">
        <h1>
          расскажите,
          <br />
          а остальное
          <br />
          сделаем <span className="brand-accent-word">мы</span>
        </h1>
      </header>

      <form className="b2b-request-form" onSubmit={parse}>
        <textarea
          className={`b2b-textarea b2b-textarea--main${error ? ' inn-input--invalid' : ''}`}
          placeholder="например: нужно 20 литров молока до завтра"
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
