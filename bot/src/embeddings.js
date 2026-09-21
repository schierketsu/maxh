import { fetch as undiciFetch } from 'undici'

// bge-m3/bge-reranker-v2-m3 — парные модели: multilingual-эмбеддинг + кросс-
// энкодер реранкер той же серии, хорошо работают с русским текстом.
const API_ROOT = 'https://foundation-models.api.cloud.ru'
const EMBEDDINGS_URL = `${API_ROOT}/v1/embeddings`
// Не /v1/... — контракт /score подтверждён напрямую (пример на Python с
// client.post(path="/score", body={model, encoding_format, text_1, text_2})),
// это не OpenAI-совместимый путь, а отдельный эндпоинт Cloud.ru для scoring/
// rerank-моделей.
const SCORE_URL = `${API_ROOT}/score`
const EMBED_MODEL = 'BAAI/bge-m3'
const RERANK_MODEL = 'BAAI/bge-reranker-v2-m3'

function loadApiKey() {
  const key = process.env.CLOUDRU_API_KEY
  if (!key) throw new Error('CLOUDRU_API_KEY is not set')
  return key.trim()
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${loadApiKey()}`,
  }
}

/** Эмбеддинги для списка текстов (порядок сохраняется). */
export async function embedTexts(texts) {
  const res = await undiciFetch(EMBEDDINGS_URL, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
  })
  if (!res.ok) {
    const errText = await res.text()
    const error = new Error(`Cloud.ru embeddings ${res.status}: ${errText}`)
    error.status = res.status
    throw error
  }
  const json = await res.json()
  return json.data.map((item) => item.embedding)
}

export function cosineSimilarity(a, b) {
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

/** documents[i] → { index: i, score }, отсортировано по убыванию релевантности к query.
 *  POST /score, body {model, encoding_format, text_1: query, text_2: documents} →
 *  {data: [{index, score}, ...]} — контракт Cloud.ru для scoring/rerank-моделей. */
export async function rerank(query, documents) {
  const res = await undiciFetch(SCORE_URL, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      model: RERANK_MODEL,
      encoding_format: 'float',
      text_1: query,
      text_2: documents,
    }),
  })
  if (!res.ok) {
    const errText = await res.text()
    const error = new Error(`Cloud.ru score ${res.status}: ${errText}`)
    error.status = res.status
    throw error
  }
  const json = await res.json()
  return json.data
    .map((item) => ({ index: item.index, score: item.score }))
    .sort((a, b) => b.score - a.score)
}
