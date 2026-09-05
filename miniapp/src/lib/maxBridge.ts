/** Thin wrapper around MAX Bridge (window.WebApp). Safe no-op outside MAX. */

export interface MaxWebApp {
  initData?: string
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
