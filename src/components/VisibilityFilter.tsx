import { motion } from "framer-motion"
import { Lock, Unlock, Eye } from "lucide-react"
import { cn } from "../lib/utils"
import { useUserRole } from "../hooks/useUserRole"
import { useTranslation } from "react-i18next"

export type VisibilityFilterValue = 'all' | 'private' | 'public'

interface VisibilityFilterProps {
    value: VisibilityFilterValue
    onChange: (value: VisibilityFilterValue) => void
}

export function VisibilityFilter({ value, onChange }: VisibilityFilterProps) {
    const { isAdmin } = useUserRole()
    const { t } = useTranslation()

    // Only show filter for admin users
    if (!isAdmin) return null

    const options = [
        { value: 'all' as const, label: t('filter.all'), icon: Eye },
        { value: 'private' as const, label: t('filter.private'), icon: Lock },
        { value: 'public' as const, label: t('filter.public'), icon: Unlock },
    ]

    return (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-xs sm:text-sm text-muted-foreground font-medium">
                {t('filter.visibility')}:
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
                                    layoutId="visibilityFilter"
                                    className="absolute inset-0 bg-primary rounded-xl shadow-sm"
                                    transition={{
                                        type: "spring",
                                        stiffness: 500,
                                        damping: 30
                                    }}
                                />
                            )}
                            <Icon className="h-4 w-4 relative z-10" />
                            <span className="relative z-10">{option.label}</span>
                        </motion.button>
                    )
                })}
            </div>
        </div>
    )
}
