import { fetch as undiciFetch } from 'undici'

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-haiku-4-5'

function loadApiKey() {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set')
  return key.trim()
}

const EXTRACT_TOOL = {
  name: 'extract_request',
  description: 'Извлекает структурированную B2B-заявку на закупку из свободного текста на русском языке.',
  input_schema: {
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
}

/** Разбирает свободный текст заявки в структурированные поля через Claude. */
export async function extractRequest(text) {
  const today = new Date().toISOString().slice(0, 10)
  const res = await undiciFetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': loadApiKey(),
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 512,
      tools: [EXTRACT_TOOL],
      tool_choice: { type: 'tool', name: 'extract_request' },
      messages: [
        {
          role: 'user',
          content: `Сегодняшняя дата: ${today}. Разбери B2B-заявку на закупку из текста ниже.\n\n${text}`,
        },
      ],
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    const error = new Error(`Anthropic ${res.status}: ${errText}`)
    error.status = res.status
    throw error
  }

  const json = await res.json()
  const toolUse = json.content?.find((block) => block.type === 'tool_use')
  if (!toolUse) throw new Error('Anthropic response had no tool_use block')
  return toolUse.input
}
