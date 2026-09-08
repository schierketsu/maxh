import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '@maxhub/max-ui'
import { useCompany } from '../context/CompanyContext'
import { createRequest } from '../lib/b2bApi'
import { formatMoney } from '../lib/matching'
import type { B2BRequest } from '../types'

export function B2BNewRequestPage() {
  const { company } = useCompany()
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [invalid, setInvalid] = useState(false)
  const [created, setCreated] = useState<{ request: B2BRequest; notified: number } | null>(null)

  if (!company) {
    return <Navigate to="/b2b" replace />
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!text.trim()) {
      setInvalid(true)
      return
    }

    setLoading(true)
    setInvalid(false)
    try {
      const result = await createRequest(company.inn, text.trim())
      setCreated(result)
    } catch {
      setInvalid(true)
    } finally {
      setLoading(false)
    }
  }

  if (created) {
    const { request, notified } = created
    return (
      <div className="page b2b-new-request">
        <header className="brand-block">
          <h1>Заявка создана</h1>
        </header>

        <div className="program-card">
          <div className="program-card__meta">
            <span className="program-card__amount">
              {request.budget ? `до ${formatMoney(request.budget)}` : 'бюджет не указан'}
            </span>
            {request.deadline && <span className="program-card__deadline">до {request.deadline}</span>}
          </div>
          <h3 className="program-card__title">{request.title}</h3>
          <p className="program-card__desc">
            {request.item}
            {request.qty ? ` · ${request.qty} шт.` : ''}
            {request.region ? ` · ${request.region}` : ''}
          </p>
        </div>

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

  return (
    <div className="page b2b-new-request">
      <header className="brand-block">
        <h1>Мне что-то нужно</h1>
      </header>

      <form className="b2b-request-form" onSubmit={submit}>
        <textarea
          className={`b2b-textarea${invalid ? ' inn-input--invalid' : ''}`}
          placeholder="Что вам требуется"
          value={text}
          onChange={(event) => {
            setText(event.target.value)
            setInvalid(false)
          }}
          disabled={loading}
          rows={5}
        />
        <Button type="submit" loading={loading} disabled={loading}>
          {loading ? 'Разбираем…' : 'Создать заявку'}
        </Button>
      </form>
    </div>
  )
}
