// Те же два демо-аккаунта, что в переключателе мини-аппа
// (miniapp/src/pages/ModeSelectPage.tsx) — реальные ИНН, но с витринным
// именем вместо юрлица из DaData, чтобы бот и мини-апп показывали одних и
// тех же демо-компаний одинаково.
export const DEMO_INNS = ['7724351831', '7717762862']

const DEMO_BRAND_NAMES = {
  '7724351831': 'ВКУСНЫЙ КЕЙК',
  '7717762862': 'КОФЕ ТОЧКА',
}

/** Название без организационно-правовой формы: 'ООО "ТОРТЫ МОСКВА"' →
 *  '"ТОРТЫ МОСКВА"'. В интерфейсе бота юрформа только шумит — компания и так
 *  понятна по названию. Пустой результат откатывается на исходную строку,
 *  чтобы не потерять имя вида просто "ООО". */
export function withoutLegalForm(name) {
  if (name == null) return name
  const stripped = String(name).replace(/^(ООО|ИП|АО|ЗАО|ОАО|ПАО)\s+/i, '').trim()
  return stripped || name
}

export function brandName(inn, fallback) {
  return DEMO_BRAND_NAMES[inn] ?? withoutLegalForm(fallback)
}
