import { useState, type CSSProperties } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useCompany } from '../context/CompanyContext'
import cakeIcon from '../assets/icons/icon_cake.png'
import type { CompanyType } from '../types'

const LEGAL_FORM_LABELS: Record<CompanyType, string> = {
  ООО: 'Общество с ограниченной ответственностью',
  ИП: 'Индивидуальный предприниматель',
  АО: 'Акционерное общество',
}

function formatDisplayName(rawName: string): string {
  return rawName.replace(/^(ООО|ИП|АО|ЗАО|ОАО|ПАО)\s+/i, '').replace(/"([^"]+)"/g, '«$1»')
}

const SINCE_YEAR = 2026

const TORTY_MOSKVA_INN = '7724351831'
const TORTY_MOSKVA_NAME = 'ВКУСНЫЙ КЕЙК'
const TORTY_MOSKVA_RATING = 4.7
const AVATAR_COLORS = [
  'var(--palette-blue)',
  'var(--palette-lime)',
  'var(--palette-purple)',
  'var(--palette-red)',
  'var(--palette-pink)',
]

const TORTY_MOSKVA_REVIEWS = [
  { title: 'ООО «КофеПоинт»', initial: 'К', rating: 5, date: '2 сентября 2026', text: 'Отличное качество, стабильно работают уже второй год.' },
  { title: 'ООО «Ивент Групп»', initial: 'И', rating: 5, date: '28 августа 2026', text: 'Работаем по контракту на регулярные поставки — без нареканий.' },
  { title: 'ООО «Технострой»', initial: 'Т', rating: 5, date: '19 августа 2026', text: 'Заказываем на все корпоративные праздники уже третий год.' },
  { title: 'ООО «Медиа Хаб»', initial: 'М', rating: 5, date: '30 июля 2026', text: 'Профессиональный подход, быстро согласовали индивидуальный заказ.' },
  { title: 'ООО «Логистик Про»', initial: 'Л', rating: 4, date: '14 июля 2026', text: 'Вкусно, но упаковка могла бы быть надёжнее для доставки.' },
  { title: 'ИП Кузнецова О.А.', initial: 'К', rating: 5, date: '2 июля 2026', text: 'Заказывала торт на корпоратив, всё было вкусно и вовремя. Рекомендую!' },
  { title: 'ИП Волкова М.С.', initial: 'В', rating: 4, date: '19 июня 2026', text: 'Хороший поставщик, но иногда задерживают доставку на час-два.' },
  { title: 'ИП Петров А.В.', initial: 'П', rating: 5, date: '5 июня 2026', text: 'Лучшие капкейки в городе, коллеги были в восторге.' },
  { title: 'ИП Фомина А.Д.', initial: 'Ф', rating: 4, date: '22 мая 2026', text: 'Хорошее соотношение цены и качества, всё по договору.' },
  { title: 'Виктор Н.', initial: 'В', rating: 5, date: '9 мая 2026', text: 'Оперативно ответили на заявку через Мера и закрыли сделку за день.' },
]
const RATING_STARS = [5, 4, 3, 2, 1]

function ReviewCard({
  item,
  index,
  showStatus = true,
}: {
  item: (typeof TORTY_MOSKVA_REVIEWS)[number]
  index: number
  showStatus?: boolean
}) {
  return (
    <div className="review-card">
      <div className="review-card__head">
        <span
          className="review-card__avatar"
          style={{ background: AVATAR_COLORS[index % AVATAR_COLORS.length] }}
          aria-hidden="true"
        >
          {item.initial}
        </span>
        <div className="review-card__meta">
          <p className="review-card__name">{item.title}</p>
          <p className="review-card__date">{item.date}</p>
        </div>
      </div>
      {showStatus && (
        <p className="review-card__status">
          <span className="review-card__status-stars" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((position) => (
              <span key={position} className={position < item.rating ? 'is-filled' : ''}>
                ★
              </span>
            ))}
          </span>
          <span className="review-card__status-text">Заказ выполнен</span>
        </p>
      )}
      <p className="review-card__text">{item.text}</p>
    </div>
  )
}

