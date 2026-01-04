import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent } from "./ui/card"
import { formatCurrency, cn, getDisplayId } from "../lib/utils"
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
    Edit3,
    ArrowDownRight,
    ArrowUpRight,
    Share2,
    MessageSquare,
    RefreshCw
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
import { TransactionEditDrawer } from "./TransactionEditDrawer"
import { HolderSelectionDialog } from "./HolderSelectionDialog"

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
    seqId?: number
    isHybrid?: boolean
    usdtSellRateBank?: number
}

interface TransactionCardProps {
    transaction: Transaction
    onStatusChange?: () => void
    readOnly?: boolean
}

export function TransactionCard({ transaction, onStatusChange, readOnly = false }: TransactionCardProps) {
    const { t, i18n } = useTranslation()
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



    const [isEditSheetOpen, setIsEditSheetOpen] = useState(false)
    const [isHolderDialogOpen, setIsHolderDialogOpen] = useState(false)

    const handleStepToggle = async (step: 'stepFiatAcquired' | 'stepUsdtSold' | 'stepFiatPaid') => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const newValue = !transaction[step]

            // If trying to mark as paid but no holder, open selection dialog
            if (step === 'stepFiatPaid' && newValue && !transaction.holderId) {
                setIsHolderDialogOpen(true)
                return
            }

            const dbColumn = step === 'stepFiatAcquired' ? 'step_fiat_acquired' :
                step === 'stepUsdtSold' ? 'step_usdt_sold' : 'step_fiat_paid'

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

    const handleHolderSelection = async (holderId: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // 1. Update holder
            // 2. Mark step_fiat_paid as true
            // 3. Update status if needed

            let newStatus = transaction.status
            if (transaction.status === 'planned') {
                newStatus = 'in_progress'
            }

            const isFiatAcquired = transaction.stepFiatAcquired
            const isUsdtSold = transaction.stepUsdtSold
            const isFiatPaid = true // We are setting this to true

            if (isFiatAcquired && isUsdtSold && isFiatPaid) {
                newStatus = 'complete'
            }

            const updates: any = {
                holder_id: holderId,
                step_fiat_paid: true,
                status: newStatus
            }

            const { error } = await supabase
                .from('transactions')
                .update(updates)
                .eq('id', transaction.id)

            if (error) throw error

            setIsHolderDialogOpen(false)
            toast.success(t('transaction.holderAssigned') || "Holder assigned and marked as paid")
            if (onStatusChange) onStatusChange()

        } catch (error) {
            console.error("Error assigning holder:", error)
            toast.error("Failed to assign holder")
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

    const shareTransaction = async (type: 'text' | 'link') => {
        const baseUrl = window.location.origin
        const displayId = getDisplayId(transaction.seqId, transaction.paymentMethod)
        const shareUrl = `${baseUrl}/t/${displayId}`
        // Preview URL uses the Supabase Edge Function to serve meta tags
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '')
        const previewUrl = `${supabaseUrl}/functions/v1/transaction-preview?id=${displayId}`

        if (type === 'link') {
            await navigator.clipboard.writeText(shareUrl)
            toast.success(t('common.linkCopied') || "Link copied to clipboard")
            return
        }

        const cost = transaction.fiatAmount * transaction.fiatRate
        const returns = transaction.usdtAmount * transaction.usdtRate
        const date = new Date(transaction.createdAt).toLocaleString('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short'
        })


        const message = i18n.language === 'ar'
            ? `📦 *تفاصيل المعاملة - ${displayId}*\n\n` +
            `🕒 *الحالة:* ${t(`transaction.${transaction.status}`)}\n` +
            `💰 *التكلفة:* ${formatCurrency(cost, 'LYD')}\n` +
            `📈 *العائد:* ${formatCurrency(returns, 'LYD')}\n` +
            `💵 *الربح:* ${formatCurrency(transaction.profit, 'LYD')}\n` +
            `📅 *التاريخ:* ${date}\n\n` +
            `🔗 *الرابط:* ${previewUrl}`
            : `📦 *Transaction Details - ${displayId}*\n\n` +
            `🕒 *Status:* ${t(`transaction.${transaction.status}`)}\n` +
            `💰 *Cost:* ${formatCurrency(cost, 'LYD')}\n` +
            `📈 *Return:* ${formatCurrency(returns, 'LYD')}\n` +
            `💵 *Profit:* ${formatCurrency(transaction.profit, 'LYD')}\n` +
            `📅 *Date:* ${date}\n\n` +
            `🔗 *Link:* ${previewUrl}`

        await navigator.clipboard.writeText(message)
        toast.success(t('common.copiedToWhatsapp') || "Formatted for WhatsApp & copied!")
    }

    const potentialCashProfit = transaction.isHybrid
        ? (transaction.usdtAmount * transaction.usdtRate) - (transaction.fiatAmount * transaction.fiatRate)
        : null

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <Card className="overflow-hidden transition-all hover:shadow-xl active:scale-[0.98] border border-white/5 shadow-md bg-card/50 backdrop-blur-sm">
                    <CardContent className="p-0">
                        <div className="relative border-t-[4px]">
                            {/* Status Strip */}
                            <div className={cn("absolute top-0 bottom-0 start-0 w-1", config.stripColor)} />

                            <div className="p-3.5 md:p-5 ps-4 md:ps-6">
                                {/* Header */}
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <span className="font-bold text-base md:text-lg">{transaction.type}</span>
                                            <div className={cn("w-2 h-2 rounded-full", config.dotColor)} />
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px] font-bold text-foreground/70 tracking-wider">
                                                {getDisplayId(transaction.seqId, transaction.paymentMethod)}
                                            </span>
                                            <span>{transaction.createdAt}</span>
                                            <span>•</span>
                                            <div className="flex items-center gap-1 shrink-0">
                                                {transaction.paymentMethod === 'cash' ?
                                                    <Banknote className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> :
                                                    <Building2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                                }
                                                <div className="flex items-center gap-1.5">
                                                    <span className="whitespace-nowrap">
                                                        {transaction.paymentMethod === 'cash' ? t('calculator.cash') : t('calculator.bank')}
                                                    </span>
                                                    {transaction.isHybrid && (
                                                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-purple-500/30 bg-purple-500/5 text-purple-600 dark:text-purple-400 text-[9px] font-bold uppercase tracking-wider">
                                                            <RefreshCw className="h-2 w-2" />
                                                            {t('transaction.hybrid')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {!readOnly && (
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => shareTransaction('text')}
                                                className="h-8 w-8 hover:bg-green-500/10 hover:text-green-600 transition-colors"
                                                title={t('common.shareWhatsapp') || "Share to WhatsApp"}
                                            >
                                                <MessageSquare className="h-4 w-4" />
                                            </Button>

                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => shareTransaction('link')}
                                                className="h-8 w-8 hover:bg-blue-500/10 hover:text-blue-600 transition-colors"
                                                title={t('common.copyLink') || "Copy Public Link"}
                                            >
                                                <Share2 className="h-4 w-4" />
                                            </Button>

                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setIsEditSheetOpen(true)}
                                                className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                                                title={t('common.edit') || "Edit"}
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
                                                        <Edit3 className="mr-2 h-4 w-4" /> {t('common.edit')}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => shareTransaction('text')}>
                                                        <MessageSquare className="mr-2 h-4 w-4" /> {t('common.shareWhatsapp') || "Share to WhatsApp"}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => shareTransaction('link')}>
                                                        <Share2 className="mr-2 h-4 w-4" /> {t('common.copyLink') || "Copy Public Link"}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem disabled>
                                                        <History className="mr-2 h-4 w-4" /> {t('transaction.viewHistory')}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={handleDelete} className="text-red-500 focus:text-red-500">
                                                        <Trash2 className="mr-2 h-4 w-4" /> {t('common.delete')}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    )}
                                </div>

                                {/* Amounts */}
                                <div className="flex items-center justify-between mb-4 bg-muted/30 rounded-2xl p-3 md:p-4">
                                    <div className="flex-1">
                                        <div className="text-xs text-muted-foreground mb-1">{t('calculator.buy')}</div>
                                        <div className="font-bold text-sm md:text-md truncate">{formatCurrency(transaction.fiatAmount, transaction.type)}</div>
                                        <div className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">@ {transaction.fiatRate} LYD</div>
                                    </div>

                                    <ArrowRight className="h-5 w-5 text-muted-foreground/30 mx-2" />

                                    <div className="flex-1 text-right">
                                        <div className="text-xs text-muted-foreground mb-1">
                                            {transaction.isHybrid ? `${t('calculator.sell')} (${t('calculator.cash')})` : t('calculator.sell')}
                                        </div>
                                        <div className="font-bold text-sm md:text-md truncate">{formatCurrency(transaction.usdtAmount, 'USD')}T</div>
                                        <div className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">@ {transaction.usdtRate} LYD</div>
                                    </div>
                                </div>

                                {transaction.isHybrid && (
                                    <div className="mb-4 bg-primary/5 border border-primary/10 rounded-2xl p-3 md:p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-[8px] uppercase tracking-wider font-bold text-primary/70 mb-1">{t('transaction.bankProfitPath')}</div>
                                                <div className="text-xs font-medium">{t('calculator.hybridDesc')}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs font-bold text-primary">{transaction.usdtSellRateBank} LYD</div>
                                                <div className="text-[8px] text-muted-foreground">{t('transaction.bankRealized')}</div>
                                            </div>
                                        </div>

                                        <div className="pt-2 border-t border-primary/10 flex justify-between text-[10px] text-muted-foreground gap-2">
                                            <div className="flex flex-col">
                                                <span>{t('calculator.usdtToCover')}</span>
                                                <span className="font-mono font-bold text-foreground">
                                                    {((transaction.fiatAmount * transaction.fiatRate) / transaction.usdtRate).toFixed(1)} USDT
                                                </span>
                                            </div>
                                            <div className="flex flex-col text-right">
                                                <span>{t('calculator.usdtSurplus')}</span>
                                                <span className="font-mono font-bold text-primary">
                                                    {(transaction.usdtAmount - ((transaction.fiatAmount * transaction.fiatRate) / transaction.usdtRate)).toFixed(1)} USDT
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Progress */}
                                <div className="mb-4">
                                    <div className="flex gap-1.5 mt-3">
                                        {[
                                            { key: 'stepFiatAcquired', label: t('transaction.fiatAcquired'), checked: transaction.stepFiatAcquired },
                                            { key: 'stepUsdtSold', label: t('transaction.usdtSold'), checked: transaction.stepUsdtSold },
                                            { key: 'stepFiatPaid', label: t('transaction.fiatPaid'), checked: transaction.stepFiatPaid }
                                        ].map(({ key, label, checked }) => (
                                            <button
                                                key={key}
                                                onClick={() => !readOnly && handleStepToggle(key as any)}
                                                className={cn(
                                                    "flex-1 py-1.5 px-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all uppercase tracking-tight",
                                                    checked
                                                        ? "bg-green-500/10 text-green-500 border border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]"
                                                        : "bg-muted text-muted-foreground hover:bg-muted/80 border border-transparent",
                                                    readOnly && "cursor-default pointer-events-none"
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
                                        <span className="text-muted-foreground">{t('transaction.holder')}:</span>
                                        <span className="font-medium">{transaction.holderName}</span>
                                    </div>
                                )}

                                {/* Notes */}
                                {transaction.notes && (
                                    <div className="mb-4 p-3 bg-muted/30 rounded-xl">
                                        <p className="text-xs text-muted-foreground">{transaction.notes}</p>
                                    </div>
                                )}

                                {/* Cost & Return Summary */}
                                <div className="flex flex-col gap-2 text-xs mb-3 px-1">
                                    <div className="flex items-center justify-between text-muted-foreground/80">
                                        <div className="flex items-center gap-1.5">
                                            <div className="p-1 rounded-md bg-red-500/10 text-red-500/80">
                                                <ArrowDownRight className="h-3 w-3" />
                                            </div>
                                            <span>{t('calculator.cost')}:</span>
                                        </div>
                                        <span className="font-mono font-medium text-foreground/80">{formatCurrency(transaction.fiatAmount * transaction.fiatRate, 'LYD')}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-muted-foreground/80">
                                        <div className="flex items-center gap-1.5">
                                            <div className="p-1 rounded-md bg-green-500/10 text-green-500/80">
                                                <ArrowUpRight className="h-3 w-3" />
                                            </div>
                                            <span>{t('calculator.return')}:</span>
                                        </div>
                                        <span className="font-mono font-medium text-foreground/80">{formatCurrency(transaction.usdtAmount * transaction.usdtRate, 'LYD')}</span>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="flex items-center justify-between pt-3 border-t border-border/50">
                                    <div className="flex items-center gap-2">
                                        {readOnly ? (
                                            <div className={cn(
                                                "px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all",
                                                config.bg, config.color
                                            )}>
                                                <StatusIcon className="h-3.5 w-3.5" />
                                                <span>{config.label}</span>
                                            </div>
                                        ) : (
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
                                        )}

                                        {transaction.isPrivate && isAdmin && !readOnly && (
                                            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 text-red-500">
                                                <Lock className="h-3 w-3" />
                                                <span className="text-xs font-medium">{t('calculator.private')}</span>
                                            </div>
                                        )}
                                        {transaction.isHybrid && (
                                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-purple-500/30 bg-purple-500/5 text-purple-600 dark:text-purple-400 text-[9px] font-bold uppercase tracking-wider">
                                                <RefreshCw className="h-3 w-3" />
                                                <span className="text-xs font-bold uppercase tracking-tighter">{t('transaction.hybrid')}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="text-right shrink-0">
                                        <div className="text-xs text-muted-foreground mb-0.5">{t('transaction.netProfit')}</div>
                                        <div className={cn(
                                            "text-md font-bold break-words",
                                            transaction.profit >= 0 ? "text-green-500" : "text-red-500"
                                        )}>
                                            {transaction.profit > 0 ? "+" : ""}{formatCurrency(transaction.profit, 'LYD')}
                                        </div>
                                        {transaction.isHybrid && potentialCashProfit !== null && (
                                            <div className="flex items-center justify-end gap-1.5 mt-0.5">
                                                <div className="text-[10px] text-muted-foreground/40 line-through">
                                                    {potentialCashProfit > 0 ? "+" : ""}{formatCurrency(potentialCashProfit, 'LYD')}
                                                </div>
                                                <div className="text-[10px] text-primary/80 font-bold bg-primary/10 px-1 rounded-sm border border-primary/20">
                                                    +{formatCurrency(transaction.profit - potentialCashProfit, 'LYD')}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Edit Bottom Sheet */}
            <TransactionEditDrawer
                transaction={transaction}
                isOpen={isEditSheetOpen}
                onClose={() => setIsEditSheetOpen(false)}
                onUpdate={onStatusChange}
            />

            <HolderSelectionDialog
                isOpen={isHolderDialogOpen}
                onClose={() => setIsHolderDialogOpen(false)}
                onSelect={handleHolderSelection}
            />
        </>
    )
}
