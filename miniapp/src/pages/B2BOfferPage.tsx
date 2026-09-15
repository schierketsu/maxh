import { useEffect, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { Button, Input } from '@maxhub/max-ui'
import { InnGate } from '../components/InnGate'
import { useCompany } from '../context/CompanyContext'
import { fetchRequest, submitOffer } from '../lib/b2bApi'
import type { B2BRequest } from '../types'

export function B2BOfferPage() {
  const { id } = useParams<{ id: string }>()
  const { company } = useCompany()
  const [request, setRequest] = useState<B2BRequest | null>(null)
  const [price, setPrice] = useState('')
  const [terms, setTerms] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (!id) return
    fetchRequest(id)
      .then(setRequest)
      .catch(() => setRequest(null))
  }, [id])

  if (!id) {
    return <p className="empty">Заявка не найдена.</p>
  }

  if (!company) {
    return (
      <div className="page onboarding">
        <header className="brand-block">
          <h1>Ваша компания</h1>
        </header>
        <InnGate nextPath={`/b2b/offer/${id}`} />
      </div>
    )
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    try {
      await submitOffer(id, company.inn, price ? Number(price) : null, terms.trim())
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="page b2b-offer">
        <header className="brand-block">
          <h1>Отправлено</h1>
        </header>
        <p className="empty">Предложение передано заявителю.</p>
      </div>
    )
  }

  return (
    <div className="page b2b-offer">
      <header className="brand-block">
        <h1>Предложить цену</h1>
      </header>

      {request && (
        <div className="program-card">
          <h3 className="program-card__title">{request.item}</h3>
          {request.notes && <p className="program-card__desc">{request.notes}</p>}
        </div>
      )}

      <form className="b2b-offer-form" onSubmit={submit}>
        <Input
          inputMode="numeric"
          placeholder="Цена, ₽"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          disabled={loading}
        />
        <Input
          placeholder="Условия (срок, детали)"
          value={terms}
          onChange={(event) => setTerms(event.target.value)}
          disabled={loading}
        />
        <Button type="submit" loading={loading} disabled={loading}>
          Отправить предложение
        </Button>
      </form>
    </div>
  )
}
