import { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useCompany } from '../context/CompanyContext'
import { fetchCompanyDetails } from '../lib/companyApi'
import { fetchOpportunities, fetchRecommendations } from '../lib/b2bApi'
import { brandCompanyName, demoKind, demoRating } from '../lib/demoBranding'
import { getMaxUserId } from '../lib/maxBridge'
import { loadYandexMaps, type YMapInstance } from '../lib/yandexMaps'
import { addContactedRequest, getContactedRequests, removeContactedRequest } from '../lib/contactedRequests'
import mapCustomization from '../assets/customization.json'
import type { B2BRequest } from '../types'

type Status = 'loading' | 'ready' | 'no-location' | 'error'
type RequestDirection = 'demand' | 'supply'

interface MapPin {
  id: string
  name: string
  direction: RequestDirection
  need: string
  deadline: string
  lat: number
  lon: number
}

// Демо-заявки других компаний — для наглядности сети на карте, координаты
// вокруг центра Москвы рядом с расположением нашей компании. Настоящие
// заявки (созданные через "мне что-то нужно") подгружаются отдельно ниже
// и рисуются вместе с этими.
const FAKE_NEARBY_REQUESTS: MapPin[] = [
  { id: 'milk-house', name: 'ООО «Молочный Дом»', direction: 'demand', need: 'нужно 500 л молока 3,2% жирности еженедельно, возможна долгосрочная поставка', deadline: 'до 15 сентября', lat: 55.7423, lon: 37.6156 },
  { id: 'sokolova-veg', name: 'ИП Соколова', direction: 'demand', need: 'нужно 200 кг моркови и 150 кг репчатого лука, сорт на выбор, самовывоз', deadline: 'до 20 сентября', lat: 55.7301, lon: 37.5809 },
  { id: 'fresh-market', name: 'ООО «Фреш Маркет»', direction: 'demand', need: 'нужно 80 батонов и 50 багетов ежедневно для полок магазина, оплата еженедельно', deadline: 'до 12 сентября', lat: 55.7489, lon: 37.6002 },
  { id: 'bakery-1', name: 'ООО «Пекарня №1»', direction: 'demand', need: 'требуется 300 кг муки высшего сорта в месяц, рассмотрим бартер на готовую выпечку', deadline: 'до 25 сентября', lat: 55.7275, lon: 37.6234 },
  { id: 'kuzmin-catering', name: 'ИП Кузьмин — кейтеринг', direction: 'demand', need: 'нужно 15 кг десертов ассорти на корпоратив на 20 человек, готовы на бартер кейтеринг-услугами', deadline: 'до 18 сентября', lat: 55.7398, lon: 37.5701 },
]

/** Сид-демо-заявки несут собственные (вымышленные, но реальные) координаты
 *  прямо в данных (bot/src/b2bStore.js) — используем их напрямую. Настоящие
 *  заявки координат не хранят, геокодируем по ИНН заявителя через тот же
 *  /api/company/:inn/details, что и для своей компании. */
async function geocodeOpportunities(inn: string): Promise<MapPin[]> {
  const opportunities = await fetchOpportunities(inn, getMaxUserId()).catch(() => [])
  const withCoords = await Promise.all(
    opportunities.map(async (request): Promise<MapPin | null> => {
      const base = {
        id: request.id,
        name: brandCompanyName(request.requesterInn, request.requesterName),
        direction: request.direction,
        need: request.qty ? `${request.item}, ${request.qty}` : request.item,
        deadline: request.deadline ?? 'срок не указан',
      }
      if (request.lat != null && request.lon != null) {
        return { ...base, lat: request.lat, lon: request.lon }
      }
      if (!request.requesterInn) return null
      const details = await fetchCompanyDetails(request.requesterInn).catch(() => null)
      if (!details?.lat || !details?.lon) return null
      return { ...base, lat: details.lat, lon: details.lon }
    }),
  )
  return withCoords.filter((pin): pin is MapPin => pin !== null)
}

