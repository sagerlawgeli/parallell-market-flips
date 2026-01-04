import { useTranslation } from "react-i18next"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { ChevronDown, Banknote, Building2, Filter, RefreshCw } from "lucide-react"
import { cn } from "../lib/utils"

export type PaymentMethodFilterValue = 'all' | 'cash' | 'bank' | 'hybrid'

interface PaymentMethodFilterProps {
    value: PaymentMethodFilterValue
    onChange: (value: PaymentMethodFilterValue) => void
}

export function PaymentMethodFilter({ value, onChange }: PaymentMethodFilterProps) {
    const { t } = useTranslation()

    const options = [
        { value: 'all' as const, label: t('filter.paymentMethod'), icon: Filter },
        { value: 'cash' as const, label: t('calculator.cash'), icon: Banknote },
        { value: 'bank' as const, label: t('calculator.bank'), icon: Building2 },
        { value: 'hybrid' as const, label: t('calculator.hybrid'), icon: RefreshCw },
    ]

    const currentOption = options.find(o => o.value === value) || options[0]
    const Icon = currentOption.icon

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    className={cn(
                        "flex items-center gap-1.5 px-2 py-1.5 rounded-xl border text-[10px] sm:text-xs font-bold uppercase tracking-tighter hover:bg-muted/50 transition-all whitespace-nowrap",
                        value === 'hybrid' ? "text-purple-500 border-purple-500/30 bg-purple-500/5" :
                            value !== 'all' ? "text-orange-500 border-orange-500/30 bg-orange-500/5" :
                                "text-foreground border-border/50 bg-muted/30"
                    )}
                >
                    <Icon className="h-4 w-4" />
                    <span>{currentOption.label}</span>
                    <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 rounded-xl p-1">
                <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(v as PaymentMethodFilterValue)}>
                    {options.map((option) => (
                        <DropdownMenuRadioItem
                            key={option.value}
                            value={option.value}
                            className="flex items-center gap-2 rounded-lg py-2 px-3 text-sm cursor-pointer"
                        >
                            <option.icon className="h-4 w-4 opacity-70" />
                            <span className="font-medium">{option.label}</span>
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
