import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent } from "./ui/card"
import { formatCurrency, cn } from "../lib/utils"
import {
    ArrowRight,
    CheckCircle2,
    Clock,
    XCircle,
    MoreVertical,
    Trash2,
    History,
    Banknote,
    Building2,
    Lock,
    User,
    Edit3
} from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator
} from "./ui/dropdown-menu"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Textarea } from "@/components/ui/textarea"
import { BottomSheet } from "./ui/bottom-sheet"
import { supabase } from "../lib/supabase"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import { useUserRole } from "../hooks/useUserRole"

export type TransactionStatus = 'planned' | 'in_progress' | 'complete' | 'cancelled'

export interface Transaction {
    id: string
    type: 'GBP' | 'EUR'
    status: TransactionStatus
    paymentMethod: 'cash' | 'bank'
    fiatAmount: number
    fiatRate: number
    usdtAmount: number
    usdtRate: number
    profit: number
    createdAt: string
    notes?: string
    isPrivate: boolean

    // Progress Steps
    stepFiatAcquired: boolean
    stepUsdtSold: boolean
    stepFiatPaid: boolean

    // Holder tracking
    holderId?: string
    holderName?: string
}

interface TransactionCardProps {
    transaction: Transaction
    onStatusChange?: () => void
}

export function TransactionCard({ transaction, onStatusChange }: TransactionCardProps) {
    const { t } = useTranslation()
    const { isAdmin } = useUserRole()

    const statusConfig = {
        planned: {
            label: t('transaction.planned'),
            icon: Clock,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
            stripColor: "bg-blue-500",
            dotColor: "bg-blue-500"
        },
        in_progress: {
            label: t('transaction.inProgress'),
            icon: Clock,
            color: "text-orange-500",
            bg: "bg-orange-500/10",
            stripColor: "bg-orange-500",
            dotColor: "bg-orange-500"
        },
        complete: {
            label: t('transaction.complete'),
            icon: CheckCircle2,
            color: "text-green-500",
            bg: "bg-green-500/10",
            stripColor: "bg-green-500",
            dotColor: "bg-green-500"
        },
        cancelled: {
            label: t('transaction.cancelled'),
            icon: XCircle,
            color: "text-red-500",
            bg: "bg-red-500/10",
            stripColor: "bg-red-500",
            dotColor: "bg-red-500"
        },
    }

    const config = statusConfig[transaction.status] || statusConfig['planned']
    const StatusIcon = config.icon

    // Helper to format date for input[type="date"]
    const formatDateForInput = (dateString: string) => {
        if (!dateString) return ''
        // If already in YYYY-MM-DD format, return as is
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return dateString
        }
        // Otherwise try to parse and format
        try {
            const date = new Date(dateString)
            return date.toISOString().split('T')[0]
        } catch {
            return dateString
        }
    }

    // Edit State
    const [isEditSheetOpen, setIsEditSheetOpen] = useState(false)
    const [editValues, setEditValues] = useState({
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

    // Holders state
    const [holders, setHolders] = useState<Array<{ id: string; name: string }>>([])

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

    // Reset edit values when transaction changes
    useEffect(() => {
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
    }, [transaction])

    const hasChanges = () => {
        return (
            parseFloat(editValues.fiatAmount) !== transaction.fiatAmount ||
            parseFloat(editValues.fiatRate) !== transaction.fiatRate ||
            parseFloat(editValues.usdtAmount) !== transaction.usdtAmount ||
            parseFloat(editValues.usdtRate) !== transaction.usdtRate ||
            editValues.paymentMethod !== transaction.paymentMethod ||
            editValues.createdAt !== transaction.createdAt ||
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
            setIsEditSheetOpen(false)
            return
        }

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const updates = {
                fiat_amount: valFiatAmount,
                fiat_buy_rate: valFiatRate,
                usdt_amount: valUsdtAmount,
                usdt_sell_rate: valUsdtRate,
                payment_method: editValues.paymentMethod,
                created_at: editValues.createdAt,
                notes: editValues.notes,
                is_private: editValues.isPrivate,
                holder_id: editValues.holderId || null,
                updated_at: new Date().toISOString()
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
            setIsEditSheetOpen(false)
            if (onStatusChange) onStatusChange()

        } catch (error) {
            console.error("Error updating transaction:", error)
            toast.error("Failed to update transaction")
        }
    }

    const handleStepToggle = async (step: 'stepFiatAcquired' | 'stepUsdtSold' | 'stepFiatPaid') => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const newValue = !transaction[step]
            const dbColumn = step === 'stepFiatAcquired' ? 'step_fiat_acquired' :
                step === 'stepUsdtSold' ? 'step_usdt_sold' : 'step_fiat_paid'

            if (step === 'stepFiatPaid' && newValue && !transaction.holderId) {
                toast.error(t('transaction.holderRequired'))
                return
            }

            let newStatus = transaction.status
            if (newValue && transaction.status === 'planned') {
                newStatus = 'in_progress'
            }

            const isFiatAcquired = step === 'stepFiatAcquired' ? newValue : transaction.stepFiatAcquired
            const isUsdtSold = step === 'stepUsdtSold' ? newValue : transaction.stepUsdtSold
            const isFiatPaid = step === 'stepFiatPaid' ? newValue : transaction.stepFiatPaid

            if (isFiatAcquired && isUsdtSold && isFiatPaid) {
                newStatus = 'complete'
            }

            const updates: any = { [dbColumn]: newValue }
            if (newStatus !== transaction.status) {
                updates.status = newStatus
            }

            const { error } = await supabase
                .from('transactions')
                .update(updates)
                .eq('id', transaction.id)

            if (error) throw error

            toast.success("Progress updated")
            if (onStatusChange) onStatusChange()
        } catch (error) {
            console.error("Error updating progress:", error)
            toast.error("Failed to update progress")
        }
    }

    const handleStatusUpdate = async (newStatus: TransactionStatus) => {
        if (newStatus === transaction.status) return

        try {
            const { data: { user } } = await supabase.auth.getUser()

            const { error } = await supabase
                .from('transactions')
                .update({ status: newStatus })
                .eq('id', transaction.id)

            if (error) throw error

            if (user) {
                await supabase.from('transaction_logs').insert({
                    transaction_id: transaction.id,
                    user_id: user.id,
                    action: 'update_status',
                    changes: { old: transaction.status, new: newStatus }
                })
            }

            toast.success(`Marked as ${statusConfig[newStatus].label}`)
            if (onStatusChange) onStatusChange()
        } catch (error) {
            console.error("Error updating status:", error)
            toast.error("Failed to update status")
        }
    }

    const handleDelete = async () => {
        if (!confirm(t('transaction.confirmDelete'))) return

        try {
            const { error } = await supabase
                .from('transactions')
                .delete()
                .eq('id', transaction.id)

            if (error) throw error

            toast.success("Transaction deleted")
            if (onStatusChange) onStatusChange()
        } catch (error) {
            console.error("Error deleting transaction:", error)
            toast.error("Failed to delete transaction")
        }
    }

    const progressPercentage = [
        transaction.stepFiatAcquired,
        transaction.stepUsdtSold,
        transaction.stepFiatPaid
    ].filter(Boolean).length / 3 * 100

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <Card className="overflow-hidden transition-all hover:shadow-lg active:scale-[0.98] border-0 shadow-sm">
                    <CardContent className="p-0">
                        <div className="flex items-stretch border-t-[4px]">
                            {/* Status Strip */}
                            <div className={cn("w-1", config.stripColor)} />

                            <div className="flex-1 p-4 md:p-5">
                                {/* Header */}
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-lg">{transaction.type}</span>
                                            <div className={cn("w-2 h-2 rounded-full", config.dotColor)} />
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span>{transaction.createdAt}</span>
                                            <span>•</span>
                                            <div className="flex items-center gap-1">
                                                {transaction.paymentMethod === 'cash' ?
                                                    <Banknote className="h-3 w-3" /> :
                                                    <Building2 className="h-3 w-3" />
                                                }
                                                {transaction.paymentMethod === 'cash' ? t('calculator.cash') : t('calculator.bank')}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setIsEditSheetOpen(true)}
                                            className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                                        >
                                            <Edit3 className="h-4 w-4" />
                                        </Button>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => setIsEditSheetOpen(true)}>
                                                    <Edit3 className="mr-2 h-4 w-4" /> Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem disabled>
                                                    <History className="mr-2 h-4 w-4" /> View History
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={handleDelete} className="text-red-500 focus:text-red-500">
                                                    <Trash2 className="mr-2 h-4 w-4" /> {t('common.delete')}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>

                                {/* Amounts */}
                                <div className="flex items-center justify-between mb-4 bg-muted/30 rounded-2xl p-4">
                                    <div className="flex-1">
                                        <div className="text-xs text-muted-foreground mb-1">{t('calculator.buy')}</div>
                                        <div className="font-semibold text-md">{formatCurrency(transaction.fiatAmount, transaction.type)}</div>
                                        <div className="text-xs text-muted-foreground">@ {transaction.fiatRate} LYD</div>
                                    </div>

                                    <ArrowRight className="h-5 w-5 text-muted-foreground/30 mx-2" />

                                    <div className="flex-1 text-right">
                                        <div className="text-xs text-muted-foreground mb-1">{t('calculator.sell')}</div>
                                        <div className="font-semibold text-md">{formatCurrency(transaction.usdtAmount, 'USD')}T</div>
                                        <div className="text-xs text-muted-foreground">@ {transaction.usdtRate} LYD</div>
                                    </div>
                                </div>

                                {/* Progress */}
                                <div className="mb-4">
                                    <div className="flex gap-2 mt-3">
                                        {[
                                            { key: 'stepFiatAcquired', label: t('transaction.fiatAcquired'), checked: transaction.stepFiatAcquired },
                                            { key: 'stepUsdtSold', label: t('transaction.usdtSold'), checked: transaction.stepUsdtSold },
                                            { key: 'stepFiatPaid', label: t('transaction.fiatPaid'), checked: transaction.stepFiatPaid }
                                        ].map(({ key, label, checked }) => (
                                            <button
                                                key={key}
                                                onClick={() => handleStepToggle(key as any)}
                                                className={cn(
                                                    "flex-1 py-2 px-3 rounded-xl text-xs font-medium transition-all",
                                                    checked
                                                        ? cn(config.bg, config.color)
                                                        : "bg-muted text-muted-foreground hover:bg-muted/80 text-orange-500"
                                                )}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Holder */}
                                {transaction.holderName && (
                                    <div className="mb-4 flex items-center gap-2 text-sm">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-muted-foreground">Holder:</span>
                                        <span className="font-medium">{transaction.holderName}</span>
                                    </div>
                                )}

                                {/* Notes */}
                                {transaction.notes && (
                                    <div className="mb-4 p-3 bg-muted/30 rounded-xl">
                                        <p className="text-xs text-muted-foreground">{transaction.notes}</p>
                                    </div>
                                )}

                                {/* Footer */}
                                <div className="flex items-center justify-between pt-3 border-t border-border/50">
                                    <div className="flex items-center gap-2">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button className={cn(
                                                    "px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all",
                                                    config.bg, config.color
                                                )}>
                                                    <StatusIcon className="h-3.5 w-3.5" />
                                                    <span>{config.label}</span>
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="start">
                                                <DropdownMenuLabel>{t('common.update')}</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => handleStatusUpdate('planned')}>
                                                    <Clock className="mr-2 h-4 w-4 text-blue-500" /> {t('transaction.planned')}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleStatusUpdate('in_progress')}>
                                                    <Clock className="mr-2 h-4 w-4 text-orange-500" /> {t('transaction.inProgress')}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleStatusUpdate('complete')}>
                                                    <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" /> {t('transaction.complete')}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleStatusUpdate('cancelled')}>
                                                    <XCircle className="mr-2 h-4 w-4 text-red-500" /> {t('transaction.cancelled')}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>

                                        {transaction.isPrivate && isAdmin && (
                                            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 text-red-500">
                                                <Lock className="h-3 w-3" />
                                                <span className="text-xs font-medium">{t('calculator.private')}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="text-right">
                                        <div className="text-xs text-muted-foreground mb-0.5">{t('transaction.netProfit')}</div>
                                        <div className={cn(
                                            "text-md font-bold",
                                            transaction.profit >= 0 ? "text-green-500" : "text-red-500"
                                        )}>
                                            {transaction.profit > 0 ? "+" : ""}{formatCurrency(transaction.profit, 'LYD')}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Edit Bottom Sheet */}
            <BottomSheet
                isOpen={isEditSheetOpen}
                onClose={() => setIsEditSheetOpen(false)}
                title="Edit Transaction"
            >
                <div className="p-6 space-y-6">
                    {/* Date */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Date</label>
                        <Input
                            type="date"
                            value={editValues.createdAt}
                            onChange={e => setEditValues({ ...editValues, createdAt: e.target.value })}
                            className="h-12 text-base"
                        />
                    </div>

                    {/* Payment Method */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Payment Method</label>
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
                            <label className="block text-xs text-muted-foreground mb-1">Amount</label>
                            <Input
                                type="number"
                                value={editValues.fiatAmount}
                                onChange={e => setEditValues({ ...editValues, fiatAmount: e.target.value })}
                                className="h-12 text-base"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-muted-foreground mb-1">Rate (LYD)</label>
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
                            <label className="block text-xs text-muted-foreground mb-1">Amount (USDT)</label>
                            <Input
                                type="number"
                                value={editValues.usdtAmount}
                                onChange={e => setEditValues({ ...editValues, usdtAmount: e.target.value })}
                                className="h-12 text-base"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-muted-foreground mb-1">Rate (LYD)</label>
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
                            placeholder={t('calculator.notesPlaceholder')}
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
                            onClick={() => setIsEditSheetOpen(false)}
                            className="flex-1 h-12 text-base rounded-xl"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={!hasChanges()}
                            className="flex-1 h-12 text-base rounded-xl"
                        >
                            Save Changes
                        </Button>
                    </div>
                </div>
            </BottomSheet>
        </>
    )
}
