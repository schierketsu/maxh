// Демо-уведомления для витрины: показывают, как будет выглядеть раздел
// уведомлений, когда появится реальная реализация (см. ChooseModePage.tsx,
// NotificationsPage.tsx). Односторонняя связка ИНН → уведомления, тот же
// принцип, что у DEMO_PROFILES/benefits — просто зашитые демо-данные, а не
// часть настоящего движка заявок (b2bStore.js).
//
// type: 'connect-request' — уведомление с просьбой связаться, показывает
// кнопки "принять"/"отказать" (NotificationsPage.tsx). 'info' — просто
// текст, без действий.
export interface DemoNotification {
  text: string
  type: 'connect-request' | 'info'
}

export const DEMO_NOTIFICATIONS: Record<string, DemoNotification[]> = {
  '7717762862': [{ text: '«ВКУСНЫЙ КЕЙК» попросила связаться с ней', type: 'connect-request' }],
}

export function getDemoNotifications(inn: string): DemoNotification[] {
  return DEMO_NOTIFICATIONS[inn] ?? []
}
