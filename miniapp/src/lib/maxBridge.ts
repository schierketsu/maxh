/** Thin wrapper around MAX Bridge (window.WebApp). Safe no-op outside MAX. */

export interface MaxWebAppUser {
  id: number
  first_name?: string
  last_name?: string
  username?: string
}

export interface MaxWebAppInitDataUnsafe {
  user?: MaxWebAppUser
  query_id?: string
  start_param?: string
}

export interface MaxWebApp {
  initData?: string
  /** Разобранные данные из initData — удобны для чтения, но НЕ годятся для
   *  проверки подлинности (см. документацию MAX Bridge): для этого нужна
   *  HMAC-проверка сырого initData на бэкенде, которую мы сознательно не
   *  делаем в этом MVP — подмена user_id здесь не даёт доступа ни к чему,
   *  кроме чтения СВОЕЙ же компании, привязанной этим же user_id через бота. */
  initDataUnsafe?: MaxWebAppInitDataUnsafe
  platform?: string
  version?: string
  ready?: () => void
  close?: () => void
  BackButton?: {
    show: () => void
    hide: () => void
    onClick: (cb: () => void) => void
    offClick: (cb: () => void) => void
  }
}

declare global {
  interface Window {
    WebApp?: MaxWebApp
  }
}

export function getWebApp(): MaxWebApp | undefined {
  return typeof window !== 'undefined' ? window.WebApp : undefined
}

export function initMaxBridge(): void {
  const wa = getWebApp()
  if (!wa) return
  try {
    wa.ready?.()
  } catch {
    // Bridge may be absent in browser preview
  }
}

export function isInsideMax(): boolean {
  return Boolean(getWebApp()?.initData || getWebApp()?.platform)
}

/** MAX user_id того, кто сейчас открыл мини-приложение (из initDataUnsafe).
 *  null вне MAX или если Bridge ещё не успел проставить данные. */
export function getMaxUserId(): number | null {
  return getWebApp()?.initDataUnsafe?.user?.id ?? null
}
