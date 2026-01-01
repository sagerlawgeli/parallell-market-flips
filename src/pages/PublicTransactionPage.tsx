import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { getDisplayId } from "../lib/utils"
import { useTranslation } from "react-i18next"
import { format } from "date-fns"
import {
    ArrowLeft,
    Clock
} from "lucide-react"
import { Card, CardContent } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { TransactionCard, type Transaction } from "../components/TransactionCard"

export default function PublicTransactionPage() {
    const { seqId } = useParams<{ seqId: string }>()
    const { t } = useTranslation()
    const [transaction, setTransaction] = useState<Transaction | null>(null)
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
            } else if (data) {
                // Map DB schema to Transaction interface
                const mappedTxn: Transaction = {
                    id: data.id,
                    type: data.type,
                    status: data.status,
                    paymentMethod: data.payment_method,
                    fiatAmount: data.fiat_amount,
                    fiatRate: data.fiat_buy_rate,
                    usdtAmount: data.usdt_amount,
                    usdtRate: data.usdt_sell_rate,
                    profit: data.profit,
                    createdAt: format(new Date(data.created_at), 'MMM d, yyyy, h:mm a'),
                    notes: data.notes,
                    stepFiatAcquired: data.step_fiat_acquired || false,
                    stepUsdtSold: data.step_usdt_sold || false,
                    stepFiatPaid: data.step_fiat_paid || false,
                    isPrivate: data.is_private ?? false,
                    holderId: data.holder_id,
                    holderName: data.holders?.name,
                    seqId: data.seq_id
                }
                setTransaction(mappedTxn)
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

    const displayId = getDisplayId(transaction.seqId || 0, transaction.paymentMethod)

    return (
        <div className="min-h-screen bg-background text-foreground p-4 sm:p-8 flex items-center justify-center">
            <div className="max-w-xl w-full space-y-6">
                <div className="flex items-center gap-4 mb-2">
                    <Link to="/" className="p-2 rounded-full hover:bg-muted transition-colors">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">{t('ledger.title')} - {displayId}</h1>
                        <p className="text-muted-foreground text-xs uppercase tracking-widest font-bold">
                            {t('common.shareWhatsapp') || "Public View"}
                        </p>
                    </div>
                </div>

                <div className="relative">
                    <TransactionCard transaction={transaction} readOnly={true} />
                </div>

                <div className="text-center pt-4">
                    <p className="text-xs text-muted-foreground/60 italic">
                        {t('analytics.monthlyPerfDesc')}
                    </p>
                </div>
            </div>
        </div>
    )
}
