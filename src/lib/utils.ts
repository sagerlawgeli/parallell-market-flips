import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount)
}

export function getDisplayId(seqId: number | undefined, paymentMethod: string) {
    if (!seqId) return ''
    const prefix = paymentMethod === 'cash' ? 'CSH' : 'BNK'
    return `${prefix}-${seqId}`
}