export function MapPage() {
  const { company } = useCompany()
  const mapRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [selected, setSelected] = useState<MapPin | null>(null)
  const [contactedIds, setContactedIds] = useState<Set<string>>(new Set())
  const [recommendations, setRecommendations] = useState<B2BRequest[]>([])
  const [recommendationsOpen, setRecommendationsOpen] = useState(true)
  const [mapPoints, setMapPoints] = useState<MapPin[]>([])
  const mapInstanceRef = useRef<YMapInstance | null>(null)

  useEffect(() => {
    setContactedIds(company ? new Set(getContactedRequests(company.inn).map((r) => r.id)) : new Set())
  }, [company])

  useEffect(() => {
    if (!company) return
    fetchRecommendations(company.inn, getMaxUserId())
      .then(setRecommendations)
      .catch(() => setRecommendations([]))
  }, [company])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  useEffect(() => {
    if (!company) return

    let cancelled = false
    let map: YMapInstance | null = null

    async function init() {
      if (!company) return
      setStatus('loading')
      try {
        const [details, ymaps3, realPins] = await Promise.all([
          fetchCompanyDetails(company.inn),
          loadYandexMaps(),
          geocodeOpportunities(company.inn),
        ])
        if (cancelled) return

        if (!details?.lat || !details?.lon || !mapRef.current) {
          setStatus('no-location')
          return
        }

        // v3 использует порядок [долгота, широта], в отличие от [широта, долгота] у DaData.
        const coords: [number, number] = [details.lon, details.lat]
        const allPoints = [...FAKE_NEARBY_REQUESTS, ...realPins]
        setMapPoints(allPoints)

        // Реальные заявки геокодируются по настоящему адресу компании в
        // DaData — те могут оказаться в нескольких км от своей компании (в
        // отличие от фейковых точек, специально подобранных рядом). Поэтому
        // открываем карту не фиксированным zoom по своей точке, а bounds,
        // охватывающим все точки сразу — иначе далёкая заявка просто не
        // попадёт в кадр без ручного скролла.
        const lons = [coords[0], ...allPoints.map((p) => p.lon)]
        const lats = [coords[1], ...allPoints.map((p) => p.lat)]
        const PADDING = 0.01
        const bounds: [[number, number], [number, number]] = [
          [Math.min(...lons) - PADDING, Math.min(...lats) - PADDING],
          [Math.max(...lons) + PADDING, Math.max(...lats) + PADDING],
        ]

        map = new ymaps3.YMap(mapRef.current, {
          location: { bounds },
          mode: 'vector',
        })
        mapInstanceRef.current = map
        map.addChild(new ymaps3.YMapDefaultSchemeLayer({ customization: mapCustomization }))
        // YMapDefaultFeaturesLayer обязателен — это слой, к которому вообще
        // крепятся любые метки (включая нашу собственную), а не только
        // сторонние организации.
        map.addChild(new ymaps3.YMapDefaultFeaturesLayer({}))

        const markerEl = document.createElement('div')
        markerEl.className = 'map-marker'
        markerEl.title = details.shortName
        map.addChild(new ymaps3.YMapMarker({ coordinates: coords }, markerEl))

        for (const item of allPoints) {
          const fakeMarkerEl = document.createElement('div')
          fakeMarkerEl.className = `map-marker ${item.direction === 'supply' ? 'map-marker--green' : 'map-marker--blue'}`
          fakeMarkerEl.title = `${item.name} — ${item.need}`
          fakeMarkerEl.addEventListener('click', () => {
            setSelected(item)
            map?.setLocation({
              center: [item.lon, item.lat],
              zoom: 16,
              duration: 600,
              easing: 'ease-in-out',
            })
          })
          map.addChild(
            new ymaps3.YMapMarker({ coordinates: [item.lon, item.lat] }, fakeMarkerEl),
          )
        }

        setStatus('ready')
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[MapPage] init failed:', error)
        if (!cancelled) setStatus('error')
      }
    }

    init()

    return () => {
      cancelled = true
      map?.destroy()
      mapInstanceRef.current = null
      setMapPoints([])
      setSelected(null)
    }
  }, [company])

  /** "перейти" в панели рекомендаций — то же самое, что клик по метке этой
   *  заявки на карте (см. addEventListener в init() выше): закрывает саму
   *  панель рекомендаций, выделяет заявку и приближает к ней карту. Точка
   *  есть почти всегда (сид-заявки несут свои координаты, см.
   *  geocodeOpportunities) — но если её всё же нет (не удалось
   *  геокодировать реальный адрес), панель всё равно закрывается. */
  const goToRecommendation = (request: B2BRequest) => {
    setRecommendationsOpen(false)
    const pin = mapPoints.find((point) => point.id === request.id)
    if (!pin || !mapInstanceRef.current) return
    setSelected(pin)
    mapInstanceRef.current.setLocation({
      center: [pin.lon, pin.lat],
      zoom: 16,
      duration: 600,
      easing: 'ease-in-out',
    })
  }

  if (!company) {
    return <Navigate to="/" replace />
  }

  const toggleContact = () => {
    if (!selected) return
    const isContacted = contactedIds.has(selected.id)
    if (isContacted) {
      removeContactedRequest(company.inn, selected.id)
    } else {
      addContactedRequest(company.inn, {
        id: selected.id,
        name: selected.name,
        need: selected.need,
        deadline: selected.deadline,
      })
    }
    setContactedIds((prev) => {
      const next = new Set(prev)
      if (isContacted) {
        next.delete(selected.id)
      } else {
        next.add(selected.id)
      }
      return next
    })
  }

  return (
    <div className="page map-page">
      {status === 'no-location' && <p className="empty">Не удалось определить адрес компании.</p>}
      {status === 'error' && <p className="empty">Не удалось загрузить карту.</p>}
      <div ref={mapRef} className="map-page__canvas" />

      {recommendations.length > 0 && recommendationsOpen && (
        (() => {
          const top = recommendations[0]
          const name = brandCompanyName(top.requesterInn, top.requesterName)
          const rating = demoRating(top.requesterInn, name)
          const kind = demoKind(top.requesterInn, name)

          return (
            <div className="map-toppanel">
              <button
                type="button"
                className="map-popup__close"
                aria-label="Закрыть"
                onClick={() => setRecommendationsOpen(false)}
              >
                ✕
              </button>

              <div className="map-toppanel__row">
                <div className="map-toppanel__body">
                  <p className="map-toppanel__title">Рекомендуем для вас</p>
                  <p className="map-toppanel__name">{name}</p>
                  <p className="map-toppanel__sub">
                    {[kind, top.item].filter(Boolean).join(' · ')}
                  </p>

                  <div className="map-toppanel__foot">
                    <div className="map-toppanel__meta">
                      {rating != null && (
                        <span className="map-toppanel__metric">
                          <span className="map-toppanel__star" aria-hidden="true">★</span>
                          {rating.toFixed(1).replace('.', ',')}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      className="map-toppanel__cta"
                      onClick={() => goToRecommendation(top)}
                    >
                      перейти
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })()
      )}

      {selected && (
        <div className="map-popup">
          <button
            type="button"
            className="map-popup__close"
            aria-label="Закрыть"
            onClick={() => setSelected(null)}
          >
            ✕
          </button>
          <div className="map-popup__name-row">
            <span className={`requests-table__direction requests-table__direction--${selected.direction}`}>
              {selected.direction === 'supply' ? 'даю' : 'ищу'}
            </span>
            <p className="map-popup__name">{selected.name}</p>
          </div>
          <p className="map-popup__need">{selected.need}</p>
          <div className="map-popup__footer">
            <p className="map-popup__deadline">{selected.deadline}</p>
            <button
              type="button"
              className={`map-popup__cta${contactedIds.has(selected.id) ? ' is-contacted' : ''}`}
              onClick={toggleContact}
            >
              {contactedIds.has(selected.id) ? 'отменить' : 'связаться'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
