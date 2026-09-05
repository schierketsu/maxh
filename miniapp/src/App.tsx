import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { CompanyProvider, useCompany } from './context/CompanyContext'
import { initMaxBridge } from './lib/maxBridge'
import { DashboardPage } from './pages/DashboardPage'
import { OnboardingPage } from './pages/OnboardingPage'

function AppRoutes() {
  const { company } = useCompany()

  return (
    <Routes>
      <Route
        path="/"
        element={company ? <Navigate to="/dashboard" replace /> : <OnboardingPage />}
      />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
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
