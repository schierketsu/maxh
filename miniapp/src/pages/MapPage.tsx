import { useEffect, useRef, useState } from 'react'
import { useCompany } from '../context/CompanyContext'
import { fetchCompanyDetails } from '../lib/companyApi'
import { loadYandexMaps, type YMapInstance } from '../lib/yandexMaps'
import mapCustomization from '../assets/customization.json'

type Status = 'loading' | 'ready' | 'no-company' | 'no-location' | 'error'

export function MapPage() {
  const { company } = useCompany()
  const mapRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<Status>('loading')

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
    </div>
  )
}
