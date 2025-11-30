import { Outlet, useLocation, Link, useNavigate } from "react-router-dom"
import { Calculator, List, LayoutDashboard, LogOut, Languages } from "lucide-react"
import { cn } from "../lib/utils"
import { supabase } from "../lib/supabase"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

export default function Layout() {
    const location = useLocation()
    const navigate = useNavigate()
    const { t, i18n } = useTranslation()

    const navItems = [
        { icon: List, label: t('nav.ledger'), path: "/" },
        { icon: Calculator, label: t('nav.calculator'), path: "/calculator" },
        { icon: LayoutDashboard, label: t('nav.analytics'), path: "/analytics" },
    ]

    const handleLogout = async () => {
        if (!confirm("Are you sure you want to logout?")) return

        try {
            const { error } = await supabase.auth.signOut()
            if (error) throw error

            toast.success("Logged out successfully")
            navigate("/login")
        } catch (error) {
            console.error("Error logging out:", error)
            toast.error("Failed to logout")
        }
    }

    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'ar' : 'en'
        i18n.changeLanguage(newLang)
        localStorage.setItem('language', newLang)
    }

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-14 items-center justify-between px-4">
                    <div className="flex items-center gap-2 font-bold text-lg">
                        <span className="text-primary">Arbitrage</span>Ledger
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleLanguage}
                            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                            title={i18n.language === 'en' ? 'العربية' : 'English'}
                        >
                            <Languages className="h-5 w-5" />
                        </button>
                        <button
                            onClick={handleLogout}
                            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                            title={t('common.logout')}
                        >
                            <LogOut className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 container px-4 py-6 pb-20">
                <Outlet />
            </main>

            {/* Bottom Navigation (Mobile) */}
            <nav className="fixed bottom-0 left-0 right-0 border-t bg-background z-10 pb-safe">
                <div className="flex justify-around items-center h-16">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={cn(
                                    "flex flex-col items-center justify-center w-full h-full space-y-1",
                                    isActive
                                        ? "text-primary"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <item.icon className="h-5 w-5" />
                                <span className="text-xs font-medium">{item.label}</span>
                            </Link>
                        )
                    })}
                </div>
            </nav>
        </div>
    )
}
