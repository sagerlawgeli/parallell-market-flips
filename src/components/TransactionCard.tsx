import { useState, useEffect } from "react"
import { Card, CardContent } from "./ui/card"
import { formatCurrency, cn } from "../lib/utils"
import { ArrowRight, CheckCircle2, Clock, XCircle, MoreVertical, Save, X, Trash2, History, Banknote, Building2, StickyNote } from "lucide-react"
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
import { supabase } from "../lib/supabase"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

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

    // Progress Steps
    stepFiatAcquired: boolean
    stepUsdtSold: boolean
    stepFiatPaid: boolean
}

interface TransactionCardProps {
    transaction: Transaction
    onStatusChange?: () => void
}

export function TransactionCard({ transaction, onStatusChange }: TransactionCardProps) {
    const { t } = useTranslation()

    const statusConfig = {
        planned: { label: t('transaction.planned'), icon: Clock, color: "text-blue-500", bg: "bg-blue-500/10" },
        in_progress: { label: t('transaction.inProgress'), icon: Clock, color: "text-orange-500", bg: "bg-orange-500/10" },
        complete: { label: t('transaction.complete'), icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10" },
        cancelled: { label: t('transaction.cancelled'), icon: XCircle, color: "text-red-500", bg: "bg-red-500/10" },
    }

    const config = statusConfig[transaction.status] || statusConfig['planned']
    const StatusIcon = config.icon

    // Edit State
    const [isEditing, setIsEditing] = useState(false)
    const [editValues, setEditValues] = useState({
        fiatAmount: transaction.fiatAmount.toString(),
        fiatRate: transaction.fiatRate.toString(),
        usdtAmount: transaction.usdtAmount.toString(),
        usdtRate: transaction.usdtRate.toString(),
        paymentMethod: transaction.paymentMethod,
        createdAt: transaction.createdAt,
        notes: transaction.notes || ""
    })

    // Reset edit values when transaction changes
    useEffect(() => {
        setEditValues({
            fiatAmount: transaction.fiatAmount.toString(),
            fiatRate: transaction.fiatRate.toString(),
            usdtAmount: transaction.usdtAmount.toString(),
            usdtRate: transaction.usdtRate.toString(),
            paymentMethod: transaction.paymentMethod,
            createdAt: transaction.createdAt,
            notes: transaction.notes || ""
        })
        setIsEditing(false)
    }, [transaction])

    const hasChanges = () => {
        return (
            parseFloat(editValues.fiatAmount) !== transaction.fiatAmount ||
            parseFloat(editValues.fiatRate) !== transaction.fiatRate ||
            parseFloat(editValues.usdtAmount) !== transaction.usdtAmount ||
            parseFloat(editValues.usdtRate) !== transaction.usdtRate ||
            editValues.paymentMethod !== transaction.paymentMethod ||
            editValues.createdAt !== transaction.createdAt ||
            editValues.notes !== (transaction.notes || "")
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
            setIsEditing(false)
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
                updated_at: new Date().toISOString()
            }

            // 1. Update Transaction
            const { error: updateError } = await supabase
                .from('transactions')
                .update(updates)
                .eq('id', transaction.id)

            if (updateError) throw updateError

            // 2. Create Audit Log
            const changes = {
                old: {
                    fiatAmount: transaction.fiatAmount,
                    fiatRate: transaction.fiatRate,
                    usdtAmount: transaction.usdtAmount,
                    usdtRate: transaction.usdtRate,
                    paymentMethod: transaction.paymentMethod,
                    createdAt: transaction.createdAt,
                    notes: transaction.notes
                },
                new: {
                    fiatAmount: valFiatAmount,
                    fiatRate: valFiatRate,
                    usdtAmount: valUsdtAmount,
                    usdtRate: valUsdtRate,
                    paymentMethod: editValues.paymentMethod,
                    createdAt: editValues.createdAt,
                    notes: editValues.notes
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
            setIsEditing(false)
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

            // Determine new status
            let newStatus = transaction.status
            if (newValue && transaction.status === 'planned') {
                newStatus = 'in_progress'
            }

            // Check if all steps will be complete
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

            // 1. Update Status
            const { error } = await supabase
                .from('transactions')
                .update({ status: newStatus })
                .eq('id', transaction.id)

            if (error) throw error

            // 2. Log Status Change
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

    return (
        <Card className={cn("overflow-hidden transition-all hover:shadow-md border-t-primary", isEditing && "ring-2 ring-primary")}>
            <CardContent className="p-0">
                <div className="flex items-stretch">
                    {/* Status Strip */}
                    <div className={cn("w-1.5", config.bg.replace("/10", ""))} />

                    <div className="flex-1 p-4 space-y-3">
                        {/* Header */}
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-lg">{transaction.type}</span>
                                <span className="text-muted-foreground text-xs">•</span>
                                {isEditing ? (
                                    <Input
                                        type="date"
                                        value={editValues.createdAt}
                                        onChange={e => setEditValues({ ...editValues, createdAt: e.target.value })}
                                        className="h-6 text-xs w-32"
                                    />
                                ) : (
                                    <span className="text-sm text-muted-foreground">{transaction.createdAt}</span>
                                )}
                                {isEditing ? (
                                    <div className="flex gap-1">
                                        <Button
                                            size="sm"
                                            variant={editValues.paymentMethod === "bank" ? "default" : "outline"}
                                            onClick={() => setEditValues({ ...editValues, paymentMethod: "bank" })}
                                            className="h-5 text-[10px] px-2"
                                        >
                                            {t('calculator.bank')}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant={editValues.paymentMethod === "cash" ? "default" : "outline"}
                                            onClick={() => setEditValues({ ...editValues, paymentMethod: "cash" })}
                                            className="h-5 text-[10px] px-2"
                                        >
                                            {t('calculator.cash')}
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-muted text-muted-foreground text-[10px] uppercase tracking-wider font-medium">
                                        {transaction.paymentMethod === 'cash' ? <Banknote className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
                                        {transaction.paymentMethod === 'cash' ? t('calculator.cash') : t('calculator.bank')}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                {/* Status Dropdown (Direct Edit) */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className={cn("px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 hover:opacity-80 transition-opacity", statusConfig[transaction.status].bg, statusConfig[transaction.status].color)}>
                                            <StatusIcon className="h-3 w-3" />
                                            <span className="capitalize">{statusConfig[transaction.status].label}</span>
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
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

                                {/* Actions Menu */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
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

                        {/* Amounts (Editable) */}
                        <div className="flex items-center justify-between text-sm gap-4">
                            <div className="flex-1">
                                <div className="text-muted-foreground text-xs mb-0.5">{t('calculator.buy')}</div>
                                {isEditing ? (
                                    <div className="space-y-1">
                                        <Input
                                            type="number"
                                            value={editValues.fiatAmount}
                                            onChange={e => setEditValues({ ...editValues, fiatAmount: e.target.value })}
                                            className="h-7 text-sm"
                                        />
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs text-muted-foreground">@</span>
                                            <Input
                                                type="number"
                                                value={editValues.fiatRate}
                                                onChange={e => setEditValues({ ...editValues, fiatRate: e.target.value })}
                                                className="h-6 text-xs w-20"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        className="cursor-pointer hover:bg-muted/50 p-1 rounded -ml-1 transition-colors"
                                        onClick={() => setIsEditing(true)}
                                        title="Click to edit"
                                    >
                                        <div className="font-medium">{formatCurrency(transaction.fiatAmount, transaction.type)}</div>
                                        <div className="text-xs text-muted-foreground">@ {transaction.fiatRate} LYD</div>
                                    </div>
                                )}
                            </div>

                            <ArrowRight className="h-4 w-4 text-muted-foreground/50" />

                            <div className="flex-1 text-right">
                                <div className="text-muted-foreground text-xs mb-0.5">{t('calculator.sell')}</div>
                                {isEditing ? (
                                    <div className="space-y-1 flex flex-col items-end">
                                        <Input
                                            type="number"
                                            value={editValues.usdtAmount}
                                            onChange={e => setEditValues({ ...editValues, usdtAmount: e.target.value })}
                                            className="h-7 text-sm text-right"
                                        />
                                        <div className="flex items-center gap-1 justify-end">
                                            <span className="text-xs text-muted-foreground">@</span>
                                            <Input
                                                type="number"
                                                value={editValues.usdtRate}
                                                onChange={e => setEditValues({ ...editValues, usdtRate: e.target.value })}
                                                className="h-6 text-xs w-20 text-right"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        className="cursor-pointer hover:bg-muted/50 p-1 rounded -mr-1 transition-colors"
                                        onClick={() => setIsEditing(true)}
                                        title="Click to edit"
                                    >
                                        <div className="font-medium">{formatCurrency(transaction.usdtAmount, 'USD')}T</div>
                                        <div className="text-xs text-muted-foreground">@ {transaction.usdtRate} LYD</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Progress Steps */}
                        <div className="flex items-center gap-4 py-2">
                            <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={transaction.stepFiatAcquired}
                                    onChange={() => handleStepToggle('stepFiatAcquired')}
                                    className="rounded border-gray-300 text-primary focus:ring-primary h-3 w-3"
                                />
                                <span className={transaction.stepFiatAcquired ? "text-foreground font-medium" : "text-muted-foreground"}>{t('transaction.fiatAcquired')}</span>
                            </label>
                            <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={transaction.stepUsdtSold}
                                    onChange={() => handleStepToggle('stepUsdtSold')}
                                    className="rounded border-gray-300 text-primary focus:ring-primary h-3 w-3"
                                />
                                <span className={transaction.stepUsdtSold ? "text-foreground font-medium" : "text-muted-foreground"}>{t('transaction.usdtSold')}</span>
                            </label>
                            <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={transaction.stepFiatPaid}
                                    onChange={() => handleStepToggle('stepFiatPaid')}
                                    className="rounded border-gray-300 text-primary focus:ring-primary h-3 w-3"
                                />
                                <span className={transaction.stepFiatPaid ? "text-foreground font-medium" : "text-muted-foreground"}>{t('transaction.fiatPaid')}</span>
                            </label>
                        </div>

                        {/* Notes Section */}
                        {(transaction.notes || isEditing) && (
                            <div className="pt-2 border-t border-border/50">
                                {isEditing ? (
                                    <div className="space-y-1">
                                        <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t('calculator.notes')}</label>
                                        <Textarea
                                            value={editValues.notes}
                                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditValues({ ...editValues, notes: e.target.value })}
                                            className="text-xs min-h-[60px]"
                                            placeholder={t('calculator.notesPlaceholder')}
                                        />
                                    </div>
                                ) : (
                                    <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded flex gap-2 items-start">
                                        <StickyNote className="h-3 w-3 mt-0.5 shrink-0 opacity-50" />
                                        <p>{transaction.notes}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Footer / Cost, Return, Profit / Actions */}
                        <div className="pt-2 border-t border-border/50 space-y-2">
                            {isEditing ? (
                                <div className="flex items-center gap-2 w-full justify-end animate-in fade-in slide-in-from-top-1">
                                    <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} className="h-7 px-2">
                                        <X className="h-3 w-3 mr-1" /> {t('common.cancel')}
                                    </Button>
                                    <Button size="sm" onClick={handleSave} className="h-7 px-2">
                                        <Save className="h-3 w-3 mr-1" /> {t('common.update')}
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    {/* Cost and Return */}
                                    <div className="flex justify-between items-center text-xs">
                                        <div className="flex gap-4">
                                            <div>
                                                <span className="text-muted-foreground">{t('transaction.cost')}: </span>
                                                <span className="font-medium">{formatCurrency(valFiatAmount * valFiatRate, 'LYD')}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground">{t('transaction.return')}: </span>
                                                <span className="font-medium">{formatCurrency(valUsdtAmount * valUsdtRate, 'LYD')}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Net Profit */}
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-muted-foreground">{t('transaction.netProfit')}</span>
                                        <span className={cn("font-bold", currentProfit >= 0 ? "text-green-500" : "text-red-500")}>
                                            {currentProfit > 0 ? "+" : ""}{formatCurrency(currentProfit, 'LYD')}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
