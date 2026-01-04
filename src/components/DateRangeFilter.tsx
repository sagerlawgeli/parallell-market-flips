import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useTranslation } from "react-i18next"
import { cn } from "../lib/utils"
import { Input } from "./ui/input"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { ChevronDown, Calendar, History, ListFilter, Sun, CalendarRange, Clock } from "lucide-react"
import {
    startOfDay,
    endOfDay,
    subDays,
    startOfMonth,
    endOfMonth,
    subMonths
} from "date-fns"

export type DateRangePreset = 'all' | 'today' | 'yesterday' | 'this_month' | 'last_month' | 'custom'

interface DateRangeFilterProps {
    value: DateRangePreset
    onChange: (preset: DateRangePreset, range: { start: Date | null, end: Date | null }) => void
}

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
    const { t } = useTranslation()
    const [customStart, setCustomStart] = useState<string>('')
    const [customEnd, setCustomEnd] = useState<string>('')
    const startInputRef = useRef<HTMLInputElement>(null)
    const endInputRef = useRef<HTMLInputElement>(null)

    const presets: Array<{ value: DateRangePreset; label: string; icon: any }> = [
        { value: 'all', label: t('filter.allTime') || 'All Time', icon: ListFilter },
        { value: 'today', label: t('filter.today') || 'Today', icon: Sun },
        { value: 'yesterday', label: t('filter.yesterday') || 'Yesterday', icon: Clock },
        { value: 'this_month', label: t('filter.thisMonth') || 'This Month', icon: Calendar },
        { value: 'last_month', label: t('filter.lastMonth') || 'Last Month', icon: History },
        { value: 'custom', label: t('filter.custom') || 'Custom', icon: CalendarRange },
    ]

    const handlePresetChange = (preset: DateRangePreset) => {
        const now = new Date()
        let start: Date | null = null
        let end: Date | null = null

        switch (preset) {
            case 'today':
                start = startOfDay(now)
                end = endOfDay(now)
                break
            case 'yesterday':
                const yesterday = subDays(now, 1)
                start = startOfDay(yesterday)
                end = endOfDay(yesterday)
                break
            case 'this_month':
                start = startOfMonth(now)
                end = endOfMonth(now)
                break
            case 'last_month':
                const lastMonth = subMonths(now, 1)
                start = startOfMonth(lastMonth)
                end = endOfMonth(lastMonth)
                break
            case 'custom':
                start = customStart ? startOfDay(new Date(customStart)) : null
                end = customEnd ? endOfDay(new Date(customEnd)) : null
                break
            case 'all':
            default:
                start = null
                end = null
                break
        }

        onChange(preset, { start, end })
    }

    const handleCustomDateChange = (startStr: string, endStr: string) => {
        setCustomStart(startStr)
        setCustomEnd(endStr)
        if (value === 'custom') {
            const start = startStr ? startOfDay(new Date(startStr)) : null
            const end = endStr ? endOfDay(new Date(endStr)) : null
            onChange('custom', { start, end })
        }
    }

    const currentPreset = presets.find(p => p.value === value) || presets[0]
    const Icon = currentPreset.icon

    return (
        <div className="flex flex-col gap-2 w-full">
            <div className="flex items-center overflow-x-auto pb-1 scrollbar-none">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            className={cn(
                                "flex items-center gap-1.5 px-2 py-1.5 rounded-xl border border-border/50 bg-muted/30 text-[10px] sm:text-xs font-bold uppercase tracking-tighter hover:bg-muted/50 transition-all whitespace-nowrap",
                                value !== 'all' ? "text-primary border-primary/30 bg-primary/5" : "text-foreground"
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            <span>{currentPreset.label}</span>
                            <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48 rounded-xl p-1">
                        <DropdownMenuRadioGroup value={value} onValueChange={(v) => handlePresetChange(v as DateRangePreset)}>
                            {presets.map((preset) => (
                                <DropdownMenuRadioItem
                                    key={preset.value}
                                    value={preset.value}
                                    className="flex items-center gap-2 rounded-lg py-2 px-3 text-sm cursor-pointer"
                                >
                                    <preset.icon className="h-4 w-4 opacity-70" />
                                    <span className="font-medium">{preset.label}</span>
                                </DropdownMenuRadioItem>
                            ))}
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <AnimatePresence>
                {value === 'custom' && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="flex flex-col sm:flex-row gap-3 p-4 bg-muted/20 rounded-2xl border border-muted/30 mt-2">
                            <div className="flex-1 space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground ml-1">
                                    {t('common.from') || 'From'}
                                </label>
                                <div
                                    className="relative cursor-pointer"
                                    onClick={() => startInputRef.current?.showPicker()}
                                >
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                    <Input
                                        ref={startInputRef}
                                        type="date"
                                        value={customStart}
                                        onChange={(e) => handleCustomDateChange(e.target.value, customEnd)}
                                        className="h-11 rounded-xl bg-background pl-10 cursor-pointer"
                                    />
                                </div>
                            </div>
                            <div className="flex-1 space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground ml-1">
                                    {t('common.to') || 'To'}
                                </label>
                                <div
                                    className="relative cursor-pointer"
                                    onClick={() => endInputRef.current?.showPicker()}
                                >
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                    <Input
                                        ref={endInputRef}
                                        type="date"
                                        value={customEnd}
                                        onChange={(e) => handleCustomDateChange(customStart, e.target.value)}
                                        className="h-11 rounded-xl bg-background pl-10 cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
