import { useTranslation } from "react-i18next"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { ChevronDown, Clock, CheckCircle2, ListFilter } from "lucide-react"
import { cn } from "../lib/utils"

export type StatusFilterValue = 'all' | 'active' | 'done'

interface StatusFilterProps {
    value: StatusFilterValue
    onChange: (value: StatusFilterValue) => void
}

export function StatusFilter({ value, onChange }: StatusFilterProps) {
    const { t } = useTranslation()

    const options = [
        { value: 'all' as const, label: t('filter.status'), icon: ListFilter },
        { value: 'active' as const, label: t('filter.active'), icon: Clock },
        { value: 'done' as const, label: t('filter.done'), icon: CheckCircle2 },
    ]

    const currentOption = options.find(o => o.value === value) || options[0]
    const Icon = currentOption.icon

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    className={cn(
                        "flex items-center gap-1.5 px-2 py-1.5 rounded-xl border border-border/50 bg-muted/30 text-[10px] sm:text-xs font-bold uppercase tracking-tighter hover:bg-muted/50 transition-all whitespace-nowrap",
                        value !== 'all' ? "text-primary border-primary/30 bg-primary/5" : "text-foreground"
                    )}
                >
                    <Icon className="h-4 w-4" />
                    <span>{currentOption.label}</span>
                    <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 rounded-xl p-1">
                <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(v as StatusFilterValue)}>
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
