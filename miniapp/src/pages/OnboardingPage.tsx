import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { demoInns, lookupCompanyByInn } from '../data/companies'
import { useCompany } from '../context/CompanyContext'
import type { CompanyProfile } from '../types'

export function OnboardingPage() {
  const { setCompany } = useCompany()
  const navigate = useNavigate()
  const [inn, setInn] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)

  const submitInn = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    const cleaned = inn.replace(/\D/g, '')
    if (cleaned.length !== 10 && cleaned.length !== 12) {
      setError('ИНН должен содержать 10 или 12 цифр')
      return
    }

    setLoading(true)
    await new Promise((r) => setTimeout(r, 700))

    const found = lookupCompanyByInn(cleaned)
    setLoading(false)

    if (!found) {
      setError('Компания не найдена в демо-базе. Выберите пример или заполните вручную.')
      setManualOpen(true)
      return
    }

    setCompany(found)
    navigate('/dashboard')
  }

  const pickDemo = (demoInn: string) => {
    const found = lookupCompanyByInn(demoInn)
    if (!found) return
    setInn(demoInn)
    setCompany(found)
    navigate('/dashboard')
  }

  const submitManual = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const profile: CompanyProfile = {
      inn: String(data.get('inn') || '0000000000'),
      name: String(data.get('name') || 'Моя компания'),
      ogrn: String(data.get('ogrn') || '—'),
      region: String(data.get('region') || 'Москва'),
      companyType: (data.get('companyType') as CompanyProfile['companyType']) || 'ООО',
      industry: String(data.get('industry') || 'Другое'),
      okved: String(data.get('okved') || '62.01')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      companyAgeMonths: Number(data.get('age') || 12),
      employees: Number(data.get('employees') || 5),
      revenue: Number(data.get('revenue') || 5_000_000),
      isSme: data.get('isSme') === 'on',
      taxRegime: String(data.get('taxRegime') || 'УСН'),
      goals: ['развитие бизнеса'],
    }
    setCompany(profile)
    navigate('/dashboard')
  }

  return (
    <div className="page onboarding">
      <header className="brand-block">
        <p className="brand">Мера</p>
        <h1>AI-агент господдержки для вашего бизнеса</h1>
        <p className="lead">
          Введите ИНН — подберём подходящие субсидии, гранты и льготы с объяснением,
          почему они вам подходят.
        </p>
      </header>

      <form className="inn-form" onSubmit={submitInn}>
        <label htmlFor="inn">ИНН компании / ИП</label>
        <div className="inn-row">
          <input
            id="inn"
            name="inn"
            inputMode="numeric"
            autoComplete="off"
            placeholder="7707083893"
            value={inn}
            onChange={(e) => setInn(e.target.value)}
            disabled={loading}
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Ищем…' : 'Найти'}
          </button>
        </div>
        {error && <p className="form-error">{error}</p>}
      </form>

      <section className="demo-block">
        <p className="meta-label">Демо-компании</p>
        <div className="demo-list">
          {demoInns.map((demoInn) => {
            const c = lookupCompanyByInn(demoInn)!
            return (
              <button
                key={demoInn}
                type="button"
                className="demo-chip"
                onClick={() => pickDemo(demoInn)}
              >
                <strong>{c.name}</strong>
                <span>
                  {demoInn} · {c.region}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <button
        type="button"
        className="linkish"
        onClick={() => setManualOpen((v) => !v)}
      >
        {manualOpen ? 'Скрыть ручной ввод' : 'Заполнить профиль вручную'}
      </button>

      {manualOpen && (
        <form className="manual-form" onSubmit={submitManual}>
          <div className="field-grid">
            <label>
              Название
              <input name="name" required placeholder="ООО «Пример»" />
            </label>
            <label>
              ИНН
              <input name="inn" placeholder="0000000000" defaultValue={inn} />
            </label>
            <label>
              Регион
              <input name="region" defaultValue="Москва" />
            </label>
            <label>
              Форма
              <select name="companyType" defaultValue="ООО">
                <option value="ООО">ООО</option>
                <option value="ИП">ИП</option>
                <option value="АО">АО</option>
              </select>
            </label>
            <label>
              Отрасль
              <input name="industry" defaultValue="IT" />
            </label>
            <label>
              ОКВЭД (через запятую)
              <input name="okved" defaultValue="62.01" />
            </label>
            <label>
              Возраст, мес.
              <input name="age" type="number" defaultValue={24} min={1} />
            </label>
            <label>
              Сотрудники
              <input name="employees" type="number" defaultValue={10} min={1} />
            </label>
            <label>
              Выручка, ₽
              <input name="revenue" type="number" defaultValue={15000000} min={0} />
            </label>
            <label>
              Налоговый режим
              <input name="taxRegime" defaultValue="УСН" />
            </label>
            <label className="checkbox">
              <input name="isSme" type="checkbox" defaultChecked />
              Статус МСП
            </label>
          </div>
          <button type="submit" className="btn btn-primary">
            Создать профиль
          </button>
        </form>
      )}
    </div>
  )
}
