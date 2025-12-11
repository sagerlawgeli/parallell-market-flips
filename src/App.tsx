import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Toaster } from "sonner"
import { useEffect, useState } from "react"
import { supabase } from "./lib/supabase"
import Layout from "./components/Layout"
import CalculatorPage from "./pages/Calculator"
import TransactionListPage from "./pages/TransactionList"
import DashboardPage from "./pages/Dashboard"
import AuthPage from "./pages/Auth"
import HoldersPage from "./pages/Holders"
import HoldersSummaryPage from "./pages/HoldersSummary"
import "./i18n"
import { useTranslation } from "react-i18next"

function App() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { i18n } = useTranslation()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

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
        <Route path="/login" element={!session ? <AuthPage /> : <Navigate to="/" />} />

        <Route path="/" element={session ? <Layout /> : <Navigate to="/login" />}>
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

export default App
