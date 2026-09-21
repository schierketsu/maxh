import { listMyRequests, listOpportunities } from './b2bStore.js'
import { brandName } from './demoBrand.js'
import { getDemoProfile } from './demoProfiles.js'
import { cosineSimilarity, embedTexts, rerank } from './embeddings.js'

const SHORTLIST_SIZE = 6
// И панель "Рекомендуем для вас" в мини-аппе, и пуш в боте показывают
// только одну, самую подходящую рекомендацию за раз.
const RESULTS_SIZE = 1

// requestId → { text, vector }. Текст чужой заявки не меняется после
// создания (редактирования полей нет, только статус/удаление), поэтому
// эмбеддинг можно переиспользовать между вызовами — иначе каждый показ
// панели/пуша заново эмбеддил бы весь список открытых заявок.
const embeddingCache = new Map()

function directionVerb(direction) {
  return direction === 'supply' ? 'предлагает' : 'ищет'
}

function opportunityText(request) {
  return [`${directionVerb(request.direction)}: ${request.item}`, request.qty, request.notes]
    .filter(Boolean)
    .join('. ')
}

/** Текст-запрос "кто мы и что нам интересно" — компания, её открытые заявки
 *  и отзывы (если это демо-компания с отзывами) — эмбеддится и сравнивается
 *  с чужими заявками. */
function buildProfileQuery(linked, ownerUserId) {
  const parts = [brandName(linked.inn, linked.name)]
  if (linked.industry) parts.push(`отрасль: ${linked.industry}`)
  const myRequests = listMyRequests(linked.inn, ownerUserId)
  for (const request of myRequests.slice(0, 5)) {
    parts.push(opportunityText(request))
  }
  const demo = getDemoProfile(linked.inn)
  if (demo?.reviews?.length) {
    for (const review of demo.reviews.slice(0, 5)) {
      parts.push(review.text)
    }
  }
  return parts.join('. ')
}

async function getOpportunityVectors(opportunities) {
  const vectors = new Array(opportunities.length)
  const toEmbed = []
  const toEmbedAt = []

  opportunities.forEach((request, i) => {
    const text = opportunityText(request)
    const cached = embeddingCache.get(request.id)
    if (cached && cached.text === text) {
      vectors[i] = cached.vector
    } else {
      toEmbed.push(text)
      toEmbedAt.push(i)
    }
  })

  if (toEmbed.length > 0) {
    const fresh = await embedTexts(toEmbed)
    fresh.forEach((vector, j) => {
      const i = toEmbedAt[j]
      vectors[i] = vector
      embeddingCache.set(opportunities[i].id, { text: opportunityText(opportunities[i]), vector })
    })
  }

  return vectors
}

/** Персональные рекомендации чужих открытых заявок: эмбеддинг профиля
 *  компании (сама компания + её заявки + отзывы) против эмбеддингов чужих
 *  заявок (косинус) → шортлист → уточнение реранкером. При сбое любого шага
 *  внешнего API откатывается на менее точную, но всегда доступную эвристику
 *  (совпадение ОКВЭД из listOpportunities) — рекомендации не должны пропадать
 *  из-за нестабильного стороннего сервиса. */
export async function recommendOpportunities(linked, ownerUserId) {
  const opportunities = listOpportunities(linked.inn, linked.okved, ownerUserId)
  if (opportunities.length === 0) return []

  try {
    const queryText = buildProfileQuery(linked, ownerUserId)
    const [queryVector, candidateVectors] = await Promise.all([
      embedTexts([queryText]).then((v) => v[0]),
      getOpportunityVectors(opportunities),
    ])

    const shortlist = opportunities
      .map((request, i) => ({ request, score: cosineSimilarity(queryVector, candidateVectors[i]) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, SHORTLIST_SIZE)

    try {
      const reranked = await rerank(
        queryText,
        shortlist.map((item) => opportunityText(item.request)),
      )
      return reranked.slice(0, RESULTS_SIZE).map((item) => shortlist[item.index].request)
    } catch (error) {
      console.error('[recommend] rerank failed, using cosine order:', error.message)
      return shortlist.slice(0, RESULTS_SIZE).map((item) => item.request)
    }
  } catch (error) {
    console.error('[recommend] embeddings failed, using ОКВЭД heuristic:', error.message)
    return opportunities.slice(0, RESULTS_SIZE)
  }
}