export function ProfilePage() {
  const { company } = useCompany()
  const navigate = useNavigate()
  const showReviews = company?.inn === TORTY_MOSKVA_INN
  const [showAllReviews, setShowAllReviews] = useState(false)

  if (!company) {
    return <Navigate to="/" replace />
  }

  const ratingValue = showReviews ? TORTY_MOSKVA_RATING : 0
  const starFillStyle = { '--fill': `${(ratingValue / 5) * 100}%` } as CSSProperties

  return (
    <>
      <div className="company-details">
        <div className="company-details__content">
          <div className="company-details__profile-card">
            <div className="company-details__profile">
              <div className="company-details__header-row">
                <div className="company-details__avatar-wrap">
                  <div className="company-details__avatar">
                    <img className="company-details__avatar-icon" src={cakeIcon} alt="" />
                  </div>
                </div>
                <h1 className="company-details__name">
                  {showReviews ? TORTY_MOSKVA_NAME : formatDisplayName(company.name)}
                </h1>
              </div>

              <div className="company-details__profile-body">
                <p className="company-details__since">На Мера с {SINCE_YEAR} года</p>
                <p className="company-details__since">{LEGAL_FORM_LABELS[company.companyType]}</p>
                <div className="company-details__rating">
                  <span className="company-details__rating-value">
                    {ratingValue.toFixed(1).replace('.', ',')}
                  </span>
                  <span className="company-details__stars" style={starFillStyle} aria-hidden="true">
                    <span className="company-details__stars-bg">★★★★★</span>
                    <span className="company-details__stars-fg">★★★★★</span>
                  </span>
                </div>
              </div>

              <div className="company-details__quick-row">
                {showReviews && (
                  <button
                    type="button"
                    className="company-details__quick-tile company-details__quick-tile--reviews"
                    onClick={() => setShowAllReviews(true)}
                  >
                    <span className="company-details__quick-tile-placeholder">?</span>
                    отзывы
                  </button>
                )}
                <button
                  type="button"
                  className="company-details__quick-tile company-details__quick-tile--requests"
                  onClick={() => navigate('/b2b/requests')}
                >
                  <span className="company-details__quick-tile-placeholder">?</span>
                  заявки
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAllReviews && (
        <div className="company-reviews-list">
          <button
            type="button"
            className="company-reviews-list__back"
            aria-label="Назад"
            onClick={() => setShowAllReviews(false)}
          >
            назад
          </button>
          <div className="company-reviews-list__content">
            <div className="reviews-summary">
              <div className="reviews-summary__top">
                <span className="reviews-summary__value">
                  {TORTY_MOSKVA_RATING.toFixed(1).replace('.', ',')}
                </span>
                <div className="reviews-summary__top-meta">
                  <span className="company-details__stars reviews-summary__stars" style={starFillStyle} aria-hidden="true">
                    <span className="company-details__stars-bg">★★★★★</span>
                    <span className="company-details__stars-fg">★★★★★</span>
                  </span>
                  <p className="reviews-summary__caption">на основании {TORTY_MOSKVA_REVIEWS.length} оценок</p>
                </div>
              </div>

              <div className="reviews-summary__breakdown">
                {RATING_STARS.map((stars) => {
                  const count = TORTY_MOSKVA_REVIEWS.filter((item) => item.rating === stars).length
                  return (
                    <div className="reviews-summary__row" key={stars}>
                      <span className="reviews-summary__row-stars" aria-hidden="true">
                        {[0, 1, 2, 3, 4].map((position) => (
                          <span key={position} className={position < stars ? 'is-filled' : ''}>
                            ★
                          </span>
                        ))}
                      </span>
                      <span className="reviews-summary__bar">
                        <span
                          className="reviews-summary__bar-fill"
                          style={{ width: `${(count / TORTY_MOSKVA_REVIEWS.length) * 100}%` }}
                        />
                      </span>
                    </div>
                  )
                })}
              </div>

              <div className="review-cards">
                {TORTY_MOSKVA_REVIEWS.map((item, index) => (
                  <ReviewCard key={item.title} item={item} index={index} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
