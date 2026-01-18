import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { supabase } from "../lib/supabase"
import { toast } from "sonner"

import { Building2, Wallet, Search } from "lucide-react" // Updated icons
import { useTranslation } from "react-i18next"
import { Input } from "../components/ui/input"


import { TransactionEditDrawer } from "../components/TransactionEditDrawer"
import type { Transaction } from "../components/TransactionCard"
import { getDisplayId } from "../lib/utils"

interface InvestorSummary {
    holderId: string
    holderName: string
    totalRetained: number
    transactionCount: number
    transactions: Transaction[]
}

export default function InvestmentHoldings() {
    const { t } = useTranslation()
    const [loading, setLoading] = useState(true)
    const [holdings, setHoldings] = useState<InvestorSummary[]>([])
    const [totalRetained, setTotalRetained] = useState(0)
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
    const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false)

    useEffect(() => {
        fetchHoldings()
    }, [])

    const fetchHoldings = async () => {
        try {
            setLoading(true)

            // 1. Fetch Holders (only investors? Or all who hold retained funds?)
            // Ideally only is_investor holders, but legacy might have retained funds on non-investors?
            // Let's fetch all holders first to map names.
            const { data: holdersData, error: holdersError } = await supabase
                .from('holders')
                .select('id, name, is_investor')

            if (holdersError) throw holdersError

            // 2. Fetch Retained Transactions
            const { data: txData, error: txError } = await supabase
                .from('transactions')
                .select('*')
                .eq('is_retained', true)
                .order('created_at', { ascending: false })

            if (txError) throw txError

            // 3. Aggregate Data
            const summaryMap = new Map<string, InvestorSummary>()
            let grandTotal = 0

            // Initialize map with investor holders (even if empty) - Optional, but good for visibility
            holdersData?.forEach(h => {
                if (h.is_investor) {
                    summaryMap.set(h.id, {
                        holderId: h.id,
                        holderName: h.name,
                        totalRetained: 0,
                        transactionCount: 0,
                        transactions: []
                    })
                }
            })

            txData?.forEach(tx => {
                const holderId = tx.holder_id
                if (!holderId) return // Should not happen with validation

                const amount = parseFloat(tx.retained_surplus) || 0
                grandTotal += amount

                if (!summaryMap.has(holderId)) {
                    // Create entry if not exists (e.g. non-investor holder holding retained funds)
                    const holderName = holdersData?.find(h => h.id === holderId)?.name || "Unknown Holder"
                    summaryMap.set(holderId, {
                        holderId,
                        holderName,
                        totalRetained: 0,
                        transactionCount: 0,
                        transactions: []
                    })
                }

                const entry = summaryMap.get(holderId)!
                entry.totalRetained += amount
                entry.transactionCount += 1
                entry.transactions.push({
                    id: tx.id,
                    type: tx.type,
                    status: tx.status,
                    paymentMethod: tx.payment_method,
                    fiatAmount: tx.fiat_amount,
                    fiatRate: tx.fiat_buy_rate,
                    usdtAmount: tx.usdt_amount,
                    usdtRate: tx.usdt_sell_rate,
                    profit: tx.profit || 0,
                    createdAt: tx.created_at,
                    notes: tx.notes,
                    isPrivate: tx.is_private,
                    stepFiatAcquired: tx.step_fiat_acquired,
                    stepUsdtSold: tx.step_usdt_sold,
                    stepFiatPaid: tx.step_fiat_paid,
                    holderId: tx.holder_id,
                    holderName: entry.holderName,
                    seqId: tx.seq_id,
                    isHybrid: tx.is_hybrid,
                    usdtSellRateBank: tx.usdt_sell_rate_bank,
                    isRetained: tx.is_retained,
                    retainedSurplus: amount
                })
            })

            const sortedHoldings = Array.from(summaryMap.values())
                .filter(h => h.totalRetained > 0 || holdersData?.find(ref => ref.id === h.holderId)?.is_investor) // Show active or strictly investor
                .sort((a, b) => b.totalRetained - a.totalRetained)

            setHoldings(sortedHoldings)
            setTotalRetained(grandTotal)

        } catch (error) {
            console.error("Error fetching investment holdings:", error)
            toast.error("Failed to load investment data")
        } finally {
            setLoading(false)
        }
    }

    const filteredHoldings = holdings.filter(h =>
        h.holderName.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            <div className="flex flex-col gap-3">
                <h1 className="text-3xl font-bold tracking-tight">{t('investments.title') || "Investment Holdings"}</h1>
                <p className="text-muted-foreground">
                    {t('investments.subtitle') || "Track and manage your retained capital investments"}
                </p>
            </div>

            {/* Overview Card */}
            <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">{t('investments.totalCapital') || "Total Retained Capital"}</p>
                            <h2 className="text-4xl font-bold text-indigo-500">{totalRetained.toFixed(2)} USDT</h2>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-indigo-500/20 flex items-center justify-center">
                            <Wallet className="h-6 w-6 text-indigo-500" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder={t('investments.searchPlaceholder') || "Search investors..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-card/50"
                />
            </div>

            {/* Holdings Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence>
                    {filteredHoldings.map((holding) => (
                        <motion.div
                            key={holding.holderId}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            layout
                        >
                            <Card className="hover:shadow-md transition-shadow h-full border-l-4 border-l-indigo-500">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <div className="space-y-1">
                                        <CardTitle className="text-base font-semibold">
                                            {holding.holderName}
                                        </CardTitle>
                                        <p className="text-xs text-muted-foreground">
                                            {holding.transactionCount} {t('common.transactions') || "transactions"}
                                        </p>
                                    </div>
                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="mt-3">
                                        <span className="text-2xl font-bold">{holding.totalRetained.toFixed(2)}</span>
                                        <span className="text-sm text-muted-foreground ml-1">USDT</span>
                                    </div>

                                    {/* Recent Transactions Preview */}
                                    <div className="mt-4 space-y-2">
                                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                            {t('investments.recentActivity') || "Recent Activity"}
                                        </p>
                                        {holding.transactions.slice(0, 3).map((tx) => (
                                            <div
                                                key={tx.id}
                                                className="text-xs flex justify-between items-center py-1 border-t border-border/50 cursor-pointer hover:bg-muted/50 transition-colors rounded px-1 -mx-1"
                                                onClick={() => {
                                                    setSelectedTransaction(tx)
                                                    setIsEditDrawerOpen(true)
                                                }}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-[10px] opacity-70">
                                                        {getDisplayId(tx.seqId, tx.paymentMethod)}
                                                    </span>
                                                    <span className="text-muted-foreground">
                                                        {new Date(tx.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <span className="font-mono font-medium text-emerald-500">
                                                    +{tx.retainedSurplus?.toFixed(2)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                    {filteredHoldings.length === 0 && (
                        <div className="col-span-full text-center py-12 text-muted-foreground">
                            {t('investments.noHoldings') || "No investment holdings found"}
                        </div>
                    )}
                </AnimatePresence>
            </div>

            <TransactionEditDrawer
                transaction={selectedTransaction}
                isOpen={isEditDrawerOpen}
                onClose={() => setIsEditDrawerOpen(false)}
                onUpdate={fetchHoldings}
            />
        </motion.div>
    )
}
