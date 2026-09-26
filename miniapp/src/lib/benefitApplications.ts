const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

export interface BenefitApplication {
  id: string
  inn: string
  ownerUserId: number | null
  /** id меры поддержки из data/benefits.ts */
  benefitId: string
  title: string
  /** ISO-дата подачи — от неё отсчитываются этапы обработки. */
  submittedAt: string
}

function userIdParam(userId?: number | null): string {
  return userId != null ? `&userId=${userId}` : ''
}

/** Заявки на меры поддержки этой компании. Хранятся на бэкенде рядом с
 *  B2B-заявками, а не в localStorage: иначе чат-бот не знает о поданной
 *  заявке и сценарий обрывается на границе мини-аппа. */
export async function fetchBenefitApplications(
  inn: string,
  userId?: number | null,
): Promise<BenefitApplication[]> {
  const res = await fetch(`${API_BASE}/api/benefits/applications?inn=${inn}${userIdParam(userId)}`)
  if (!res.ok) throw new Error('Не удалось получить заявки')
  const json = await res.json()
  return json.applications as BenefitApplication[]
}

/** Подать заявку. Бэкенд заодно пишет об этом в чат бота. */
export async function submitBenefitApplication(
  inn: string,
  benefitId: string,
  title: string,
  userId?: number | null,
): Promise<BenefitApplication> {
  const res = await fetch(`${API_BASE}/api/benefits/applications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inn, benefitId, title, userId }),
  })
  if (!res.ok) throw new Error('Не удалось подать заявку')
  const json = await res.json()
  return json.application as BenefitApplication
}

export async function withdrawBenefitApplication(
  inn: string,
  benefitId: string,
  userId?: number | null,
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/api/benefits/applications/${benefitId}?inn=${inn}${userIdParam(userId)}`,
    { method: 'DELETE' },
  )
  if (!res.ok && res.status !== 404) throw new Error('Не удалось отозвать заявку')
}
