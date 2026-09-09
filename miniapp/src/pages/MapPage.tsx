import { useEffect, useRef, useState } from 'react'
import { useCompany } from '../context/CompanyContext'
import { fetchCompanyDetails } from '../lib/companyApi'
import { loadYandexMaps, type YMapsMap } from '../lib/yandexMaps'

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
    let map: YMapsMap | null = null

    async function init() {
      if (!company) return
      setStatus('loading')
      try {
        const [details] = await Promise.all([fetchCompanyDetails(company.inn), loadYandexMaps()])
        if (cancelled) return

        if (!details?.lat || !details?.lon || !mapRef.current || !window.ymaps) {
          setStatus('no-location')
          return
        }

        const coords: [number, number] = [details.lat, details.lon]
        map = new window.ymaps.Map(
          mapRef.current,
          {
            center: coords,
            zoom: 16,
            controls: [],
          },
          {
            suppressMapOpenBlock: true,
            copyrightLogoVisible: false,
            copyrightProvidersVisible: false,
            copyrightUaVisible: false,
            yandexMapDisablePoiInteractivity: true,
          },
        )
        map.options.set('openBalloonOnClick', false)

        const placemark = new window.ymaps.Placemark(
          coords,
          { hintContent: details.shortName },
          { preset: 'islands#redDotIcon', openBalloonOnClick: false },
        )
        map.geoObjects.add(placemark)
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
      {status === 'loading' && <p className="empty">Загружаем карту…</p>}
      {status === 'no-company' && (
        <p className="empty">Компания не определена — авторизуйтесь через Госуслуги.</p>
      )}
      {status === 'no-location' && <p className="empty">Не удалось определить адрес компании.</p>}
      {status === 'error' && <p className="empty">Не удалось загрузить карту.</p>}
      <div ref={mapRef} className="map-page__canvas" />
    </div>
  )
}
