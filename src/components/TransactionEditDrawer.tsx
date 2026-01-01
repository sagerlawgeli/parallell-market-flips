import { useState, useEffect, useRef } from "react"
import { formatCurrency, cn } from "../lib/utils"
import {
    X,
    Save,
    Trash2,
    TrendingUp,
    CheckCircle2,
    Building2,
    Banknote,
    Calendar,
    Lock
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

interface TransactionEditDrawerProps {
    transaction: Transaction | null
    isOpen: boolean
    onClose: () => void
    onUpdate?: () => void
}

export function TransactionEditDrawer({ transaction, isOpen, onClose, onUpdate }: TransactionEditDrawerProps) {
    const { t } = useTranslation()
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
        holderId: ""
    })

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
                fiatAmount: transaction.fiatAmount.toString(),
                fiatRate: transaction.fiatRate.toString(),
                usdtAmount: transaction.usdtAmount.toString(),
                usdtRate: transaction.usdtRate.toString(),
                paymentMethod: transaction.paymentMethod,
                createdAt: formatDateForInput(transaction.createdAt),
                notes: transaction.notes || "",
                isPrivate: transaction.isPrivate,
                holderId: transaction.holderId || ""
            })
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
            editValues.holderId !== (transaction.holderId || "")
        )
    }

    // Calculate live profit preview
    const valFiatAmount = parseFloat(editValues.fiatAmount) || 0
    const valFiatRate = parseFloat(editValues.fiatRate) || 0
    const valUsdtAmount = parseFloat(editValues.usdtAmount) || 0
    const valUsdtRate = parseFloat(editValues.usdtRate) || 0
    const currentProfit = (valUsdtAmount * valUsdtRate) - (valFiatAmount * valFiatRate)

    const handleSave = async () => {
        if (!hasChanges()) {
            onClose()
            return
        }

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const updates: any = {
                fiat_amount: valFiatAmount,
                fiat_buy_rate: valFiatRate,
                usdt_amount: valUsdtAmount,
                usdt_sell_rate: valUsdtRate,
                payment_method: editValues.paymentMethod,
                notes: editValues.notes,
                is_private: editValues.isPrivate,
                holder_id: editValues.holderId || null,
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
                    isPrivate: editValues.isPrivate
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

                {/* Holder */}
                <div>
                    <label className="block text-sm font-medium mb-2">{t('transaction.holder')}</label>
                    <select
                        value={editValues.holderId}
                        onChange={(e) => setEditValues({ ...editValues, holderId: e.target.value })}
                        className="w-full h-12 px-4 text-base border border-input bg-background rounded-xl focus:outline-none focus:ring-2 focus:ring-primary"
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

                {/* Profit Preview */}
                <div className="bg-primary/5 rounded-2xl p-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{t('transaction.netProfit')}</span>
                        <span className={cn(
                            "text-2xl font-bold",
                            currentProfit >= 0 ? "text-green-500" : "text-red-500"
                        )}>
                            {currentProfit > 0 ? "+" : ""}{formatCurrency(currentProfit, 'LYD')}
                        </span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
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
        </BottomSheet>
    )
}
