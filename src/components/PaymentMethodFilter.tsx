import { motion } from "framer-motion"
import { Banknote, Building2 } from "lucide-react"
import { cn } from "../lib/utils"
import { useTranslation } from "react-i18next"

export type PaymentMethodFilterValue = 'all' | 'cash' | 'bank'

interface PaymentMethodFilterProps {
    value: PaymentMethodFilterValue
    onChange: (value: PaymentMethodFilterValue) => void
}

export function PaymentMethodFilter({ value, onChange }: PaymentMethodFilterProps) {
    const { t } = useTranslation()

    const options = [
        { value: 'all' as const, label: t('filter.allPayments'), icon: null },
        { value: 'cash' as const, label: t('calculator.cash'), icon: Banknote },
        { value: 'bank' as const, label: t('calculator.bank'), icon: Building2 },
    ]

    return (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-xs sm:text-sm text-muted-foreground font-medium">
                {t('filter.paymentMethod')}:
            </span>
            <div className="inline-flex gap-2 p-1 bg-muted/30 rounded-2xl">
                {options.map((option) => {
                    const isActive = value === option.value
                    const Icon = option.icon

                    return (
                        <motion.button
                            key={option.value}
                            onClick={() => onChange(option.value)}
                            className={cn(
                                "relative px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5",
                                isActive
                                    ? "text-primary-foreground"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                            whileTap={{ scale: 0.95 }}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="paymentMethodFilter"
                                    className="absolute inset-0 bg-primary rounded-xl shadow-sm"
                                    transition={{
                                        type: "spring",
                                        stiffness: 500,
                                        damping: 30
                                    }}
                                />
                            )}
                            {Icon && <Icon className="h-4 w-4 relative z-10" />}
                            <span className="relative z-10">{option.label}</span>
                        </motion.button>
                    )
                })}
            </div>
        </div>
    )
}
