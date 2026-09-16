import { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useCompany } from '../context/CompanyContext'
import { fetchCompanyDetails } from '../lib/companyApi'
import { loadYandexMaps, type YMapInstance } from '../lib/yandexMaps'
import { addContactedRequest, getContactedRequests, removeContactedRequest } from '../lib/contactedRequests'
import mapCustomization from '../assets/customization.json'
import contactIcon from '../assets/icons/icon_contact.png'

type Status = 'loading' | 'ready' | 'no-location' | 'error'

// Демо-заявки других компаний — для наглядности сети на карте, координаты
// вокруг центра Москвы рядом с расположением нашей компании.
const FAKE_NEARBY_REQUESTS = [
  { id: 'milk-house', name: 'ООО «Молочный Дом»', need: 'нужно 500 л молока 3,2% жирности еженедельно, возможна долгосрочная поставка', deadline: 'до 15 сентября', views: 34, lat: 55.7423, lon: 37.6156 },
  { id: 'sokolova-veg', name: 'ИП Соколова — овощи и фрукты', need: 'нужно 200 кг моркови и 150 кг репчатого лука, сорт на выбор, самовывоз', deadline: 'до 20 сентября', views: 18, lat: 55.7301, lon: 37.5809 },
  { id: 'fresh-market', name: 'ООО «Фреш Маркет»', need: 'нужно 80 батонов и 50 багетов ежедневно для полок магазина, оплата еженедельно', deadline: 'до 12 сентября', views: 52, lat: 55.7489, lon: 37.6002 },
  { id: 'bakery-1', name: 'ООО «Пекарня №1»', need: 'требуется 300 кг муки высшего сорта в месяц, рассмотрим бартер на готовую выпечку', deadline: 'до 25 сентября', views: 9, lat: 55.7275, lon: 37.6234 },
  { id: 'kuzmin-catering', name: 'ИП Кузьмин — кейтеринг', need: 'нужно 15 кг десертов ассорти на корпоратив на 20 человек, готовы на бартер кейтеринг-услугами', deadline: 'до 18 сентября', views: 27, lat: 55.7398, lon: 37.5701 },
]

export function MapPage() {
  const { company } = useCompany()
  const mapRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [selected, setSelected] = useState<(typeof FAKE_NEARBY_REQUESTS)[number] | null>(null)
  const [contactedIds, setContactedIds] = useState<Set<string>>(
    () => new Set(getContactedRequests().map((r) => r.id)),
  )

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
        const [details, ymaps3] = await Promise.all([
          fetchCompanyDetails(company.inn),
          loadYandexMaps(),
        ])
        if (cancelled) return

        if (!details?.lat || !details?.lon || !mapRef.current) {
          setStatus('no-location')
          return
        }

        // v3 использует порядок [долгота, широта], в отличие от [широта, долгота] у DaData.
        const coords: [number, number] = [details.lon, details.lat]

        map = new ymaps3.YMap(mapRef.current, {
          location: { center: coords, zoom: 16 },
          mode: 'vector',
        })
        map.addChild(new ymaps3.YMapDefaultSchemeLayer({ customization: mapCustomization }))
        // YMapDefaultFeaturesLayer обязателен — это слой, к которому вообще
        // крепятся любые метки (включая нашу собственную), а не только
        // сторонние организации.
        map.addChild(new ymaps3.YMapDefaultFeaturesLayer({}))

        const markerEl = document.createElement('div')
        markerEl.className = 'map-marker'
        markerEl.title = details.shortName
        map.addChild(new ymaps3.YMapMarker({ coordinates: coords }, markerEl))

        for (const item of FAKE_NEARBY_REQUESTS) {
          const fakeMarkerEl = document.createElement('div')
          fakeMarkerEl.className = 'map-marker map-marker--blue'
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
      setSelected(null)
    }
  }, [company])

  if (!company) {
    return <Navigate to="/" replace />
  }

  const toggleContact = () => {
    if (!selected) return
    const isContacted = contactedIds.has(selected.id)
    if (isContacted) {
      removeContactedRequest(selected.id)
    } else {
      addContactedRequest({
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
          <p className="map-popup__name">{selected.name}</p>
          <p className="map-popup__need">{selected.need}</p>
          <div className="map-popup__footer">
            <p className="map-popup__deadline">{selected.deadline}</p>
            <button
              type="button"
              className={`map-popup__cta${contactedIds.has(selected.id) ? ' is-contacted' : ''}`}
              aria-label={contactedIds.has(selected.id) ? 'Отменить запрос связи' : 'Связаться'}
              onClick={toggleContact}
            >
              <img
                className={`map-popup__cta-icon${contactedIds.has(selected.id) ? ' is-flipped' : ''}`}
                src={contactIcon}
                alt=""
              />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
