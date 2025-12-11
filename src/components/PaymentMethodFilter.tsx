import { Button } from "./ui/button"
import { useTranslation } from "react-i18next"

export type PaymentMethodFilterValue = 'all' | 'cash' | 'bank'

interface PaymentMethodFilterProps {
    value: PaymentMethodFilterValue
    onChange: (value: PaymentMethodFilterValue) => void
}

export function PaymentMethodFilter({ value, onChange }: PaymentMethodFilterProps) {
    const { t } = useTranslation()

    return (
        <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground font-medium">{t('filter.paymentMethod')}:</span>
            <div className="inline-flex rounded-md shadow-sm" role="group">
                <Button
                    type="button"
                    variant={value === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onChange('all')}
                    className="rounded-r-none"
                >
                    {t('filter.allPayments')}
                </Button>
                <Button
                    type="button"
                    variant={value === 'cash' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onChange('cash')}
                    className="rounded-none border-l-0"
                >
                    {t('calculator.cash')}
                </Button>
                <Button
                    type="button"
                    variant={value === 'bank' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onChange('bank')}
                    className="rounded-l-none border-l-0"
                >
                    {t('calculator.bank')}
                </Button>
            </div>
        </div>
    )
}
