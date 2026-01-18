import { Outlet, useLocation, Link, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { Calculator, List, LayoutDashboard, LogOut, Languages, Users, Wallet, Briefcase } from "lucide-react"
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
        { icon: Briefcase, label: t('nav.investments') || "Investments", path: "/investments" },
        { icon: LayoutDashboard, label: t('nav.analytics'), path: "/analytics" },
        { icon: Users, label: t('nav.holders'), path: "/holders" },
        { icon: Wallet, label: t('nav.holdersSummary'), path: "/holders-summary" },
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
        <div className="min-h-screen text-foreground flex flex-col overflow-x-hidden">
            <div className="flex-1 flex flex-row">
                {/* Desktop Sidebar Navigation */}
                <nav className="hidden md:block w-64 border-r bg-transparent backdrop-blur-xl shrink-0 sticky top-0 h-screen overflow-y-auto">
                    <div className="h-16 md:h-14 flex items-center px-6 border-b">
                        <div className="flex items-center gap-2 font-bold text-lg">
                            <span className="text-primary">Arbitrage</span>
                            <span className="text-foreground">Ledger</span>
                        </div>
                    </div>
                    <div className="p-4 space-y-2">
                        {navItems.map((item) => {
                            const isActive = location.pathname === item.path
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className="relative block"
                                >
                                    <motion.div
                                        className={cn(
                                            "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                                            isActive
                                                ? "text-primary bg-primary/10 font-semibold"
                                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                        )}
                                        whileHover={{ x: 4 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <item.icon className="h-5 w-5" />
                                        <span>{item.label}</span>
                                    </motion.div>
                                </Link>
                            )
                        })}
                    </div>
                </nav>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Header */}
                    <header className="sticky top-0 z-20 border-b bg-transparent backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
                        <div className="max-w-7xl mx-auto w-full flex h-16 md:h-14 items-center justify-between px-4 md:px-6">
                            {/* Mobile Logo */}
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center gap-2 font-bold text-xl md:hidden"
                            >
                                <span className="text-primary">Arbitrage</span>
                                <span className="text-foreground">Ledger</span>
                            </motion.div>

                            <div className="hidden md:block flex-1" />

                            <div className="flex items-center gap-1">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={toggleLanguage}
                                    className="p-2.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                                    title={i18n.language === 'en' ? 'العربية' : 'English'}
                                >
                                    <Languages className="h-5 w-5" />
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleLogout}
                                    className="p-2.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                                    title={t('common.logout')}
                                >
                                    <LogOut className="h-5 w-5" />
                                </motion.button>
                            </div>
                        </div>
                    </header>

                    {/* Main Content */}
                    <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-6 py-6 pb-24 md:pb-6">
                        <Outlet />
                    </main>
                </div>
            </div>

            {/* Bottom Navigation (Mobile) */}
            <nav className="fixed bottom-0 left-0 right-0 border-t bg-transparent backdrop-blur-xl z-20 pb-safe md:hidden">
                <div className="flex justify-around items-center h-20 px-2">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className="relative flex flex-col items-center justify-center w-full h-full"
                            >
                                <motion.div
                                    className={cn(
                                        "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-2xl transition-all",
                                        isActive
                                            ? "text-primary"
                                            : "text-muted-foreground"
                                    )}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    {/* Active indicator */}
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute inset-0 bg-primary/10 rounded-2xl"
                                            transition={{
                                                type: "spring",
                                                stiffness: 500,
                                                damping: 30
                                            }}
                                        />
                                    )}

                                    <item.icon className={cn(
                                        "h-6 w-6 relative z-10 transition-transform",
                                        isActive && "scale-110"
                                    )} />
                                    <span className={cn(
                                        "text-xs font-medium relative z-10",
                                        isActive && "font-semibold"
                                    )}>
                                        {item.label}
                                    </span>
                                </motion.div>
                            </Link>
                        )
                    })}
                </div>
            </nav>
        </div>
    )
}
