// Тот же демо-контент, что в мини-аппе (miniapp/src/data/demoNotifications.ts)
// — витрина раздела уведомлений, не часть настоящего движка заявок
// (b2bStore.js). Дублируется, а не импортируется — бот и мини-апп два
// отдельных Node/Vite-проекта без общего пакета.
export const DEMO_NOTIFICATIONS = {
  '7717762862': ['«ВКУСНЫЙ КЕЙК» попросила связаться с ней'],
}

export function getDemoNotifications(inn) {
  return DEMO_NOTIFICATIONS[inn] ?? []
}
