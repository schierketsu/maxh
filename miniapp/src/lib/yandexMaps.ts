const SCRIPT_ID = 'yandex-maps-script'
const API_KEY = 'PASTE_YANDEX_MAPS_API_KEY'

declare global {
  interface Window {
    ymaps?: {
      ready: (callback: () => void) => void
      Map: new (
        element: HTMLElement,
        state: Record<string, unknown>,
        options?: Record<string, unknown>,
      ) => YMapsMap
      Placemark: new (
        coords: [number, number],
        properties?: Record<string, unknown>,
        options?: Record<string, unknown>,
      ) => unknown
    }
  }
}

interface YMapsMap {
  geoObjects: { add: (object: unknown) => void }
  options: { set: (key: string, value: unknown) => void }
  destroy: () => void
}

let loadPromise: Promise<void> | null = null

/** Подгружает Yandex Maps JS API (v2.1) один раз и резолвится после ymaps.ready(). */
export function loadYandexMaps(): Promise<void> {
  if (window.ymaps) return Promise.resolve()
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    const onReady = () => window.ymaps?.ready(resolve)
    const existing = document.getElementById(SCRIPT_ID)
    if (existing) {
      existing.addEventListener('load', onReady)
      existing.addEventListener('error', () => reject(new Error('Не удалось загрузить карту')))
      return
    }

    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${API_KEY}&lang=ru_RU`
    script.async = true
    script.onload = onReady
    script.onerror = () => reject(new Error('Не удалось загрузить карту'))
    document.head.appendChild(script)
  })

  return loadPromise
}

export type { YMapsMap }
