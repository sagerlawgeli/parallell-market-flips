import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { TransactionCard, type Transaction } from "../components/TransactionCard"
import { supabase } from "../lib/supabase"
import { format } from "date-fns"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import { VisibilityFilter, type VisibilityFilterValue } from "../components/VisibilityFilter"
import { PaymentMethodFilter, type PaymentMethodFilterValue } from "../components/PaymentMethodFilter"

export default function TransactionListPage() {
    const { t } = useTranslation()
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [loading, setLoading] = useState(true)
    const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilterValue>('all')
    const [paymentMethodFilter, setPaymentMethodFilter] = useState<PaymentMethodFilterValue>('all')

    useEffect(() => {
        fetchTransactions()
    }, [visibilityFilter, paymentMethodFilter])

    const fetchTransactions = async () => {
        try {
            let query = supabase
                .from('transactions')
                .select(`
                    *,
                    holders (
                        id,
                        name
                    )
                `)
                .order('created_at', { ascending: false })

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
                stepFiatAcquired: txn.step_fiat_acquired || false,
                stepUsdtSold: txn.step_usdt_sold || false,
                stepFiatPaid: txn.step_fiat_paid || false,
                isPrivate: txn.is_private ?? true,
                holderId: txn.holder_id,
                holderName: txn.holders?.name
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
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
        >
            {/* Header */}
            <div className="flex flex-col gap-3">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{t('ledger.title')}</h1>
                <p className="text-muted-foreground text-sm md:text-base">
                    {t('ledger.subtitle')}
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                <VisibilityFilter value={visibilityFilter} onChange={setVisibilityFilter} />
                <PaymentMethodFilter value={paymentMethodFilter} onChange={setPaymentMethodFilter} />
            </div>

            {/* Transaction Count */}
            {!loading && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm text-muted-foreground"
                >
                    {t(transactions.length === 1 ? 'ledger.transactionCountSingular' : 'ledger.transactionCount', { count: transactions.length })}
                </motion.div>
            )}

            {/* Transaction List */}
            <div className="grid gap-4">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="text-center">
                            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-muted-foreground">{t('common.loading')}</p>
                        </div>
                    </div>
                ) : transactions.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-20"
                    >
                        <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <p className="text-muted-foreground text-lg">{t('ledger.noTransactions')}</p>
                    </motion.div>
                ) : (
                    <AnimatePresence mode="popLayout">
                        {transactions.map((txn, index) => (
                            <motion.div
                                key={txn.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <TransactionCard transaction={txn} onStatusChange={fetchTransactions} />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>
        </motion.div>
    )
}
