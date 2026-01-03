import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { formatCurrency, cn } from "../lib/utils"
import { TrendingUp, DollarSign, PieChart, Banknote, Building2, Target, Calendar } from "lucide-react"
import { supabase } from "../lib/supabase"
import { toast } from "sonner"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { useTranslation } from "react-i18next"
import { startOfMonth, endOfMonth } from "date-fns"
import { VisibilityFilter, type VisibilityFilterValue } from "../components/VisibilityFilter"
import { PaymentMethodFilter, type PaymentMethodFilterValue } from "../components/PaymentMethodFilter"
import { DateRangeFilter, type DateRangePreset } from "../components/DateRangeFilter"
import { useUserRole } from "../hooks/useUserRole"

export default function DashboardPage() {
    const { t } = useTranslation()
    const { isAdmin } = useUserRole()
    const [loading, setLoading] = useState(true)
    const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilterValue>('all')
    const [paymentMethodFilter, setPaymentMethodFilter] = useState<PaymentMethodFilterValue>('all')
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
    const [datePreset, setDatePreset] = useState<DateRangePreset>('this_month')
    const [dateRange, setDateRange] = useState<{ start: Date | null, end: Date | null }>({
        start: startOfMonth(new Date()),
        end: endOfMonth(new Date())
    })

    useEffect(() => {
        fetchData()
    }, [visibilityFilter, paymentMethodFilter, dateRange])

    const fetchData = async () => {
        try {
            let query = supabase
                .from('transactions')
                .select('*')
                .eq('status', 'complete')
                .order('created_at', { ascending: true })

            // Enforce privacy for non-admins
            if (!isAdmin) {
                query = query.eq('is_private', false)
            }

            if (visibilityFilter === 'private') {
                query = query.eq('is_private', true)
            } else if (visibilityFilter === 'public') {
                query = query.eq('is_private', false)
            }

            if (paymentMethodFilter === 'cash') {
                query = query.eq('payment_method', 'cash')
            } else if (paymentMethodFilter === 'bank') {
                query = query.eq('payment_method', 'bank')
            }

            if (dateRange.start) {
                query = query.gte('created_at', dateRange.start.toISOString())
            }
            if (dateRange.end) {
                query = query.lte('created_at', dateRange.end.toISOString())
            }

            const { data, error } = await query

            if (error) throw error

            if (!data || data.length === 0) {
                setMetrics({
                    totalProfit: 0,
                    cashProfit: 0,
                    bankProfit: 0,
                    totalVolume: 0,
                    totalTransactions: 0,
                    avgProfit: 0,
                    avgMargin: 0
                })
                setChartData([])
                setMonthlyProgress(prev => ({
                    ...prev,
                    currentMonthProfit: 0,
                    percentComplete: 0,
                    dailyAverageNeeded: prev.target / (prev.daysRemaining || 30) // Fallback
                }))
                setLoading(false)
                return
            }

            const totalProfit = data.reduce((sum, t) => sum + (t.profit || 0), 0)
            const cashProfit = data.filter(t => t.payment_method === 'cash' && !t.is_hybrid).reduce((sum, t) => sum + (t.profit || 0), 0)
            const bankProfit = data.filter(t => t.payment_method === 'bank' || (t.payment_method === 'cash' && t.is_hybrid)).reduce((sum, t) => sum + (t.profit || 0), 0)
            const totalVolume = data.reduce((sum, t) => sum + (t.fiat_amount * t.fiat_buy_rate), 0)
            const totalTransactions = data.length
            const avgProfit = totalTransactions > 0 ? totalProfit / totalTransactions : 0

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

            const now = new Date()
            const target = 18000 // This target is currently fixed, consider making it dynamic based on date range duration if needed.

            const percentComplete = (totalProfit / target) * 100

            let daysRemaining = 0
            if (dateRange.end && dateRange.end > now) {
                const diffTime = Math.abs(dateRange.end.getTime() - now.getTime())
                daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            } else if (dateRange.end && dateRange.end <= now) {
                daysRemaining = 0 // End date is in the past or today
            } else {
                // If no end date (e.g., 'all time'), or custom range without end,
                // we might want to define a default behavior or show N/A.
                // For now, let's assume 0 if no future end date.
                daysRemaining = 0
            }

            const remaining = Math.max(0, target - totalProfit)
            const dailyAverageNeeded = daysRemaining > 0 ? remaining / daysRemaining : 0

            setMonthlyProgress({
                currentMonthProfit: totalProfit,
                target,
                percentComplete,
                daysRemaining,
                dailyAverageNeeded
            })

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
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center"
                >
                    <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading analytics...</p>
                </motion.div>
            </div>
        )
    }

    const statCards = [
        {
            title: t('analytics.totalProfit'),
            value: formatCurrency(metrics.totalProfit, 'LYD'),
            subtitle: t('analytics.lifetime'),
            icon: TrendingUp,
            gradient: "from-green-500/20 to-emerald-500/20",
            iconColor: "text-green-500"
        },
        {
            title: t('analytics.cashProfit'),
            value: formatCurrency(metrics.cashProfit, 'LYD'),
            subtitle: t('analytics.cashTxns'),
            icon: Banknote,
            gradient: "from-emerald-500/20 to-teal-500/20",
            iconColor: "text-emerald-500"
        },
        {
            title: t('analytics.bankProfit'),
            value: formatCurrency(metrics.bankProfit, 'LYD'),
            subtitle: t('analytics.bankTxns'),
            icon: Building2,
            gradient: "from-blue-500/20 to-cyan-500/20",
            iconColor: "text-blue-500"
        },
        {
            title: t('analytics.avgProfit'),
            value: formatCurrency(metrics.avgProfit, 'LYD'),
            subtitle: t('analytics.perTxn'),
            icon: DollarSign,
            gradient: "from-violet-500/20 to-purple-500/20",
            iconColor: "text-violet-500"
        },
        {
            title: t('analytics.avgMargin'),
            value: `${metrics.avgMargin.toFixed(2)}%`,
            subtitle: t('analytics.roi'),
            icon: PieChart,
            gradient: "from-orange-500/20 to-amber-500/20",
            iconColor: "text-orange-500"
        },
    ]

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            {/* Header */}
            <div className="flex flex-col gap-3">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{t('analytics.title')}</h1>
                <p className="text-muted-foreground text-sm md:text-base">
                    {t('analytics.subtitle')}
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                        <VisibilityFilter value={visibilityFilter} onChange={setVisibilityFilter} />
                        <PaymentMethodFilter value={paymentMethodFilter} onChange={setPaymentMethodFilter} />
                    </div>
                    <div className="text-sm text-muted-foreground whitespace-nowrap">
                        {t(metrics.totalTransactions === 1 ? 'ledger.transactionCountSingular' : 'ledger.transactionCount', { count: metrics.totalTransactions })}
                    </div>
                </div>
                <DateRangeFilter
                    value={datePreset}
                    onChange={(preset, range) => {
                        setDatePreset(preset)
                        setDateRange(range)
                    }}
                />
            </div>

            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                {statCards.map((stat, index) => (
                    <motion.div
                        key={stat.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <Card className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                                <stat.icon className={cn("h-4 w-4", stat.iconColor)} />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stat.value}</div>
                                <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Monthly Progress Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
            >
                <Card className="border-0 shadow-sm overflow-hidden">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Target className="h-5 w-5 text-primary" />
                                {datePreset === 'all' ? t('analytics.totalProgress') : t(`filter.${datePreset}`)} {t('analytics.target')}
                            </CardTitle>
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 text-xs font-medium">
                                <Calendar className="h-3.5 w-3.5" />
                                {monthlyProgress.daysRemaining} {t('analytics.daysLeft')}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            <div className="flex justify-between items-baseline">
                                <span className="text-3xl font-bold">
                                    {formatCurrency(monthlyProgress.currentMonthProfit, 'LYD')}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                    / {formatCurrency(monthlyProgress.target, 'LYD')}
                                </span>
                            </div>
                            <div className="relative h-3 bg-muted/50 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(monthlyProgress.percentComplete, 100)}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className={cn(
                                        "h-full rounded-full",
                                        monthlyProgress.percentComplete >= 100 ? 'bg-green-500' :
                                            monthlyProgress.percentComplete >= 50 ? 'bg-yellow-500' :
                                                'bg-red-500'
                                    )}
                                />
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className={cn(
                                    "font-semibold",
                                    monthlyProgress.percentComplete >= 100 ? 'text-green-500' :
                                        monthlyProgress.percentComplete >= 50 ? 'text-yellow-500' :
                                            'text-red-500'
                                )}>
                                    {monthlyProgress.percentComplete.toFixed(1)}% {t('analytics.complete')}
                                </span>
                                <span className="text-muted-foreground">
                                    {formatCurrency(Math.max(0, monthlyProgress.target - monthlyProgress.currentMonthProfit), 'LYD')} {t('analytics.remaining')}
                                </span>
                            </div>
                        </div>

                        {monthlyProgress.percentComplete < 100 && monthlyProgress.daysRemaining > 0 && (
                            <div className="pt-3 border-t border-border/50">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">{t('analytics.dailyAvg')}</span>
                                    <span className="text-lg font-bold text-primary">
                                        {formatCurrency(monthlyProgress.dailyAverageNeeded, 'LYD')}{t('analytics.perDay')}
                                    </span>
                                </div>
                            </div>
                        )}

                        {monthlyProgress.percentComplete >= 100 && (
                            <div className="pt-3 border-t border-border/50">
                                <div className="flex items-center gap-2 text-green-500">
                                    <TrendingUp className="h-4 w-4" />
                                    <span className="text-sm font-semibold">{t('analytics.targetAchieved')}</span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>

            {/* Charts */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
            >
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle>{t('analytics.monthlyPerf')}</CardTitle>
                        <p className="text-xs text-muted-foreground">{t('analytics.monthlyPerfDesc')}</p>
                    </CardHeader>
                    <CardContent className="h-[300px] md:h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.3} />
                                <XAxis
                                    dataKey="month"
                                    stroke="#888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#1f2937',
                                        border: 'none',
                                        borderRadius: '12px',
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                    }}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)', radius: 8 }}
                                />
                                <ReferenceLine
                                    y={18000}
                                    stroke="#888"
                                    strokeDasharray="3 3"
                                    label={{ value: 'Target', position: 'right', fill: '#888', fontSize: 12 }}
                                />
                                <Bar
                                    dataKey="profit"
                                    fill="#22c55e"
                                    radius={[8, 8, 0, 0]}
                                    name="Profit (LYD)"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </motion.div>
        </motion.div>
    )
}
