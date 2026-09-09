const SCRIPT_ID = 'yandex-maps-script'
const API_KEY = 'PASTE_YANDEX_MAPS_API_KEY'

interface YMapInstance {
  addChild: (child: unknown) => void
  destroy: () => void
}

interface Ymaps3Namespace {
  ready: Promise<void>
  YMap: new (element: HTMLElement, props: Record<string, unknown>) => YMapInstance
  YMapDefaultSchemeLayer: new (props?: Record<string, unknown>) => unknown
  YMapDefaultFeaturesLayer: new (props?: Record<string, unknown>) => unknown
  YMapMarker: new (props: Record<string, unknown>, element: HTMLElement) => unknown
}

declare global {
  interface Window {
    ymaps3?: Ymaps3Namespace
  }
}

let loadPromise: Promise<Ymaps3Namespace> | null = null

/**
 * Подгружает Yandex Maps JS API v3 один раз и резолвится после ymaps3.ready.
 * Ключ ограничен по HTTP referer в кабинете Яндекса — работает с localhost
 * и настоящим доменом продакшена, но НЕ отвечает на запросы без Referer
 * (например, curl без заголовка) — это ожидаемо, не баг.
 */
export function loadYandexMaps(): Promise<Ymaps3Namespace> {
  if (window.ymaps3) return window.ymaps3.ready.then(() => window.ymaps3 as Ymaps3Namespace)
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    const onLoad = () => {
      window.ymaps3?.ready.then(() => resolve(window.ymaps3 as Ymaps3Namespace)).catch(reject)
    }
    const existing = document.getElementById(SCRIPT_ID)
    if (existing) {
      existing.addEventListener('load', onLoad)
      existing.addEventListener('error', () => reject(new Error('Не удалось загрузить карту')))
      return
    }

    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = `https://api-maps.yandex.ru/v3/?apikey=${API_KEY}&lang=ru_RU`
    script.async = true
    script.onload = onLoad
    script.onerror = () => reject(new Error('Не удалось загрузить карту'))
    document.head.appendChild(script)
  })

  return loadPromise
}

export type { YMapInstance }
