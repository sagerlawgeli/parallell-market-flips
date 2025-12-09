import { useUserRole } from "../hooks/useUserRole"
import { Button } from "./ui/button"
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

    return (
        <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground font-medium">{t('filter.visibility')}:</span>
            <div className="inline-flex rounded-md shadow-sm" role="group">
                <Button
                    type="button"
                    variant={value === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onChange('all')}
                    className="rounded-r-none"
                >
                    {t('filter.all')}
                </Button>
                <Button
                    type="button"
                    variant={value === 'private' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onChange('private')}
                    className="rounded-none border-l-0"
                >
                    {t('filter.private')}
                </Button>
                <Button
                    type="button"
                    variant={value === 'public' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onChange('public')}
                    className="rounded-l-none border-l-0"
                >
                    {t('filter.public')}
                </Button>
            </div>
        </div>
    )
}
