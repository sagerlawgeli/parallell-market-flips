import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Toaster } from "sonner"
import { useEffect, useState } from "react"
import { supabase } from "./lib/supabase"
import Layout from "./components/Layout"
import CalculatorPage from "./pages/Calculator"
import TransactionListPage from "./pages/TransactionList"
import DashboardPage from "./pages/Dashboard"
import AuthPage from "./pages/Auth"

function App() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

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
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
