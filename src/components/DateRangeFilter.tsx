import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Calendar } from "lucide-react"
import { cn } from "../lib/utils"
import { useTranslation } from "react-i18next"
import { Input } from "./ui/input"
import {
    startOfDay,
    endOfDay,
    subDays,
    startOfWeek,
    endOfWeek,
    subWeeks,
    startOfMonth,
    endOfMonth,
    subMonths
} from "date-fns"

export type DateRangePreset = 'all' | 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom'

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

    const presets: Array<{ value: DateRangePreset; label: string }> = [
        { value: 'all', label: t('filter.allTime') || 'All Time' },
        { value: 'today', label: t('filter.today') || 'Today' },
        { value: 'yesterday', label: t('filter.yesterday') || 'Yesterday' },
        { value: 'this_week', label: t('filter.thisWeek') || 'This Week' },
        { value: 'last_week', label: t('filter.lastWeek') || 'Last Week' },
        { value: 'this_month', label: t('filter.thisMonth') || 'This Month' },
        { value: 'last_month', label: t('filter.lastMonth') || 'Last Month' },
        { value: 'custom', label: t('filter.custom') || 'Custom' },
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
            case 'this_week':
                start = startOfWeek(now, { weekStartsOn: 1 })
                end = endOfWeek(now, { weekStartsOn: 1 })
                break
            case 'last_week':
                const lastWeek = subWeeks(now, 1)
                start = startOfWeek(lastWeek, { weekStartsOn: 1 })
                end = endOfWeek(lastWeek, { weekStartsOn: 1 })
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

    return (
        <div className="flex flex-col gap-2 w-full">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
                <div className="flex items-center gap-2 p-1 bg-muted/30 rounded-2xl min-w-max">
                    {presets.map((preset) => {
                        const isActive = value === preset.value
                        return (
                            <motion.button
                                key={preset.value}
                                onClick={() => handlePresetChange(preset.value)}
                                className={cn(
                                    "relative px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 whitespace-nowrap",
                                    isActive
                                        ? "text-primary-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                                whileTap={{ scale: 0.95 }}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="dateRangeFilter"
                                        className="absolute inset-0 bg-primary rounded-xl"
                                        transition={{
                                            type: "spring",
                                            stiffness: 500,
                                            damping: 30
                                        }}
                                    />
                                )}
                                <span className="relative z-10">{preset.label}</span>
                            </motion.button>
                        )
                    })}
                </div>
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
