// Те же два демо-аккаунта, что в переключателе мини-аппа
// (miniapp/src/pages/ModeSelectPage.tsx) — реальные ИНН, но с витринным
// именем вместо юрлица из DaData, чтобы бот и мини-апп показывали одних и
// тех же демо-компаний одинаково.
export const DEMO_INNS = ['7724351831', '7717762862']

const DEMO_BRAND_NAMES = {
  '7724351831': 'ВКУСНЫЙ КЕЙК',
  '7717762862': 'КОФЕ ТОЧКА',
}

export function brandName(inn, fallback) {
  return DEMO_BRAND_NAMES[inn] ?? fallback
}
