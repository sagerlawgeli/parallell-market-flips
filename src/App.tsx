import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Toaster } from "sonner"
import { useEffect } from "react"
import Layout from "./components/Layout"
import CalculatorPage from "./pages/Calculator"
import TransactionListPage from "./pages/TransactionList"
import DashboardPage from "./pages/Dashboard"
import AuthPage from "./pages/Auth"
import HoldersPage from "./pages/Holders"
import HoldersSummaryPage from "./pages/HoldersSummary"
import PublicTransactionPage from "./pages/PublicTransactionPage"
import "./i18n"
import { useTranslation } from "react-i18next"
import { UserProvider, useUserContext } from "./components/UserContext"

function AppContent() {
  const { user, loading } = useUserContext()
  const { i18n } = useTranslation()

  // Update document direction based on language
  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = i18n.language
  }, [i18n.language])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <BrowserRouter>
      <Toaster position="top-center" richColors />
      <Routes>
        <Route path="/login" element={!user ? <AuthPage /> : <Navigate to="/" />} />
        <Route path="/t/:seqId" element={<PublicTransactionPage />} />

        <Route path="/" element={user ? <Layout /> : <Navigate to="/login" />}>
          <Route index element={<TransactionListPage />} />
          <Route path="calculator" element={<CalculatorPage />} />
          <Route path="analytics" element={<DashboardPage />} />
          <Route path="holders" element={<HoldersPage />} />
          <Route path="holders-summary" element={<HoldersSummaryPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

import { FilterProvider } from "./contexts/FilterContext"

function App() {
  return (
    <UserProvider>
      <FilterProvider>
        <AppContent />
      </FilterProvider>
    </UserProvider>
  )
}

export default App
