import { useState, type CSSProperties } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useCompany } from '../context/CompanyContext'
import cakeIcon from '../assets/icons/icon_cake.png'
import coffeeIcon from '../assets/icons/icon_coffe.png'
import reviewsIcon from '../assets/icons/icon_rewies.png'
import requestsIcon from '../assets/icons/icon_zayavki.png'
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

const AVATAR_COLORS = [
  'var(--palette-blue)',
  'var(--palette-lime)',
  'var(--palette-purple)',
  'var(--palette-red)',
  'var(--palette-pink)',
]

interface Review {
  title: string
  initial: string
  rating: number
  date: string
  text: string
}

const CAKE_REVIEWS: Review[] = [
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

const COFFEE_REVIEWS: Review[] = [
  { title: 'ООО «Вектор Диджитал»', initial: 'К', rating: 5, date: '5 сентября 2026', text: 'Заказываем кофе-брейки на все внутренние митапы, всегда вовремя и вкусно.' },
  { title: 'ИП Соловьёва Е.Н.', initial: 'С', rating: 5, date: '30 августа 2026', text: 'Лучший капучино в округе, берём с собой каждое утро для всей команды.' },
  { title: 'ООО «Дизайн Бюро Норд»', initial: 'Д', rating: 5, date: '21 августа 2026', text: 'Стабильное качество зерна, бариста всегда на связи по опту.' },
  { title: 'ИП Мельников Р.А.', initial: 'М', rating: 5, date: '10 августа 2026', text: 'Отличная точка рядом с офисом, оформили абонемент для сотрудников.' },
  { title: 'ООО «Смарт Ритейл»', initial: 'С', rating: 5, date: '2 августа 2026', text: 'Работаем по контракту на кофе для переговорных уже полгода — всё супер.' },
  { title: 'ИП Гаврилов Т.И.', initial: 'Г', rating: 4, date: '25 июля 2026', text: 'Вкусно, но иногда очередь по утрам — стоит расширить точку.' },
  { title: 'ООО «Бизнес Клуб Юг»', initial: 'Б', rating: 4, date: '14 июля 2026', text: 'Заказывали кофе-паузу на конференцию, гостям понравилось.' },
  { title: 'ИП Кравцова О.П.', initial: 'К', rating: 4, date: '30 июня 2026', text: 'Хороший кофе, но хотелось бы больше вариантов без сахара.' },
  { title: 'ООО «Финанс Групп»', initial: 'Ф', rating: 4, date: '18 июня 2026', text: 'Берём на регулярной основе для клиентской зоны, претензий почти нет.' },
  { title: 'ИП Фёдоров А.С.', initial: 'Ф', rating: 4, date: '5 июня 2026', text: 'Приятный персонал, кофе стабильно хорош, доставка иногда задерживается.' },
  { title: 'ООО «Ромашка Сервис»', initial: 'Р', rating: 3, date: '22 мая 2026', text: 'Кофе нормальный, но цена подросла, а качество осталось прежним.' },
  { title: 'ИП Тарасова Н.В.', initial: 'Т', rating: 3, date: '10 мая 2026', text: 'Средне — иногда пересушенная выпечка к кофе.' },
  { title: 'ООО «Альфа Строй»', initial: 'А', rating: 3, date: '28 апреля 2026', text: 'Сработало для разового мероприятия, но на постоянку не перешли.' },
  { title: 'ИП Симонов Д.К.', initial: 'С', rating: 2, date: '15 апреля 2026', text: 'Дважды привозили заказ позже оговорённого времени.' },
  { title: 'ООО «Вектор Лоджистикс»', initial: 'В', rating: 1, date: '2 апреля 2026', text: 'Один раз перепутали заказ полностью, пришлось отменять встречу.' },
]

interface DemoProfile {
  inn: string
  name: string
  rating: number
  reviews: Review[]
  avatarIcon: string
  avatarColor: string
  avatarIconClassName?: string
}

// Демо-аккаунты (переключаются на главном экране) — реальные ИНН, но с
// брендированным именем, аватаром и отзывами вместо настоящих данных.
const DEMO_PROFILES: DemoProfile[] = [
  { inn: '7724351831', name: 'ВКУСНЫЙ КЕЙК', rating: 4.7, reviews: CAKE_REVIEWS, avatarIcon: cakeIcon, avatarColor: 'var(--palette-red)' },
  {
    inn: '7717762862',
    name: 'КОФЕ ТОЧКА',
    rating: 3.8,
    reviews: COFFEE_REVIEWS,
    avatarIcon: coffeeIcon,
    avatarColor: '#2878fd',
    avatarIconClassName: 'company-details__avatar-icon--coffee',
  },
]

const RATING_STARS = [5, 4, 3, 2, 1]

function ReviewCard({
  item,
  index,
  showStatus = true,
}: {
  item: Review
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
  const { company, clearCompany } = useCompany()
  const navigate = useNavigate()
  const demoProfile = DEMO_PROFILES.find((profile) => profile.inn === company?.inn) ?? null
  const [showAllReviews, setShowAllReviews] = useState(false)

  if (!company) {
    return <Navigate to="/" replace />
  }

  const displayName = demoProfile ? demoProfile.name : formatDisplayName(company.name)
  const ratingValue = demoProfile ? demoProfile.rating : 0
  const reviews = demoProfile ? demoProfile.reviews : []
  const starFillStyle = { '--fill': `${(ratingValue / 5) * 100}%` } as CSSProperties

  return (
    <>
      <button type="button" className="company-details__logout" onClick={clearCompany}>
        выйти из аккаунта
      </button>

      <div className="company-details">
        <div className="company-details__content">
          <div className="company-details__profile-card">
            <div className="company-details__profile">
              <div className="company-details__header-row">
                <div className="company-details__avatar-wrap">
                  <div
                    className="company-details__avatar"
                    style={demoProfile ? { background: demoProfile.avatarColor } : undefined}
                  >
                    <img
                      className={['company-details__avatar-icon', demoProfile?.avatarIconClassName]
                        .filter(Boolean)
                        .join(' ')}
                      src={demoProfile ? demoProfile.avatarIcon : cakeIcon}
                      alt=""
                    />
                  </div>
                </div>
                <h1 className="company-details__name">{displayName}</h1>
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
                {reviews.length > 0 && (
                  <button
                    type="button"
                    className="company-details__quick-tile company-details__quick-tile--reviews"
                    onClick={() => setShowAllReviews(true)}
                  >
                    <img className="company-details__quick-tile-icon" src={reviewsIcon} alt="" />
                    отзывы
                  </button>
                )}
                <button
                  type="button"
                  className="company-details__quick-tile company-details__quick-tile--requests"
                  onClick={() => navigate('/b2b/requests')}
                >
                  <img
                    className="company-details__quick-tile-icon company-details__quick-tile-icon--requests"
                    src={requestsIcon}
                    alt=""
                  />
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
                  {ratingValue.toFixed(1).replace('.', ',')}
                </span>
                <div className="reviews-summary__top-meta">
                  <span className="company-details__stars reviews-summary__stars" style={starFillStyle} aria-hidden="true">
                    <span className="company-details__stars-bg">★★★★★</span>
                    <span className="company-details__stars-fg">★★★★★</span>
                  </span>
                  <p className="reviews-summary__caption">на основании {reviews.length} оценок</p>
                </div>
              </div>

              <div className="reviews-summary__breakdown">
                {RATING_STARS.map((stars) => {
                  const count = reviews.filter((item) => item.rating === stars).length
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
                          style={{ width: `${(count / reviews.length) * 100}%` }}
                        />
                      </span>
                    </div>
                  )
                })}
              </div>

              <div className="review-cards">
                {reviews.map((item, index) => (
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
