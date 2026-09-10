import { useEffect, useRef, useState } from 'react'
import { useCompany } from '../context/CompanyContext'
import { fetchCompanyDetails } from '../lib/companyApi'
import { loadYandexMaps, type YMapInstance } from '../lib/yandexMaps'
import mapCustomization from '../assets/customization.json'

type Status = 'loading' | 'ready' | 'no-company' | 'no-location' | 'error'

// Демо-заявки других компаний — для наглядности сети на карте, координаты
// вокруг центра Москвы рядом с расположением нашей компании.
const FAKE_NEARBY_REQUESTS = [
  { name: 'ООО «Молочный Дом»', need: 'нужна оптовая поставка молока', lat: 55.7423, lon: 37.6156 },
  { name: 'ИП Соколова — овощи и фрукты', need: 'ищем поставщика свежих овощей', lat: 55.7301, lon: 37.5809 },
  { name: 'ООО «Фреш Маркет»', need: 'нужна выпечка для полок магазина', lat: 55.7489, lon: 37.6002 },
  { name: 'ООО «Пекарня №1»', need: 'требуется мука высшего сорта', lat: 55.7275, lon: 37.6234 },
  { name: 'ИП Кузьмин — кейтеринг', need: 'ищем поставщика десертов на мероприятия', lat: 55.7398, lon: 37.5701 },
]

export function MapPage() {
  const { company } = useCompany()
  const mapRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [selected, setSelected] = useState<(typeof FAKE_NEARBY_REQUESTS)[number] | null>(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  useEffect(() => {
    if (!company) {
      setStatus('no-company')
      return
    }

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
          fakeMarkerEl.addEventListener('click', () => setSelected(item))
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

  return (
    <div className="page map-page">
      {status === 'no-company' && (
        <p className="empty">Компания не определена — авторизуйтесь через Госуслуги.</p>
      )}
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
        </div>
      )}
    </div>
  )
}
