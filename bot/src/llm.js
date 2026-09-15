import { fetch as undiciFetch } from 'undici'

const CLOUDRU_URL = 'https://foundation-models.api.cloud.ru/v1/chat/completions'
const MODEL = 'ai-sage/GigaChat3-10B-A1.8B'

function loadApiKey() {
  const key = process.env.CLOUDRU_API_KEY
  if (!key) throw new Error('CLOUDRU_API_KEY is not set')
  return key.trim()
}

const EXTRACT_TOOL = {
  type: 'function',
  function: {
    name: 'extract_request',
    description: 'Извлекает структурированную B2B-заявку на закупку из свободного текста на русском языке.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Короткая понятная формулировка заявки, до 60 символов' },
        item: { type: 'string', description: 'Что именно требуется — товар или услуга' },
        qty: { type: ['number', 'null'], description: 'Количество, если указано явно' },
        region: { type: ['string', 'null'], description: 'Регион или город, если указан' },
        deadline: {
          type: ['string', 'null'],
          description: 'Срок в формате ISO-даты YYYY-MM-DD, если его можно определить из текста и текущей даты',
        },
        budget: { type: ['number', 'null'], description: 'Бюджет в рублях, если указан' },
        notes: {
          type: ['string', 'null'],
          description: 'Любые дополнительные детали из текста, не поместившиеся в другие поля',
        },
      },
      required: ['title', 'item'],
    },
  },
}

/** Разбирает свободный текст заявки в структурированные поля через GigaChat (Cloud.ru Foundation Models). */
export async function extractRequest(text, direction = 'demand') {
  const today = new Date().toISOString().slice(0, 10)
  const intro =
    direction === 'supply'
      ? 'Разбери B2B-предложение поставки (что компания может продать или поставить другим компаниям) из текста ниже.'
      : 'Разбери B2B-заявку на закупку (что компании требуется купить у других компаний) из текста ниже.'

  const res = await undiciFetch(CLOUDRU_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${loadApiKey()}`,
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 512,
      temperature: 0.2,
      messages: [
        {
          role: 'user',
          content: `Сегодняшняя дата: ${today}. ${intro}\n\n${text}`,
        },
      ],
      tools: [EXTRACT_TOOL],
      tool_choice: { type: 'function', function: { name: 'extract_request' } },
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    const error = new Error(`Cloud.ru ${res.status}: ${errText}`)
    error.status = res.status
    throw error
  }

  const json = await res.json()
  const toolCall = json.choices?.[0]?.message?.tool_calls?.[0]
  if (!toolCall) throw new Error('Cloud.ru response had no tool_calls')
  return JSON.parse(toolCall.function.arguments)
}
