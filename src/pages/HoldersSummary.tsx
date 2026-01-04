import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "../lib/supabase"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { formatCurrency, cn, getDisplayId } from "../lib/utils"
import { ChevronDown, Wallet, User, TrendingUp, RefreshCw } from "lucide-react"
import { format } from "date-fns"
import { TransactionEditDrawer } from "../components/TransactionEditDrawer"
import type { Transaction } from "../components/TransactionCard"
import { useUserRole } from "../hooks/useUserRole"

interface HolderSummary {
    id: string
    name: string
    totalProfit: number
    transactionCount: number
    transactions: Transaction[]
}

export default function HoldersSummaryPage() {
    const { t } = useTranslation()
    const { isAdmin } = useUserRole()
    const [holdersSummary, setHoldersSummary] = useState<HolderSummary[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedHolderId, setExpandedHolderId] = useState<string | null>(null)
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
    const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false)
    const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([])

    useEffect(() => {
        fetchHoldersSummary()
    }, [])

    const fetchHoldersSummary = async () => {
        try {
            const { data: holders, error: holdersError } = await supabase
                .from('holders')
                .select('id, name')
                .order('name', { ascending: true })

            if (holdersError) throw holdersError

            let txQuery = supabase
                .from('transactions')
                .select('*, seq_id')
                .not('holder_id', 'is', null)
                .order('created_at', { ascending: false })

            // Enforce privacy for non-admins
            if (!isAdmin) {
                txQuery = txQuery.eq('is_private', false)
            }

            const { data: transactions, error: txError } = await txQuery

            if (txError) throw txError

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
                        status: tx.status,
                        paymentMethod: tx.payment_method,
                        fiatAmount: tx.fiat_amount,
                        fiatRate: tx.fiat_buy_rate,
                        usdtAmount: tx.usdt_amount,
                        usdtRate: tx.usdt_sell_rate,
                        profit: tx.profit || 0,
                        createdAt: format(new Date(tx.created_at), 'MMM d, yyyy'),
                        notes: tx.notes,
                        isPrivate: tx.is_private,
                        stepFiatAcquired: tx.step_fiat_acquired,
                        stepUsdtSold: tx.step_usdt_sold,
                        stepFiatPaid: tx.step_fiat_paid,
                        holderId: tx.holder_id,
                        holderName: summary.name,
                        seqId: tx.seq_id,
                        isHybrid: tx.is_hybrid,
                        usdtSellRateBank: tx.usdt_sell_rate_bank
                    })
                }
            })

            const summaryArray = Array.from(summaryMap.values())
                .sort((a, b) => b.totalProfit - a.totalProfit)

            const pending = transactions
                .filter((tx: any) => tx.status !== 'complete')
                .map((tx: any) => ({
                    id: tx.id,
                    type: tx.type,
                    status: tx.status,
                    paymentMethod: tx.payment_method,
                    fiatAmount: tx.fiat_amount,
                    fiatRate: tx.fiat_buy_rate,
                    usdtAmount: tx.usdt_amount,
                    usdtRate: tx.usdt_sell_rate,
                    profit: tx.profit || 0,
                    createdAt: format(new Date(tx.created_at), 'MMM d, yyyy'),
                    notes: tx.notes,
                    isPrivate: tx.is_private,
                    stepFiatAcquired: tx.step_fiat_acquired,
                    stepUsdtSold: tx.step_usdt_sold,
                    stepFiatPaid: tx.step_fiat_paid,
                    holderId: tx.holder_id,
                    holderName: summaryMap.get(tx.holder_id)?.name || '',
                    seqId: tx.seq_id,
                    isHybrid: tx.is_hybrid,
                    usdtSellRateBank: tx.usdt_sell_rate_bank
                }))

            setHoldersSummary(summaryArray)
            setPendingTransactions(pending)
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
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
        >
            {/* Header */}
            <div className="flex flex-col gap-3">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{t('holdersSummary.title')}</h1>
                <p className="text-muted-foreground text-sm md:text-base">
                    {t('holdersSummary.subtitle')}
                </p>
            </div>

            {/* Total Summary Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
            >
                <Card className="border-0 shadow-sm overflow-hidden bg-background/50 backdrop-blur-sm">
                    <CardContent className="pt-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="p-4 rounded-2xl bg-primary/10">
                                    <Wallet className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">{t('holdersSummary.totalCash')}</p>
                                    <p className="text-2xl font-bold tracking-tight">{formatCurrency(totalAllHolders, 'LYD')}</p>
                                </div>
                            </div>
                            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-4 sm:pt-0 border-border/50">
                                <p className="text-sm text-muted-foreground mb-1">{t('holdersSummary.totalHolders')}</p>
                                <p className="text-xl font-semibold">{holdersSummary.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Pending Cash Alerts */}
                <AnimatePresence>
                    {pendingTransactions.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-2"
                        >
                            {pendingTransactions.map((tx) => (
                                <div
                                    key={tx.id}
                                    className="flex items-center gap-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 group cursor-pointer hover:bg-amber-500/15 transition-all"
                                    onClick={() => {
                                        setSelectedTransaction(tx)
                                        setIsEditDrawerOpen(true)
                                    }}
                                >
                                    <div className="p-2 rounded-xl bg-amber-500/20 animate-pulse">
                                        <RefreshCw className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold uppercase tracking-wider opacity-80 mb-0.5">
                                            {t('holdersSummary.pendingNotice')}
                                        </p>
                                        <p className="text-sm font-semibold truncate">
                                            {formatCurrency(tx.profit, 'LYD')} — {getDisplayId(tx.seqId, tx.paymentMethod)} ({tx.holderName})
                                        </p>
                                    </div>
                                    <ChevronDown className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity rotate-[-90deg]" />
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-muted-foreground">{t('common.loading')}</p>
                    </div>
                </div>
            ) : holdersSummary.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-20"
                >
                    <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                        <User className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground text-lg">{t('holdersSummary.noData')}</p>
                </motion.div>
            ) : (
                <div className="grid gap-4">
                    <AnimatePresence mode="popLayout">
                        {holdersSummary.map((holder, index) => (
                            <motion.div
                                key={holder.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <Card className="border-0 shadow-sm hover:shadow-md transition-all overflow-hidden">
                                    <CardHeader
                                        className="cursor-pointer hover:bg-muted/30 transition-colors"
                                        onClick={() => toggleExpand(holder.id)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3 flex-1">
                                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <User className="h-5 w-5 text-primary" />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-lg">{holder.name}</CardTitle>
                                                    <p className="text-sm text-muted-foreground mt-0.5">
                                                        {t('holdersSummary.transactionCount', { count: holder.transactionCount })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <p className="text-xs text-muted-foreground mb-1">{t('holdersSummary.holding')}</p>
                                                    <p className={cn(
                                                        "text-lg font-bold flex items-center gap-1",
                                                        holder.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'
                                                    )}>
                                                        {holder.totalProfit > 0 && <TrendingUp className="h-5 w-5" />}
                                                        {formatCurrency(holder.totalProfit, 'LYD')}
                                                    </p>
                                                </div>
                                                <motion.div
                                                    animate={{ rotate: expandedHolderId === holder.id ? 180 : 0 }}
                                                    transition={{ duration: 0.2 }}
                                                >
                                                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                                </motion.div>
                                            </div>
                                        </div>
                                    </CardHeader>

                                    <AnimatePresence>
                                        {expandedHolderId === holder.id && holder.transactions.length > 0 && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                <CardContent className="pt-0">
                                                    <div className="border-t pt-4">
                                                        <h4 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                                                            {t('holdersSummary.transactions')}
                                                        </h4>
                                                        <div className="space-y-2">
                                                            {holder.transactions.map((tx) => (
                                                                <motion.div
                                                                    key={tx.id}
                                                                    initial={{ opacity: 0, x: -20 }}
                                                                    animate={{ opacity: 1, x: 0 }}
                                                                    className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                                                                    onClick={() => {
                                                                        setSelectedTransaction(tx)
                                                                        setIsEditDrawerOpen(true)
                                                                    }}
                                                                >
                                                                    <div className="flex flex-col gap-2 min-w-0 flex-1 mr-3">
                                                                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                                                            <div className="font-mono bg-background px-1.5 py-0.5 rounded text-[10px] font-bold text-muted-foreground tracking-wider uppercase shrink-0">
                                                                                {getDisplayId(tx.seqId, tx.paymentMethod)}
                                                                            </div>
                                                                            <div className="font-bold text-sm truncate">{tx.type}</div>
                                                                            <div className="text-[10px] text-muted-foreground whitespace-nowrap opacity-60 font-medium">{tx.createdAt}</div>
                                                                        </div>
                                                                        <div className="flex items-center gap-1.5">
                                                                            <div className="text-[9px] px-1.5 py-0.5 rounded-md bg-background text-muted-foreground uppercase font-black tracking-tighter border border-border/50">
                                                                                {tx.paymentMethod}
                                                                            </div>
                                                                            {tx.isHybrid && (
                                                                                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-purple-500/30 bg-purple-500/5 text-purple-600 dark:text-purple-400 text-[9px] font-bold uppercase tracking-wider">
                                                                                    <RefreshCw className="h-2 w-2" />
                                                                                    {t('transaction.hybrid')}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <div className={cn(
                                                                        "font-black text-sm sm:text-base whitespace-nowrap shrink-0",
                                                                        tx.profit >= 0 ? 'text-green-500' : 'text-red-500'
                                                                    )}>
                                                                        {tx.profit > 0 ? '+' : ''}{formatCurrency(tx.profit, 'LYD')}
                                                                    </div>
                                                                </motion.div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            <TransactionEditDrawer
                transaction={selectedTransaction}
                isOpen={isEditDrawerOpen}
                onClose={() => setIsEditDrawerOpen(false)}
                onUpdate={fetchHoldersSummary}
            />
        </motion.div>
    )
}
