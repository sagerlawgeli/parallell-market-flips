import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { formatCurrency, cn, getDisplayId } from "../lib/utils"
import { useTranslation } from "react-i18next"
import {
    CheckCircle2,
    Building2,
    Banknote,
    ArrowLeft,
    Check,
    Clock,
    TrendingUp
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"

export default function PublicTransactionPage() {
    const { seqId } = useParams<{ seqId: string }>()
    const { t } = useTranslation()
    const [transaction, setTransaction] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchTransaction = async () => {
            if (!seqId) return

            // Parse the numeric part from prefixes like CSH- or BNK-
            const numericId = parseInt(seqId.includes('-') ? seqId.split('-')[1] : seqId)

            if (isNaN(numericId)) {
                setError("Invalid ID")
                setLoading(false)
                return
            }

            const { data, error } = await supabase
                .from('transactions')
                .select('*, holders(name)')
                .eq('seq_id', numericId)
                .single()

            if (error) {
                console.error("Error fetching transaction:", error)
                setError(t('ledger.fetchError') || "Failed to load transaction")
            } else {
                setTransaction(data)
            }
            setLoading(false)
        }

        fetchTransaction()
    }, [seqId, t])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-muted-foreground font-medium">{t('common.loading')}</p>
                </div>
            </div>
        )
    }

    if (error || !transaction) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background px-4">
                <Card className="max-w-md w-full border-red-500/20 bg-red-500/5">
                    <CardContent className="pt-6 text-center space-y-4">
                        <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
                            <Clock className="h-6 w-6 text-red-500" />
                        </div>
                        <h1 className="text-xl font-bold text-red-500">{t('common.noData')}</h1>
                        <p className="text-muted-foreground">{error || "Transaction not found"}</p>
                        <Button variant="outline" className="w-full" onClick={() => window.location.href = '/'}>
                            {t('nav.ledger')}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const displayId = getDisplayId(transaction.seq_id, transaction.payment_method)
    const fiatAmount = transaction.fiat_amount || 0
    const usdtAmount = transaction.usdt_amount || 0
    const fiatRate = transaction.fiat_buy_rate || 0
    const usdtRate = transaction.usdt_sell_rate || 0
    const holderName = transaction.holders?.name

    const cost = fiatAmount * fiatRate
    const returns = usdtAmount * usdtRate
    const profit = returns - cost
    const margin = cost > 0 ? (profit / cost) * 100 : 0
    const status = transaction.status || 'planned'

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'complete': return 'bg-green-500/10 text-green-500'
            case 'in_progress': return 'bg-orange-500/10 text-orange-500'
            default: return 'bg-blue-500/10 text-blue-500'
        }
    }

    return (
        <div className="min-h-screen bg-background text-foreground p-4 sm:p-8 flex items-center justify-center">
            <div className="max-w-2xl w-full space-y-6">
                <div className="flex items-center gap-4 mb-2">
                    <Link to="/" className="p-2 rounded-full hover:bg-muted transition-colors">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">{t('ledger.title')} - {displayId}</h1>
                        <p className="text-muted-foreground text-sm">
                            {new Date(transaction.created_at).toLocaleString('en-US', {
                                dateStyle: 'long',
                                timeStyle: 'short'
                            })}
                        </p>
                    </div>
                </div>

                <Card className="border-none shadow-xl bg-card overflow-hidden">
                    <CardHeader className="border-b border-muted/30 pb-6">
                        <div className="flex justify-between items-start">
                            <div className="space-y-2">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    {transaction.payment_method === 'bank' ? <Building2 className="h-5 w-5 text-primary" /> : <Banknote className="h-5 w-5 text-primary" />}
                                    {t(transaction.payment_method === 'bank' ? 'calculator.bank' : 'calculator.cash')}
                                    <span className="text-muted-foreground font-mono text-sm ml-2">({displayId})</span>
                                </CardTitle>
                                <div className="flex flex-wrap gap-2">
                                    <div className={cn(
                                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
                                        getStatusColor(status)
                                    )}>
                                        {t(`transaction.${status}`)}
                                    </div>
                                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                                        {t('transaction.holder')}: {holderName || t('transaction.noHolder')}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className={cn(
                                    "text-3xl font-bold tracking-tight",
                                    profit >= 0 ? "text-green-500" : "text-red-500"
                                )}>
                                    {profit > 0 ? "+" : ""}{formatCurrency(profit, 'LYD')}
                                </div>
                                <div className="text-xs font-medium text-muted-foreground">
                                    {margin.toFixed(2)}% {t('calculator.margin')}
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="grid grid-cols-2">
                            <div className="p-6 border-r border-muted/30 space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('calculator.cost')}</p>
                                <p className="text-xl font-bold">{formatCurrency(cost, 'LYD')}</p>
                            </div>
                            <div className="p-6 space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('calculator.return')}</p>
                                <p className="text-xl font-bold">{formatCurrency(returns, 'LYD')}</p>
                            </div>
                        </div>

                        <div className="p-6 bg-muted/20 border-t border-muted/30">
                            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-muted-foreground">
                                <TrendingUp className="h-4 w-4" />
                                {t('calculator.exchangeRatesFees')}
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1 text-sm">
                                    <p className="text-muted-foreground">{t('calculator.buy')} 1 {transaction.type || 'GBP'}</p>
                                    <p className="font-medium">{formatCurrency(fiatRate, 'LYD')}</p>
                                </div>
                                <div className="space-y-1 text-sm">
                                    <p className="text-muted-foreground">{t('calculator.sell')} 1 USDT</p>
                                    <p className="font-medium">{formatCurrency(usdtRate, 'LYD')}</p>
                                </div>
                            </div>
                        </div>

                        {/* Progress Steps */}
                        <div className="p-6 space-y-4">
                            <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                                <CheckCircle2 className="h-4 w-4" />
                                {t('transaction.inProgress')}
                            </h3>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { key: 'step_fiat_acquired', label: t('transaction.fiatAcquired') },
                                    { key: 'step_usdt_sold', label: t('transaction.usdtSold') },
                                    { key: 'step_fiat_paid', label: t('transaction.fiatPaid') }
                                ].map((step) => (
                                    <div
                                        key={step.key}
                                        className={cn(
                                            "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all",
                                            transaction[step.key]
                                                ? "bg-green-500/10 border-green-500/20"
                                                : "bg-muted/30 border-muted/30 opacity-50"
                                        )}
                                    >
                                        <div className={cn(
                                            "h-8 w-8 rounded-full flex items-center justify-center",
                                            transaction[step.key] ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                                        )}>
                                            {transaction[step.key] ? <Check className="h-4 w-4" /> : <div className="h-2 w-2 rounded-full bg-current" />}
                                        </div>
                                        <span className="text-[10px] font-bold text-center leading-tight uppercase">
                                            {step.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {transaction.notes && (
                            <div className="p-6 bg-muted/10 border-t border-muted/30">
                                <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase">{t('calculator.notes')}</h3>
                                <p className="text-sm italic leading-relaxed text-muted-foreground whitespace-pre-wrap">
                                    "{transaction.notes}"
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="text-center pt-4">
                    <p className="text-xs text-muted-foreground/60 italic">
                        {t('analytics.monthlyPerfDesc')}
                    </p>
                </div>
            </div>
        </div>
    )
}
