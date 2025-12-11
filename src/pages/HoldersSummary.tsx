import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { formatCurrency } from "../lib/utils"
import { ChevronDown, ChevronUp, Wallet } from "lucide-react"
import { format } from "date-fns"

interface HolderSummary {
    id: string
    name: string
    totalProfit: number
    transactionCount: number
    transactions: {
        id: string
        type: string
        createdAt: string
        profit: number
        paymentMethod: string
    }[]
}

export default function HoldersSummaryPage() {
    const { t } = useTranslation()
    const [holdersSummary, setHoldersSummary] = useState<HolderSummary[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedHolderId, setExpandedHolderId] = useState<string | null>(null)

    useEffect(() => {
        fetchHoldersSummary()
    }, [])

    const fetchHoldersSummary = async () => {
        try {
            // Fetch all holders
            const { data: holders, error: holdersError } = await supabase
                .from('holders')
                .select('id, name')
                .order('name', { ascending: true })

            if (holdersError) throw holdersError

            // Fetch all transactions with holder_id
            const { data: transactions, error: txError } = await supabase
                .from('transactions')
                .select('id, type, created_at, profit, payment_method, holder_id')
                .not('holder_id', 'is', null)
                .order('created_at', { ascending: false })

            if (txError) throw txError

            // Group transactions by holder
            const summaryMap = new Map<string, HolderSummary>()

            holders.forEach((holder: any) => {
                summaryMap.set(holder.id, {
                    id: holder.id,
                    name: holder.name,
                    totalProfit: 0,
                    transactionCount: 0,
                    transactions: []
                })
            })

            transactions.forEach((tx: any) => {
                if (tx.holder_id && summaryMap.has(tx.holder_id)) {
                    const summary = summaryMap.get(tx.holder_id)!
                    summary.totalProfit += tx.profit || 0
                    summary.transactionCount += 1
                    summary.transactions.push({
                        id: tx.id,
                        type: tx.type,
                        createdAt: format(new Date(tx.created_at), 'MMM d, yyyy'),
                        profit: tx.profit || 0,
                        paymentMethod: tx.payment_method
                    })
                }
            })

            const summaryArray = Array.from(summaryMap.values())
                .sort((a, b) => b.totalProfit - a.totalProfit)

            setHoldersSummary(summaryArray)
        } catch (error) {
            console.error('Error fetching holders summary:', error)
            toast.error(t('holdersSummary.fetchError'))
        } finally {
            setLoading(false)
        }
    }

    const toggleExpand = (holderId: string) => {
        setExpandedHolderId(expandedHolderId === holderId ? null : holderId)
    }

    const totalAllHolders = holdersSummary.reduce((sum, h) => sum + h.totalProfit, 0)

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">{t('holdersSummary.title')}</h1>
                <p className="text-muted-foreground">
                    {t('holdersSummary.subtitle')}
                </p>
            </div>

            {/* Total Summary Card */}
            <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-full bg-primary/10">
                                <Wallet className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">{t('holdersSummary.totalCash')}</p>
                                <p className="text-3xl font-bold">{formatCurrency(totalAllHolders, 'LYD')}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-muted-foreground">{t('holdersSummary.totalHolders')}</p>
                            <p className="text-2xl font-semibold">{holdersSummary.length}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {loading ? (
                <div className="text-center py-10 text-muted-foreground">{t('common.loading')}</div>
            ) : holdersSummary.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">{t('holdersSummary.noData')}</div>
            ) : (
                <div className="grid gap-4">
                    {holdersSummary.map((holder) => (
                        <Card key={holder.id} className="overflow-hidden">
                            <CardHeader
                                className="cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => toggleExpand(holder.id)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <CardTitle className="text-xl">{holder.name}</CardTitle>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {t('holdersSummary.transactionCount', { count: holder.transactionCount })}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-sm text-muted-foreground">{t('holdersSummary.holding')}</p>
                                            <p className={`text-2xl font-bold ${holder.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                {formatCurrency(holder.totalProfit, 'LYD')}
                                            </p>
                                        </div>
                                        {expandedHolderId === holder.id ? (
                                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                                        ) : (
                                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                        )}
                                    </div>
                                </div>
                            </CardHeader>

                            {expandedHolderId === holder.id && holder.transactions.length > 0 && (
                                <CardContent className="pt-0">
                                    <div className="border-t pt-4">
                                        <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                                            {t('holdersSummary.transactions')}
                                        </h4>
                                        <div className="space-y-2">
                                            {holder.transactions.map((tx) => (
                                                <div
                                                    key={tx.id}
                                                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="font-semibold text-sm">{tx.type}</div>
                                                        <div className="text-xs text-muted-foreground">{tx.createdAt}</div>
                                                        <div className="text-xs px-2 py-0.5 rounded bg-background text-muted-foreground uppercase">
                                                            {tx.paymentMethod}
                                                        </div>
                                                    </div>
                                                    <div className={`font-semibold ${tx.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                        {tx.profit > 0 ? '+' : ''}{formatCurrency(tx.profit, 'LYD')}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            )}
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
