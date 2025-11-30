import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { formatCurrency } from "../lib/utils"
import { TrendingUp, DollarSign, PieChart, Banknote, Building2, Target, Calendar } from "lucide-react"
import { supabase } from "../lib/supabase"
import { toast } from "sonner"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

export default function DashboardPage() {
    const [loading, setLoading] = useState(true)
    const [metrics, setMetrics] = useState({
        totalProfit: 0,
        cashProfit: 0,
        bankProfit: 0,
        totalVolume: 0,
        totalTransactions: 0,
        avgProfit: 0,
        avgMargin: 0
    })
    const [chartData, setChartData] = useState<any[]>([])
    const [monthlyProgress, setMonthlyProgress] = useState({
        currentMonthProfit: 0,
        target: 18000,
        percentComplete: 0,
        daysRemaining: 0,
        dailyAverageNeeded: 0
    })

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('status', 'complete') // Only count completed transactions
                .order('created_at', { ascending: true }) // Oldest first for charts

            if (error) throw error

            if (!data || data.length === 0) {
                setLoading(false)
                return
            }

            // Calculate Metrics
            const totalProfit = data.reduce((sum, t) => sum + (t.profit || 0), 0)
            const cashProfit = data.filter(t => t.payment_method === 'cash').reduce((sum, t) => sum + (t.profit || 0), 0)
            const bankProfit = data.filter(t => t.payment_method === 'bank').reduce((sum, t) => sum + (t.profit || 0), 0)
            const totalVolume = data.reduce((sum, t) => sum + (t.fiat_amount * t.fiat_buy_rate), 0) // Cost basis volume
            const totalTransactions = data.length
            const avgProfit = totalTransactions > 0 ? totalProfit / totalTransactions : 0

            // Avg Margin (Profit / Cost)
            const totalCost = data.reduce((sum, t) => sum + (t.fiat_amount * t.fiat_buy_rate), 0)
            const avgMargin = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0

            setMetrics({
                totalProfit,
                cashProfit,
                bankProfit,
                totalVolume,
                totalTransactions,
                avgProfit,
                avgMargin
            })

            // Calculate Current Month Progress
            const now = new Date()
            const currentMonth = now.getMonth()
            const currentYear = now.getFullYear()

            const currentMonthTransactions = data.filter(t => {
                const txDate = new Date(t.created_at)
                return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear
            })

            const currentMonthProfit = currentMonthTransactions.reduce((sum, t) => sum + (t.profit || 0), 0)
            const target = 18000
            const percentComplete = (currentMonthProfit / target) * 100

            // Calculate days remaining in month
            const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
            const daysRemaining = lastDayOfMonth - now.getDate()

            // Calculate daily average needed to hit target
            const remaining = Math.max(0, target - currentMonthProfit)
            const dailyAverageNeeded = daysRemaining > 0 ? remaining / daysRemaining : 0

            setMonthlyProgress({
                currentMonthProfit,
                target,
                percentComplete,
                daysRemaining,
                dailyAverageNeeded
            })

            // Group by Month for Chart
            const monthlyData: { [key: string]: number } = {}
            data.forEach(t => {
                const date = new Date(t.created_at)
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

                if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = 0
                }
                monthlyData[monthKey] += t.profit || 0
            })

            const chartData = Object.entries(monthlyData).map(([key, profit]) => {
                const [year, month] = key.split('-')
                const date = new Date(parseInt(year), parseInt(month) - 1)
                return {
                    month: date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
                    profit: profit,
                    target: 18000
                }
            })

            setChartData(chartData)

        } catch (error) {
            console.error("Error fetching analytics:", error)
            toast.error("Failed to load analytics")
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Loading analytics...</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
                <p className="text-muted-foreground">
                    Overview of your performance.
                </p>
            </div>

            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(metrics.totalProfit, 'LYD')}</div>
                        <p className="text-xs text-muted-foreground">Lifetime earnings</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Cash Profit</CardTitle>
                        <Banknote className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(metrics.cashProfit, 'LYD')}</div>
                        <p className="text-xs text-muted-foreground">Cash transactions</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Bank Profit</CardTitle>
                        <Building2 className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(metrics.bankProfit, 'LYD')}</div>
                        <p className="text-xs text-muted-foreground">Bank transactions</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg. Profit / Txn</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(metrics.avgProfit, 'LYD')}</div>
                        <p className="text-xs text-muted-foreground">Per transaction</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg. Margin</CardTitle>
                        <PieChart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.avgMargin.toFixed(2)}%</div>
                        <p className="text-xs text-muted-foreground">Return on investment</p>
                    </CardContent>
                </Card>
            </div>

            {/* Monthly Progress Card */}
            <Card className="border-primary/20">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5 text-primary" />
                            Monthly Target Progress
                        </CardTitle>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {monthlyProgress.daysRemaining} days left
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Progress Bar */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-baseline">
                            <span className="text-2xl font-bold">
                                {formatCurrency(monthlyProgress.currentMonthProfit, 'LYD')}
                            </span>
                            <span className="text-sm text-muted-foreground">
                                / {formatCurrency(monthlyProgress.target, 'LYD')}
                            </span>
                        </div>
                        <div className="relative h-4 bg-muted rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-500 ${monthlyProgress.percentComplete >= 100 ? 'bg-green-500' :
                                    monthlyProgress.percentComplete >= 50 ? 'bg-yellow-500' :
                                        'bg-red-500'
                                    }`}
                                style={{ width: `${Math.min(monthlyProgress.percentComplete, 100)}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className={`font-medium ${monthlyProgress.percentComplete >= 100 ? 'text-green-500' :
                                monthlyProgress.percentComplete >= 50 ? 'text-yellow-500' :
                                    'text-red-500'
                                }`}>
                                {monthlyProgress.percentComplete.toFixed(1)}% Complete
                            </span>
                            <span className="text-muted-foreground">
                                {formatCurrency(Math.max(0, monthlyProgress.target - monthlyProgress.currentMonthProfit), 'LYD')} remaining
                            </span>
                        </div>
                    </div>

                    {/* Daily Average Needed */}
                    {monthlyProgress.percentComplete < 100 && monthlyProgress.daysRemaining > 0 && (
                        <div className="pt-3 border-t border-border/50">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Daily avg. needed:</span>
                                <span className="text-lg font-bold text-primary">
                                    {formatCurrency(monthlyProgress.dailyAverageNeeded, 'LYD')}/day
                                </span>
                            </div>
                        </div>
                    )}

                    {monthlyProgress.percentComplete >= 100 && (
                        <div className="pt-3 border-t border-border/50">
                            <div className="flex items-center gap-2 text-green-500">
                                <TrendingUp className="h-4 w-4" />
                                <span className="text-sm font-medium">Target achieved! 🎉</span>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Charts */}
            <Card>
                <CardHeader>
                    <CardTitle>Monthly Performance</CardTitle>
                    <p className="text-xs text-muted-foreground">Profit by month vs 18,000 LYD target</p>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis dataKey="month" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                            />
                            <ReferenceLine y={18000} stroke="#888" strokeDasharray="3 3" label={{ value: 'Target', position: 'right', fill: '#888', fontSize: 12 }} />
                            <Bar
                                dataKey="profit"
                                fill="#22c55e"
                                radius={[4, 4, 0, 0]}
                                name="Profit (LYD)"
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    )
}
