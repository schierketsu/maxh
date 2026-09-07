import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Panel } from '@maxhub/max-ui'
import { fetchCompanyByInn } from '../lib/companyApi'
import { useCompany } from '../context/CompanyContext'

export function OnboardingPage() {
  const { setCompany } = useCompany()
  const navigate = useNavigate()
  const [inn, setInn] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submitInn = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    const cleaned = inn.replace(/\D/g, '')
    if (cleaned.length !== 10 && cleaned.length !== 12) {
      setError('ИНН должен содержать 10 или 12 цифр')
      return
    }

    setLoading(true)
    try {
      const found = await fetchCompanyByInn(cleaned)
      if (!found) {
        setError('Компания не найдена. Проверьте введённый ИНН.')
        return
      }
      setCompany(found)
      navigate('/dashboard')
    } catch {
      setError('Не удалось получить данные. Попробуйте ещё раз чуть позже.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page onboarding">
      <header className="brand-block">
        <h1>Господдержка, которая подходит вашему бизнесу</h1>
      </header>

      <Panel mode="secondary" className="inn-panel">
        <form className="inn-form" onSubmit={submitInn}>
          <div className="inn-row">
            <Input
              id="inn"
              name="inn"
              inputMode="numeric"
              autoComplete="off"
              placeholder="7707083893"
              value={inn}
              onChange={(e) => setInn(e.target.value)}
              disabled={loading}
            />
            <Button type="submit" size="medium" loading={loading} disabled={loading}>
              {loading ? 'Ищем…' : 'Найти'}
            </Button>
          </div>
          {error && <p className="form-error">{error}</p>}
          <p className="form-note">
            Начните с ИНН. Проверим профиль и покажем только релевантные меры.
          </p>
        </form>
      </Panel>


    </div>
  )
}
