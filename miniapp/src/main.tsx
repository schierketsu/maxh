import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MaxUI } from '@maxhub/max-ui'
import '@maxhub/max-ui/dist/styles.css'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Тема всегда светлая: макеты нарисованы под неё, а при системной
        тёмной @maxhub/max-ui переключал бы свои компоненты, и они
        разъезжались бы с нашими собственными стилями. */}
    <MaxUI colorScheme="light">
      <App />
    </MaxUI>
  </StrictMode>,
)
