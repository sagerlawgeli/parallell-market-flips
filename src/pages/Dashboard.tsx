import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { formatCurrency, cn } from "../lib/utils"
import { TrendingUp, DollarSign, PieChart, Banknote, Building2, Target, Calendar, Coins, ArrowRightLeft } from "lucide-react"
import { supabase } from "../lib/supabase"
import { toast } from "sonner"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { useTranslation } from "react-i18next"

import { VisibilityFilter } from "../components/VisibilityFilter"
import { PaymentMethodFilter } from "../components/PaymentMethodFilter"
import { DateRangeFilter } from "../components/DateRangeFilter"
import { StatusFilter } from "../components/StatusFilter"
import { useUserRole } from "../hooks/useUserRole"
import { useFilters } from "../contexts/FilterContext"
import { calculateTransactionMetrics } from "../lib/calculations"

export default function DashboardPage() {
    const { t } = useTranslation()
    const { isAdmin, loading: roleLoading } = useUserRole()
    const [loading, setLoading] = useState(true)

    const {
        visibilityFilter, setVisibilityFilter,
        paymentMethodFilter, setPaymentMethodFilter,
        dashboardStatusFilter: statusFilter,
        setDashboardStatusFilter: setStatusFilter,
        datePreset, dateRange, setDateFilter
    } = useFilters()

    const [metrics, setMetrics] = useState({
        totalProfit: 0,
        cashProfit: 0,
        bankProfit: 0,
        totalVolume: 0,
        totalTransactions: 0,
        avgProfit: 0,
        avgMargin: 0,
        totalSterlingPurchased: 0,
        totalUsdtProcessed: 0,
        retainedCapital: 0,
        totalRetainedUSDT: 0
    })
    const [chartData, setChartData] = useState<any[]>([])
    const [includeRetained, setIncludeRetained] = useState(false)
    const [monthlyProgress, setMonthlyProgress] = useState({
        currentMonthProfit: 0,
        target: 18000,
        percentComplete: 0,
        daysRemaining: 0,
        dailyAverageNeeded: 0
    })

    useEffect(() => {
        if (!roleLoading) {
            fetchData()
        }
    }, [visibilityFilter, paymentMethodFilter, statusFilter, dateRange, isAdmin, roleLoading, includeRetained])

    const fetchData = async () => {
        try {
            let query = supabase
                .from('transactions')
                .select('*')

            if (statusFilter === 'active') {
                query = query.in('status', ['planned', 'in_progress'])
            } else if (statusFilter === 'done') {
                query = query.eq('status', 'complete')
            }

            query = query.order('created_at', { ascending: true })

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
                query = query.eq('payment_method', 'cash').eq('is_hybrid', false)
            } else if (paymentMethodFilter === 'bank') {
                query = query.eq('payment_method', 'bank').eq('is_hybrid', false)
            } else if (paymentMethodFilter === 'hybrid') {
                query = query.eq('is_hybrid', true)
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
                    avgMargin: 0,
                    totalSterlingPurchased: 0,
                    totalUsdtProcessed: 0,
                    retainedCapital: 0,
                    totalRetainedUSDT: 0
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

            const processedData = data.map(t => {
                const metrics = calculateTransactionMetrics({
                    fiatAmount: t.fiat_amount,
                    fiatRate: t.fiat_buy_rate,
                    usdtAmount: t.usdt_amount,
                    usdtRate: t.usdt_sell_rate,
                    isHybrid: t.is_hybrid,
                    usdtSellRateBank: t.usdt_sell_rate_bank,
                    isRetained: t.is_retained
                });
                return { ...t, metrics };
            });

            const totalRetainedUSDT = processedData.reduce((sum, t) => sum + (t.is_retained ? t.metrics.surplusUsdt : 0), 0)
            const estimatedRetainedProfit = processedData.reduce((sum, t) => sum + (t.is_retained ? t.metrics.profitLyd : 0), 0)

            let totalProfit = 0
            let cashProfit = 0
            let bankProfit = 0

            processedData.forEach(t => {
                const profitToUse = includeRetained ? t.metrics.profitLyd : t.metrics.realizedProfitLyd
                totalProfit += profitToUse

                if (t.payment_method === 'cash' && !t.is_hybrid) {
                    cashProfit += profitToUse
                } else if (t.payment_method === 'bank' || (t.payment_method === 'cash' && t.is_hybrid)) {
                    bankProfit += profitToUse
                }
            })

            const totalVolume = processedData.reduce((sum, t) => sum + t.metrics.costLyd, 0)
            const totalTransactions = processedData.length
            const avgProfit = totalTransactions > 0 ? totalProfit / totalTransactions : 0

            const totalCost = processedData.reduce((sum, t) => sum + t.metrics.costLyd, 0)
            const avgMargin = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0

            // Volume metrics
            const totalSterlingPurchased = data.reduce((sum, t) => sum + (t.fiat_amount || 0), 0)
            const totalUsdtProcessed = data.reduce((sum, t) => sum + (t.usdt_amount || 0), 0)

            setMetrics({
                totalProfit,
                cashProfit,
                bankProfit,
                totalVolume,
                totalTransactions,
                avgProfit,
                avgMargin,
                totalSterlingPurchased,
                totalUsdtProcessed,
                retainedCapital: estimatedRetainedProfit, // Used for Value? Or we want USDT? let's stick to totalRetainedUSDT for the card.
                totalRetainedUSDT
            })

            const now = new Date()
            const MONTHLY_TARGET = 18000
            const DAILY_TARGET = MONTHLY_TARGET / 30

            let target = MONTHLY_TARGET
            let durationInDays = 30

            if (dateRange.start && dateRange.end) {
                const diffTime = Math.abs(dateRange.end.getTime() - dateRange.start.getTime())
                durationInDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                // Ensure at least 1 day for daily filters like 'today'
                if (durationInDays <= 1) durationInDays = 1
                target = durationInDays * DAILY_TARGET
            } else {
                // All time - calculate months since first transaction or use data range
                if (data.length > 0) {
                    const firstTxn = new Date(data[0].created_at)
                    const diffTime = Math.abs(now.getTime() - firstTxn.getTime())
                    const diffMonths = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30)))
                    target = diffMonths * MONTHLY_TARGET
                }
            }

            const percentComplete = (totalProfit / target) * 100

            let daysRemaining = 0
            if (dateRange.end && dateRange.end > now) {
                const diffTime = Math.abs(dateRange.end.getTime() - now.getTime())
                daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
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
            processedData.forEach(t => {
                const date = new Date(t.created_at)
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

                if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = 0
                }
                const profitToUse = includeRetained ? t.metrics.profitLyd : t.metrics.realizedProfitLyd
                monthlyData[monthKey] += profitToUse
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
        {
            title: t('analytics.totalSterlingPurchased'),
            value: formatCurrency(metrics.totalSterlingPurchased, 'GBP'),
            subtitle: t('analytics.volumePurchased'),
            icon: Coins,
            gradient: "from-cyan-500/20 to-sky-500/20",
            iconColor: "text-cyan-500"
        },
        {
            title: t('analytics.totalUsdtProcessed'),
            value: `${metrics.totalUsdtProcessed.toFixed(2)} USDT`,
            subtitle: t('analytics.volumeProcessed'),
            icon: ArrowRightLeft,
            gradient: "from-indigo-500/20 to-blue-500/20",
            iconColor: "text-indigo-500"
        },
        {
            title: t('analytics.retainedCapital') || "Retained Capital",
            value: `${metrics.totalRetainedUSDT.toFixed(2)} USDT`,
            subtitle: `≈ ${formatCurrency(metrics.retainedCapital, 'LYD')}`,
            icon: Building2, // Reusing icon or better one like Wallet
            gradient: "from-pink-500/20 to-rose-500/20",
            iconColor: "text-pink-500"
        }
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

            <div className="flex justify-end mb-4 sm:mb-0">
                <div className="flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-lg border border-border/50">
                    <span className="text-xs text-muted-foreground">{t('analytics.includeRetained') || "Include Retained (Est.)"}</span>
                    <button
                        onClick={() => setIncludeRetained(!includeRetained)}
                        className={cn(
                            "relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none",
                            includeRetained ? "bg-primary" : "bg-muted-foreground/30"
                        )}
                    >
                        <span
                            className={cn(
                                "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform",
                                includeRetained ? "translate-x-4.5" : "translate-x-0.5"
                            )}
                            style={{ transform: includeRetained ? 'translateX(18px)' : 'translateX(2px)' }}
                        />
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap sm:overflow-x-auto pb-1 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
                <VisibilityFilter value={visibilityFilter} onChange={setVisibilityFilter} />
                <PaymentMethodFilter value={paymentMethodFilter} onChange={setPaymentMethodFilter} />
                <StatusFilter value={statusFilter} onChange={setStatusFilter} />
                <DateRangeFilter
                    value={datePreset}
                    onChange={(preset, range) => {
                        setDateFilter(preset, range)
                    }}
                />
            </div>

            {/* Transaction Count */}
            {!loading && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm text-muted-foreground"
                >
                    {t('ledger.transactionCount', { count: metrics.totalTransactions })}
                </motion.div>
            )}

            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                {statCards.map((stat, index) => (
                    <motion.div
                        key={stat.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <Card className="overflow-hidden border border-white/5 shadow-md hover:shadow-xl transition-all bg-card/50 backdrop-blur-sm">
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
                <Card className="border border-white/5 shadow-md overflow-hidden bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Target className="h-5 w-5 text-primary" />
                                {(() => {
                                    if (datePreset === 'all') return t('analytics.totalProgress')
                                    if (datePreset === 'this_month') return t('filter.thisMonth')
                                    if (datePreset === 'last_month') return t('filter.lastMonth')
                                    return t(`filter.${datePreset}`)
                                })()} {t('analytics.target')}
                            </CardTitle>
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 text-xs font-medium">
                                <Calendar className="h-3.5 w-3.5" />
                                {monthlyProgress.daysRemaining} {t('analytics.daysLeft')}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex flex-col gap-1">
                                <div className="flex justify-between items-end">
                                    <span className="text-xl font-black tracking-tight text-foreground">
                                        {formatCurrency(monthlyProgress.currentMonthProfit, 'LYD')}
                                    </span>
                                    <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/60 mb-1">
                                        / {formatCurrency(monthlyProgress.target, 'LYD')} {t('analytics.target')}
                                    </span>
                                </div>
                            </div>

                            <div className="relative h-4 bg-muted/20 rounded-full overflow-hidden border border-white/5 shadow-inner">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{
                                        width: `${Math.min(monthlyProgress.percentComplete, 100)}%`,
                                    }}
                                    transition={{ duration: 1.5, ease: [0.34, 1.56, 0.64, 1] }}
                                    className={cn(
                                        "h-full rounded-full relative",
                                        monthlyProgress.percentComplete >= 100
                                            ? 'bg-gradient-to-r from-green-500 to-emerald-400 shadow-[0_0_20px_rgba(34,197,94,0.4)]' :
                                            monthlyProgress.percentComplete >= 50
                                                ? 'bg-gradient-to-r from-yellow-500 to-amber-400 shadow-[0_0_20px_rgba(234,179,8,0.3)]' :
                                                'bg-gradient-to-r from-red-500 to-orange-400 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
                                    )}
                                >
                                    {/* Subtle Pulse Overly */}
                                    <motion.div
                                        animate={{ opacity: [0.3, 0.6, 0.3] }}
                                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                        className="absolute inset-0 bg-white/20"
                                    />
                                </motion.div>
                            </div>

                            <div className="flex justify-between items-center text-[9px] sm:text-xs">
                                <div className={cn(
                                    "flex items-center gap-1.5 px-2 py-1 rounded-lg font-bold uppercase tracking-wider",
                                    monthlyProgress.percentComplete >= 100 ? 'bg-green-500/10 text-green-500' :
                                        monthlyProgress.percentComplete >= 50 ? 'bg-yellow-500/10 text-yellow-500' :
                                            'bg-red-500/10 text-red-500'
                                )}>
                                    <TrendingUp className="h-3 w-3" />
                                    {monthlyProgress.percentComplete.toFixed(1)}% {t('analytics.complete')}
                                </div>
                                <div className="text-muted-foreground flex items-center gap-1">
                                    <span className="font-medium text-foreground">
                                        {formatCurrency(Math.max(0, monthlyProgress.target - monthlyProgress.currentMonthProfit), 'LYD')}
                                    </span>
                                    <span className="opacity-60">{t('analytics.remaining')}</span>
                                </div>
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
                <Card className="border border-white/5 shadow-md bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle>{t('analytics.monthlyPerf')}</CardTitle>
                        <p className="text-xs text-muted-foreground">{t('analytics.monthlyPerfDesc')}</p>
                    </CardHeader>
                    <CardContent className="h-[300px] md:h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0.2} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} stroke="#ffffff" opacity={0.05} />
                                <XAxis
                                    dataKey="month"
                                    stroke="#888"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: '#888' }}
                                    dy={10}
                                />
                                <YAxis
                                    stroke="#888"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: '#888' }}
                                    tickFormatter={(val) => `${val / 1000}k`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '16px',
                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                                        backdropFilter: 'blur(8px)'
                                    }}
                                    itemStyle={{ color: '#22c55e', fontWeight: 'bold' }}
                                    cursor={{ fill: 'rgba(255,255,255,0.05)', radius: 10 }}
                                />
                                <ReferenceLine
                                    y={18000}
                                    stroke="#ffffff"
                                    strokeDasharray="4 4"
                                    strokeOpacity={0.2}
                                    label={{
                                        value: t('analytics.target'),
                                        position: 'insideBottomRight',
                                        fill: '#fff',
                                        fontSize: 9,
                                        opacity: 0.5,
                                        offset: 10
                                    }}
                                />
                                <Bar
                                    dataKey="profit"
                                    fill="url(#profitGradient)"
                                    radius={[10, 10, 0, 0]}
                                    name={t('calculator.profit')}
                                    maxBarSize={50}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </motion.div>
        </motion.div>
    )
}
