import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { formatCurrency, cn } from "../lib/utils"
import {
    Building2,
    Banknote,
    Calendar,
    Lock,
    Share2,
    MessageSquare,
    RefreshCw
} from "lucide-react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Textarea } from "@/components/ui/textarea"
import { BottomSheet } from "./ui/bottom-sheet"
import { supabase } from "../lib/supabase"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import { useUserRole } from "../hooks/useUserRole"
import type { Transaction } from "./TransactionCard"
import { calculateTransactionMetrics } from "../lib/calculations"

interface TransactionEditDrawerProps {
    transaction: Transaction | null
    isOpen: boolean
    onClose: () => void
    onUpdate?: () => void
}

export function TransactionEditDrawer({ transaction, isOpen, onClose, onUpdate }: TransactionEditDrawerProps) {
    const { t, i18n } = useTranslation()
    const { isAdmin } = useUserRole()
    const dateInputRef = useRef<HTMLInputElement>(null)
    const [holders, setHolders] = useState<Array<{ id: string; name: string }>>([])

    // Helper to format date for input[type="date"]
    const formatDateForInput = (dateString: string) => {
        if (!dateString) return ''
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return dateString
        }
        try {
            const date = new Date(dateString)
            return date.toISOString().split('T')[0]
        } catch {
            return dateString
        }
    }

    const [editValues, setEditValues] = useState({
        fiatAmount: "",
        fiatRate: "",
        usdtAmount: "",
        usdtRate: "",
        paymentMethod: "cash" as 'cash' | 'bank',
        createdAt: "",
        notes: "",
        isPrivate: true,
        holderId: "",
        isHybrid: false,
        usdtSellRateBank: "",
        isRetained: false,
        retainedSurplus: "",
        retainedCurrency: "USDT" as 'USDT' | 'EUR' | 'GBP',
        status: "planned" as 'planned' | 'in_progress' | 'complete' | 'cancelled'
    })
    const [manualProfit, setManualProfit] = useState<string>("")
    const [retainedManual, setRetainedManual] = useState(false)

    // Parse live values
    const valFiatAmount = parseFloat(editValues.fiatAmount) || 0
    const valFiatRate = parseFloat(editValues.fiatRate) || 0
    const valUsdtAmount = parseFloat(editValues.usdtAmount) || 0
    const valUsdtRate = parseFloat(editValues.usdtRate) || 0

    // Calculate live metrics using centralized logic
    const metrics = calculateTransactionMetrics({
        fiatAmount: valFiatAmount,
        fiatRate: valFiatRate,
        usdtAmount: valUsdtAmount,
        usdtRate: valUsdtRate,
        isHybrid: editValues.isHybrid,
        usdtSellRateBank: parseFloat(editValues.usdtSellRateBank),
        isRetained: editValues.isRetained
    });

    const calculatedProfit = metrics.profitLyd;

    // Auto-calculate retained amount
    useEffect(() => {
        if (editValues.isRetained && !retainedManual) {
            setEditValues(prev => ({
                ...prev,
                retainedSurplus: metrics.surplusUsdt.toFixed(2)
            }));
        }
    }, [metrics.surplusUsdt, editValues.isRetained, retainedManual])

    // Reset manual flag when toggle is turned off/on or transaction loaded
    useEffect(() => {
        if (!editValues.isRetained) {
            setRetainedManual(false)
        }
    }, [editValues.isRetained])

    // Fetch holders
    useEffect(() => {
        const fetchHolders = async () => {
            const { data, error } = await supabase
                .from('holders')
                .select('id, name')
                .order('name', { ascending: true })

            if (!error && data) {
                setHolders(data)
            }
        }
        fetchHolders()
    }, [])

    // Update state when transaction changes
    useEffect(() => {
        if (transaction) {
            setEditValues({
                fiatAmount: transaction.fiatAmount?.toString() ?? "",
                fiatRate: transaction.fiatRate?.toString() ?? "",
                usdtAmount: transaction.usdtAmount?.toString() ?? "",
                usdtRate: transaction.usdtRate?.toString() ?? "",
                paymentMethod: transaction.paymentMethod,
                createdAt: transaction.createdAt ? formatDateForInput(transaction.createdAt) : "",
                notes: transaction.notes || "",
                isPrivate: transaction.isPrivate,
                holderId: transaction.holderId || "",
                isHybrid: transaction.isHybrid || false,
                usdtSellRateBank: transaction.usdtSellRateBank?.toString() ?? "",
                isRetained: transaction.isRetained || false,
                retainedSurplus: transaction.retainedSurplus?.toString() ?? "",
                retainedCurrency: transaction.retainedCurrency || "USDT",
                status: transaction.status || "planned"
            })
            setManualProfit(transaction.profit?.toString() ?? "")
        }
    }, [transaction])

    if (!transaction) return null

    const hasChanges = () => {
        return (
            parseFloat(editValues.fiatAmount) !== transaction.fiatAmount ||
            parseFloat(editValues.fiatRate) !== transaction.fiatRate ||
            parseFloat(editValues.usdtAmount) !== transaction.usdtAmount ||
            parseFloat(editValues.usdtRate) !== transaction.usdtRate ||
            editValues.paymentMethod !== transaction.paymentMethod ||
            editValues.createdAt !== formatDateForInput(transaction.createdAt) ||
            editValues.notes !== (transaction.notes || "") ||
            editValues.isPrivate !== transaction.isPrivate ||
            editValues.holderId !== (transaction.holderId || "") ||
            editValues.isHybrid !== (transaction.isHybrid || false) ||
            (parseFloat(editValues.usdtSellRateBank) || 0) !== (transaction.usdtSellRateBank || 0) ||
            editValues.isRetained !== (transaction.isRetained || false) ||
            editValues.retainedCurrency !== (transaction.retainedCurrency || 'USDT') ||
            editValues.status !== (transaction.status || 'planned') ||
            parseFloat(manualProfit) !== transaction.profit
        )
    }

    const getDisplayId = (paymentMethod: 'cash' | 'bank', seqId: number) => {
        const prefix = paymentMethod === 'cash' ? 'C' : 'B'
        return `${prefix}${seqId?.toString().padStart(5, '0') ?? '00000'}`
    }

    const shareTransaction = async (type: 'text' | 'link') => {
        if (!transaction) return

        const displayId = getDisplayId(transaction.paymentMethod, transaction.seqId || 0)
        const baseUrl = window.location.origin
        const shareUrl = `${baseUrl}/t/${displayId}`

        if (type === 'link') {
            await navigator.clipboard.writeText(shareUrl)
            toast.success(t('common.linkCopied') || "Link copied to clipboard")
            return
        }

        const cost = parseFloat(editValues.fiatAmount) * parseFloat(editValues.fiatRate)
        const returns = parseFloat(editValues.usdtAmount) * parseFloat(editValues.usdtRate)
        const profit = parseFloat(manualProfit) || 0
        const date = new Date(editValues.createdAt).toLocaleString('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short'
        })

        const message = i18n.language === 'ar'
            ? `📦 *تفاصيل المعاملة - ${displayId}*\n\n` +
            `🕒 *الحالة:* ${t(`transaction.${transaction.status}`)}\n` +
            `💰 *التكلفة:* ${formatCurrency(cost, 'LYD')}\n` +
            `📈 *العائد:* ${formatCurrency(returns, 'LYD')}\n` +
            `💵 *الربح:* ${formatCurrency(profit, 'LYD')}\n` +
            `📅 *التاريخ:* ${date}\n\n` +
            `🔗 *الرابط:* ${shareUrl}`
            : `📦 *Transaction Details - ${displayId}*\n\n` +
            `🕒 *Status:* ${t(`transaction.${transaction.status}`)}\n` +
            `💰 *Cost:* ${formatCurrency(cost, 'LYD')}\n` +
            `📈 *Return:* ${formatCurrency(returns, 'LYD')}\n` +
            `💵 *Profit:* ${formatCurrency(profit, 'LYD')}\n` +
            `📅 *Date:* ${date}\n\n` +
            `🔗 *Link:* ${shareUrl}`

        await navigator.clipboard.writeText(message)
        toast.success(t('common.copiedToWhatsapp') || "Formatted for WhatsApp & copied!")
    }

    const handleSave = async () => {
        if (!hasChanges()) {
            onClose()
            return
        }

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Only require holder when completing a transaction with retained funds
            if (editValues.isRetained && !editValues.holderId && editValues.status === 'complete') {
                toast.error(t('transaction.holderRequiredForRetention') || "Please select a holder for retained funds before completing")
                return
            }

            const updates: any = {
                fiat_amount: valFiatAmount,
                fiat_buy_rate: valFiatRate,
                usdt_amount: valUsdtAmount,
                usdt_sell_rate: valUsdtRate,
                profit: parseFloat(manualProfit) || calculatedProfit,
                payment_method: editValues.paymentMethod,
                notes: editValues.notes,
                is_private: editValues.isPrivate,
                holder_id: editValues.holderId || null,
                is_hybrid: editValues.isHybrid && editValues.paymentMethod === 'cash',
                usdt_sell_rate_bank: (editValues.isHybrid && editValues.paymentMethod === 'cash') ? (parseFloat(editValues.usdtSellRateBank) || 0) : null,
                is_retained: editValues.isRetained,
                retained_surplus: editValues.isRetained ? (parseFloat(editValues.retainedSurplus) || 0) : 0,
                retained_currency: editValues.isRetained ? editValues.retainedCurrency : null,
                status: editValues.status,
                updated_at: new Date().toISOString()
            }

            // Only update created_at if the date actually changed to prevent stripping time precision
            if (editValues.createdAt !== formatDateForInput(transaction.createdAt)) {
                updates.created_at = editValues.createdAt
            }

            const { error: updateError } = await supabase
                .from('transactions')
                .update(updates)
                .eq('id', transaction.id)

            if (updateError) throw updateError

            const changes = {
                old: {
                    fiatAmount: transaction.fiatAmount,
                    fiatRate: transaction.fiatRate,
                    usdtAmount: transaction.usdtAmount,
                    usdtRate: transaction.usdtRate,
                    paymentMethod: transaction.paymentMethod,
                    createdAt: transaction.createdAt,
                    notes: transaction.notes,
                    isPrivate: transaction.isPrivate
                },
                new: {
                    fiatAmount: valFiatAmount,
                    fiatRate: valFiatRate,
                    usdtAmount: valUsdtAmount,
                    usdtRate: valUsdtRate,
                    paymentMethod: editValues.paymentMethod,
                    createdAt: editValues.createdAt,
                    notes: editValues.notes,
                    isPrivate: editValues.isPrivate,
                    isHybrid: editValues.isHybrid,
                    usdtSellRateBank: parseFloat(editValues.usdtSellRateBank) || 0,
                    isRetained: editValues.isRetained,
                    retainedSurplus: editValues.retainedSurplus,
                    status: editValues.status
                }
            }

            const { error: logError } = await supabase
                .from('transaction_logs')
                .insert({
                    transaction_id: transaction.id,
                    user_id: user.id,
                    action: 'update',
                    changes: changes
                })

            if (logError) console.error("Failed to create audit log:", logError)

            toast.success("Transaction updated")
            onClose()
            if (onUpdate) onUpdate()

        } catch (error) {
            console.error("Error updating transaction:", error)
            toast.error("Failed to update transaction")
        }
    }

    return (
        <BottomSheet
            isOpen={isOpen}
            onClose={onClose}
            title={t('transaction.editTitle') || "Edit Transaction"}
        >
            <div className="p-6 space-y-6">
                {/* Date */}
                <div>
                    <label className="block text-sm font-medium mb-2">{t('common.date') || "Date"}</label>
                    <div
                        className="relative cursor-pointer"
                        onClick={() => dateInputRef.current?.showPicker()}
                    >
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                            ref={dateInputRef}
                            type="date"
                            value={editValues.createdAt}
                            onChange={e => setEditValues({ ...editValues, createdAt: e.target.value })}
                            className="h-12 text-base pl-10 cursor-pointer"
                        />
                    </div>
                </div>

                {/* Status Selector */}
                <div>
                    <label className="block text-sm font-medium mb-2">{t('filter.status') || "Status"}</label>
                    <div className="grid grid-cols-3 gap-2">
                        {(['planned', 'in_progress', 'complete'] as const).map(s => (
                            <button
                                key={s}
                                onClick={() => setEditValues({ ...editValues, status: s })}
                                className={cn(
                                    "h-9 rounded-lg text-xs font-medium transition-colors border",
                                    editValues.status === s
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "bg-background text-muted-foreground border-input hover:bg-accent"
                                )}
                            >
                                {t(`transaction.${s === 'in_progress' ? 'inProgress' : s}`)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Payment Method */}
                <div>
                    <label className="block text-sm font-medium mb-2">{t('calculator.paymentMethod') || "Payment Method"}</label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setEditValues({ ...editValues, paymentMethod: "bank" })}
                            className={cn(
                                "h-12 rounded-xl font-medium transition-all flex items-center justify-center gap-2",
                                editValues.paymentMethod === "bank"
                                    ? "bg-primary text-primary-foreground shadow-md"
                                    : "bg-muted text-muted-foreground"
                            )}
                        >
                            <Building2 className="h-4 w-4" />
                            {t('calculator.bank')}
                        </button>
                        <button
                            onClick={() => setEditValues({ ...editValues, paymentMethod: "cash" })}
                            className={cn(
                                "h-12 rounded-xl font-medium transition-all flex items-center justify-center gap-2",
                                editValues.paymentMethod === "cash"
                                    ? "bg-primary text-primary-foreground shadow-md"
                                    : "bg-muted text-muted-foreground"
                            )}
                        >
                            <Banknote className="h-4 w-4" />
                            {t('calculator.cash')}
                        </button>
                    </div>
                </div>

                {/* Buy Section */}
                <div className="bg-muted/30 rounded-2xl p-4 space-y-3">
                    <h3 className="font-semibold text-sm">{t('calculator.buy')}</h3>
                    <div>
                        <label className="block text-xs text-muted-foreground mb-1">{t('calculator.amount') || "Amount"}</label>
                        <Input
                            type="number"
                            value={editValues.fiatAmount}
                            onChange={e => setEditValues({ ...editValues, fiatAmount: e.target.value })}
                            className="h-12 text-base"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-muted-foreground mb-1">{t('calculator.rate') || "Rate"} (LYD)</label>
                        <Input
                            type="number"
                            value={editValues.fiatRate}
                            onChange={e => setEditValues({ ...editValues, fiatRate: e.target.value })}
                            className="h-12 text-base"
                        />
                    </div>
                </div>

                {/* Sell Section */}
                <div className="bg-muted/30 rounded-2xl p-4 space-y-3">
                    <h3 className="font-semibold text-sm">{t('calculator.sell')}</h3>
                    <div>
                        <label className="block text-xs text-muted-foreground mb-1">{t('calculator.amount') || "Amount"} (USDT)</label>
                        <Input
                            type="number"
                            value={editValues.usdtAmount}
                            onChange={e => setEditValues({ ...editValues, usdtAmount: e.target.value })}
                            className="h-12 text-base"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-muted-foreground mb-1">{t('calculator.rate') || "Rate"} (LYD)</label>
                        <Input
                            type="number"
                            value={editValues.usdtRate}
                            onChange={e => setEditValues({ ...editValues, usdtRate: e.target.value })}
                            className="h-12 text-base"
                        />
                    </div>
                </div>

                {/* Cost Recovery & Outcome Strategy */}
                {editValues.paymentMethod && (
                    <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10 mb-4 space-y-4">
                        {/* Cost Breakdown Summary */}
                        <div className="space-y-1.5 pb-2 border-b border-primary/10">
                            <div className="flex justify-between text-[11px] text-muted-foreground">
                                <span>{t('calculator.usdtToCover') || "USDT to cover cost"}:</span>
                                <span className="font-mono font-bold text-foreground">
                                    {metrics.usdtToCoverCost.toFixed(2)} USDT
                                </span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                                <span className="text-muted-foreground">{t('calculator.usdtSurplus') || "USDT for profit (Surplus)"}:</span>
                                <span className="text-primary font-bold">
                                    {metrics.surplusUsdt.toFixed(2)} USDT
                                </span>
                            </div>
                        </div>

                        {/* Option 1: Hybrid Transaction */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <h3 className="font-semibold text-sm">{t('calculator.hybridMode') || "Hybrid Transaction"}</h3>
                                    <p className="text-[10px] text-muted-foreground italic">
                                        {t('calculator.hybridDescShort') || "Sell surplus at a different rate"}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setEditValues({
                                        ...editValues,
                                        isHybrid: !editValues.isHybrid,
                                        isRetained: false // Mutually exclusive
                                    })}
                                    className={cn(
                                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                                        editValues.isHybrid ? "bg-primary" : "bg-muted"
                                    )}
                                >
                                    <span
                                        className={cn(
                                            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                            editValues.isHybrid ? "translate-x-6" : "translate-x-1"
                                        )}
                                    />
                                </button>
                            </div>
                            {editValues.isHybrid && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    className="pt-1"
                                >
                                    <label className="block text-xs text-muted-foreground mb-1">{t('calculator.bankProfitRate')} (LYD / USDT)</label>
                                    <Input
                                        type="number"
                                        value={editValues.usdtSellRateBank}
                                        onChange={e => setEditValues({ ...editValues, usdtSellRateBank: e.target.value })}
                                        className="h-11 text-base border-primary/20 bg-background"
                                    />
                                </motion.div>
                            )}
                        </div>

                        {/* Option 2: Retain Surplus */}
                        <div className="space-y-3 pt-2 border-t border-primary/10">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <h3 className="font-semibold text-sm text-blue-600 dark:text-blue-400">
                                        {editValues.isRetained
                                            ? t('calculator.retainedAs', { currency: editValues.retainedCurrency })
                                            : (t('calculator.retainSurplus') || "Retain Surplus")}
                                    </h3>
                                    <p className="text-[10px] text-muted-foreground italic">
                                        {t('calculator.retainDesc') || "Hold surplus offshore instead of selling"}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setEditValues({
                                        ...editValues,
                                        isRetained: !editValues.isRetained,
                                        isHybrid: false // Mutually exclusive
                                    })}
                                    className={cn(
                                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                                        editValues.isRetained ? "bg-blue-500" : "bg-muted"
                                    )}
                                >
                                    <span
                                        className={cn(
                                            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                            editValues.isRetained ? "translate-x-6" : "translate-x-1"
                                        )}
                                    />
                                </button>
                            </div>
                            {editValues.isRetained && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    className="space-y-3 pt-1"
                                >
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            readOnly
                                            value={editValues.retainedSurplus}
                                            className="h-11 text-right font-mono font-bold text-blue-600 bg-blue-50/50 border-blue-200"
                                        />
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-blue-400 font-medium">USDT Amount</span>
                                    </div>

                                    <div>
                                        <label className="block text-xs text-muted-foreground mb-2">{t('calculator.retainedCurrency') || "Retained Currency"}</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {(['USDT', 'EUR', 'GBP'] as const).map((currency) => (
                                                <button
                                                    key={currency}
                                                    type="button"
                                                    onClick={() => setEditValues({ ...editValues, retainedCurrency: currency })}
                                                    className={cn(
                                                        "h-10 rounded-lg text-xs font-bold transition-all border-2",
                                                        editValues.retainedCurrency === currency
                                                            ? "bg-blue-500 text-white border-blue-500"
                                                            : "bg-background text-muted-foreground border-border hover:border-blue-300"
                                                    )}
                                                >
                                                    {currency}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </div>
                )}


                {/* Holder */}
                <div>
                    <label className="block text-sm font-medium mb-2">{t('transaction.holder')}</label>
                    <select
                        value={editValues.holderId}
                        onChange={(e) => setEditValues({ ...editValues, holderId: e.target.value })}
                        className="w-full h-12 px-4 text-base border bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-primary border-input"
                    >
                        <option value="">{t('transaction.selectHolder')}</option>
                        {holders.map((holder) => (
                            <option key={holder.id} value={holder.id}>
                                {holder.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Notes */}
                <div>
                    <label className="block text-sm font-medium mb-2">{t('calculator.notes')}</label>
                    <Textarea
                        value={editValues.notes}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditValues({ ...editValues, notes: e.target.value })}
                        className="min-h-[100px] text-base rounded-xl"
                        placeholder={t('calculator.notesPlaceholder') || "Add notes..."}
                    />
                </div>

                {/* Privacy Toggle */}
                {isAdmin && (
                    <div>
                        <button
                            onClick={() => setEditValues({ ...editValues, isPrivate: !editValues.isPrivate })}
                            className={cn(
                                "w-full h-12 rounded-xl font-medium transition-all flex items-center justify-center gap-2",
                                editValues.isPrivate
                                    ? "bg-red-500/10 text-red-600 border-2 border-red-200"
                                    : "bg-green-500/10 text-green-600 border-2 border-green-200"
                            )}
                        >
                            {editValues.isPrivate ? <Lock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                            {editValues.isPrivate ? t('calculator.private') : t('calculator.public')}
                        </button>
                    </div>
                )}

                {/* Cost & Return Breakdown */}
                <div className="bg-muted/30 rounded-2xl p-4 border border-border/50 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Cost:</span>
                        <div className="flex flex-col items-end">
                            <span className="font-mono font-medium">{formatCurrency(metrics.costLyd, 'LYD')}</span>
                            <span className="font-mono text-[10px] text-muted-foreground/50">{metrics.usdtToCoverCost.toFixed(2)} USDT</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Return:</span>
                        <div className="flex flex-col items-end">
                            <span className="font-mono font-medium">{formatCurrency(metrics.returnLyd, 'LYD')}</span>
                            <span className="font-mono text-[10px] text-muted-foreground/50">{metrics.returnUsdt.toFixed(2)} USDT</span>
                        </div>
                    </div>
                </div>

                {/* Profit Preview */}
                <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{t('transaction.netProfit')}</span>
                        {Math.abs(parseFloat(manualProfit) - calculatedProfit) > 0.01 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setManualProfit(calculatedProfit.toFixed(2))}
                                className="h-6 text-[10px] text-muted-foreground hover:text-primary px-2"
                            >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                {t('calculator.fetchLive') || "Reset"}
                            </Button>
                        )}
                    </div>
                    <div className="relative">
                        <Input
                            type="number"
                            value={manualProfit}
                            onChange={e => setManualProfit(e.target.value)}
                            className={cn(
                                "text-xl font-bold bg-transparent border-none p-0 h-auto focus-visible:ring-0 text-right",
                                parseFloat(manualProfit) >= 0 ? "text-green-500" : "text-red-500"
                            )}
                        />
                        <div className={cn(
                            "text-[10px] font-mono text-right mt-1",
                            parseFloat(manualProfit) >= 0 ? "text-green-500/60" : "text-red-500/60"
                        )}>
                            {metrics.surplusUsdt.toFixed(2)} USDT
                        </div>
                        <div className="absolute left-0 bottom-0 text-[10px] text-muted-foreground italic">
                            {Math.abs(parseFloat(manualProfit) - calculatedProfit) > 0.01 ? "Manual override" : "Calculated"}
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-muted/30">
                    <Button
                        variant="ghost"
                        onClick={() => shareTransaction('text')}
                        className="h-12 text-sm rounded-xl bg-green-500/5 text-green-600 hover:bg-green-500/10 hover:text-green-700"
                    >
                        <MessageSquare className="mr-2 h-4 w-4" />
                        {t('common.shareWhatsapp')}
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={() => shareTransaction('link')}
                        className="h-12 text-sm rounded-xl bg-primary/5 text-primary hover:bg-primary/10"
                    >
                        <Share2 className="mr-2 h-4 w-4" />
                        {t('common.copyLink')}
                    </Button>
                </div>

                <div className="flex gap-3 mt-4">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="flex-1 h-12 text-base rounded-xl"
                    >
                        {t('common.cancel') || "Cancel"}
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!hasChanges()}
                        className="flex-1 h-12 text-base rounded-xl"
                    >
                        {t('common.save') || "Save Changes"}
                    </Button>
                </div>
            </div>
        </BottomSheet >
    )
}
