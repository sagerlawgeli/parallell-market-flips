import { useEffect, useState } from "react"
import { TransactionCard, type Transaction } from "../components/TransactionCard"
import { supabase } from "../lib/supabase"
import { format } from "date-fns"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import { VisibilityFilter, type VisibilityFilterValue } from "../components/VisibilityFilter"

export default function TransactionListPage() {
    const { t } = useTranslation()
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [loading, setLoading] = useState(true)
    const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilterValue>('all')

    useEffect(() => {
        fetchTransactions()
    }, [visibilityFilter])

    const fetchTransactions = async () => {
        try {
            let query = supabase
                .from('transactions')
                .select('*')
                .order('created_at', { ascending: false })

            // Apply visibility filter
            if (visibilityFilter === 'private') {
                query = query.eq('is_private', true)
            } else if (visibilityFilter === 'public') {
                query = query.eq('is_private', false)
            }

            const { data, error } = await query

            if (error) throw error

            const formattedTransactions: Transaction[] = data.map((txn: any) => ({
                id: txn.id,
                type: txn.type,
                status: txn.status,
                paymentMethod: txn.payment_method,
                fiatAmount: txn.fiat_amount,
                fiatRate: txn.fiat_buy_rate,
                usdtAmount: txn.usdt_amount,
                usdtRate: txn.usdt_sell_rate,
                profit: txn.profit,
                createdAt: format(new Date(txn.created_at), 'MMM d, yyyy, h:mm a'),
                notes: txn.notes,

                // Map steps
                stepFiatAcquired: txn.step_fiat_acquired || false,
                stepUsdtSold: txn.step_usdt_sold || false,
                stepFiatPaid: txn.step_fiat_paid || false,
                isPrivate: txn.is_private ?? true // Default to true if undefined for safety
            }))

            setTransactions(formattedTransactions)
        } catch (error) {
            console.error('Error fetching transactions:', error)
            toast.error("Failed to load transactions")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">{t('ledger.title')}</h1>
                <p className="text-muted-foreground">
                    {t('ledger.subtitle')}
                </p>
            </div>

            <VisibilityFilter value={visibilityFilter} onChange={setVisibilityFilter} />

            <div className="grid gap-4">
                {loading ? (
                    <div className="text-center py-10 text-muted-foreground">{t('common.loading')}</div>
                ) : transactions.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">{t('ledger.noTransactions')}</div>
                ) : (
                    transactions.map((txn) => (
                        <TransactionCard key={txn.id} transaction={txn} onStatusChange={fetchTransactions} />
                    ))
                )}
            </div>
        </div>
    )
}
