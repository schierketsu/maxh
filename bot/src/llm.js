import { fetch as undiciFetch } from 'undici'

const CLOUDRU_URL = 'https://foundation-models.api.cloud.ru/v1/chat/completions'
// GigaChat (обоих размеров, через Cloud.ru) на этом эндпоинте отдаёт битый
// JSON в аргументах function calling — проверено вживую на реальных заявках.
// gpt-oss-120b (открытые веса, тоже хостится на Cloud.ru, не "Внешняя")
// стабильно возвращает валидный JSON с корректным разбиением полей.
const MODEL = 'openai/gpt-oss-120b'

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
        item: {
          type: 'string',
          description:
            'Что именно требуется или предлагается — только название товара/услуги с описательными признаками (сорт, характеристики). БЕЗ количества, цены и срока — они идут в отдельные поля.',
        },
        qty: {
          type: ['string', 'null'],
          description:
            'Количество вместе с единицей измерения одной строкой, если указано явно — например "20 кг", "500 л", "3 палеты", "50 человек", "10 шт". Единицу измерения не выдумывай, если её нет в тексте — оставь только число.',
        },
        deadline: {
          type: ['string', 'null'],
          description:
            'Срок в формате ISO-даты YYYY-MM-DD. Если в тексте есть любое упоминание срока — конкретная дата, "до завтра", "на следующей неделе", "через 3 дня", "срочно" и т.п. — обязательно переведи его в дату относительно сегодняшнего числа и укажи здесь (не в notes). Если срока нет вообще — null.',
        },
        budget: {
          type: ['number', 'null'],
          description:
            'Бюджет или цена в рублях, если указана — только число. Разговорные сокращения переводи в рубли: "2к"/"2 к" = 2000, "15к" = 15000, "1kk"/"1 млн" = 1000000.',
        },
        notes: {
          type: ['string', 'null'],
          description: 'Любые дополнительные детали из текста, не поместившиеся в другие поля',
        },
      },
      required: ['item'],
    },
  },
}

/** Разбирает свободный текст заявки в структурированные поля через Cloud.ru Foundation Models. */
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
