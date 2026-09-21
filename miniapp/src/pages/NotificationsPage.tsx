import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useCompany } from '../context/CompanyContext'
import { getDemoNotifications } from '../data/demoNotifications'

type Response = 'accepted' | 'declined'

/** Тот же контейнер-список, что у "Заявки" (.requests-table), но строки —
 *  полный текст уведомления (без обрезки в одну строку, в отличие от
 *  .requests-table__title), плюс кнопки принять/отказать прямо внутри
 *  уведомления с просьбой связаться. */
export function NotificationsPage() {
  const { company } = useCompany()
  const navigate = useNavigate()
  const [responses, setResponses] = useState<Record<number, Response>>({})

  if (!company) {
    return <Navigate to="/" replace />
  }

  const notifications = getDemoNotifications(company.inn)

  return (
    <div className="page notifications-page">
      <button
        type="button"
        className="company-reviews-list__back"
        aria-label="Назад"
        onClick={() => navigate(-1)}
      >
        назад
      </button>

      <div className="section-head">
        <h2>уведомления</h2>
      </div>
      <div className="requests-table">
        {notifications.length === 0 ? (
          <div className="requests-table__row requests-table__row--empty">Пока пусто</div>
        ) : (
          notifications.map((notification, index) => {
            const response = responses[index]
            return (
              <div className="requests-table__item" key={index}>
                <div className="notification-row">
                  <p className="notification-row__text">{notification.text}</p>
                  {notification.type === 'connect-request' &&
                    (response ? (
                      <p className="notification-row__response">
                        {response === 'accepted' ? 'вы приняли запрос' : 'вы отказали'}
                      </p>
                    ) : (
                      <div className="notification-row__actions">
                        <button
                          type="button"
                          className="notification-row__action notification-row__action--accept"
                          onClick={() => setResponses((prev) => ({ ...prev, [index]: 'accepted' }))}
                        >
                          принять
                        </button>
                        <button
                          type="button"
                          className="notification-row__action notification-row__action--decline"
                          onClick={() => setResponses((prev) => ({ ...prev, [index]: 'declined' }))}
                        >
                          отказать
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
