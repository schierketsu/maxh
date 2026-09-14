import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { HomeToolbar } from './components/HomeToolbar'
import { CompanyProvider, useCompany } from './context/CompanyContext'
import { initMaxBridge } from './lib/maxBridge'
import { B2BHomePage } from './pages/B2BHomePage'
import { B2BMyRequestsPage } from './pages/B2BMyRequestsPage'
import { B2BNewRequestPage } from './pages/B2BNewRequestPage'
import { B2BOfferPage } from './pages/B2BOfferPage'
import { ChooseModePage } from './pages/ChooseModePage'
import { DashboardPage } from './pages/DashboardPage'
import { MapPage } from './pages/MapPage'
import { ModeSelectPage } from './pages/ModeSelectPage'
import { ProfilePage } from './pages/ProfilePage'

const NO_TOOLBAR_PATHS = ['/', '/gov/dashboard']

function AppRoutes() {
  const { company } = useCompany()
  const location = useLocation()

  return (
    <>
      <Routes>
        <Route path="/" element={<ModeSelectPage />} />
        <Route path="/modes" element={<ChooseModePage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/profile" element={<ProfilePage />} />

        <Route
          path="/gov"
          element={<Navigate to={company ? '/gov/dashboard' : '/'} replace />}
        />
        <Route path="/gov/dashboard" element={<DashboardPage />} />

        <Route
          path="/b2b"
          element={<Navigate to={company ? '/b2b/home' : '/'} replace />}
        />
        <Route path="/b2b/home" element={<B2BHomePage />} />
        <Route path="/b2b/requests/new" element={<B2BNewRequestPage />} />
        <Route path="/b2b/requests" element={<B2BMyRequestsPage />} />
        <Route path="/b2b/offer/:id" element={<B2BOfferPage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!NO_TOOLBAR_PATHS.includes(location.pathname) && <HomeToolbar />}
    </>
  )
}

export default function App() {
  useEffect(() => {
    initMaxBridge()
  }, [])

  return (
    <CompanyProvider>
      <BrowserRouter>
        <div className="app-shell">
          <AppRoutes />
        </div>
      </BrowserRouter>
    </CompanyProvider>
  )
}
