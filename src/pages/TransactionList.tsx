import { useEffect, useState } from "react"
import { TransactionCard, type Transaction } from "../components/TransactionCard"
import { supabase } from "../lib/supabase"
import { format } from "date-fns"
import { toast } from "sonner"

export default function TransactionListPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchTransactions()
    }, [])

    const fetchTransactions = async () => {
        try {
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .order('created_at', { ascending: false })

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
                stepFiatPaid: txn.step_fiat_paid || false
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
                <h1 className="text-3xl font-bold tracking-tight">Ledger</h1>
                <p className="text-muted-foreground">
                    History of all your arbitrage transactions.
                </p>
            </div>

            <div className="grid gap-4">
                {loading ? (
                    <div className="text-center py-10 text-muted-foreground">Loading...</div>
                ) : transactions.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">No transactions found.</div>
                ) : (
                    transactions.map((txn) => (
                        <TransactionCard key={txn.id} transaction={txn} onStatusChange={fetchTransactions} />
                    ))
                )}
            </div>
        </div>
    )
}
