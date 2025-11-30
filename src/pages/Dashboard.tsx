import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { formatCurrency } from "../lib/utils"
import { TrendingUp, DollarSign, PieChart, Banknote, Building2 } from "lucide-react"
import { supabase } from "../lib/supabase"
import { toast } from "sonner"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

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

            // Prepare Chart Data (Group by Date)
            // Simple grouping by transaction index for now, or date if enough data
            const chartData = data.map((t, index) => ({
                name: `Tx ${index + 1}`,
                profit: t.profit,
                volume: t.fiat_amount * t.fiat_buy_rate,
                date: new Date(t.created_at).toLocaleDateString()
            }))

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

            {/* Charts */}
            <Card>
                <CardHeader>
                    <CardTitle>Profit History</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis dataKey="date" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Line type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={2} activeDot={{ r: 8 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    )
}
