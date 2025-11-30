import { Outlet, useLocation, Link } from "react-router-dom"
import { Calculator, List, LayoutDashboard, LogOut } from "lucide-react"
import { cn } from "../lib/utils"

export default function Layout() {
    const location = useLocation()

    const navItems = [
        { icon: Calculator, label: "Calculator", path: "/" },
        { icon: List, label: "Ledger", path: "/ledger" },
        { icon: LayoutDashboard, label: "Analytics", path: "/analytics" },
    ]

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-14 items-center justify-between px-4">
                    <div className="flex items-center gap-2 font-bold text-lg">
                        <span className="text-primary">Arbitrage</span>Ledger
                    </div>
                    <button className="p-2 text-muted-foreground hover:text-foreground">
                        <LogOut className="h-5 w-5" />
                    </button>
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
