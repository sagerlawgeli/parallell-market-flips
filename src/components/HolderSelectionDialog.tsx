import { useState, useEffect } from "react"
import { BottomSheet } from "./ui/bottom-sheet"
import { Button } from "./ui/button"
import { supabase } from "../lib/supabase"
import { useTranslation } from "react-i18next"
import { User } from "lucide-react"
import { cn } from "../lib/utils"

interface HolderSelectionDialogProps {
    isOpen: boolean
    onClose: () => void
    onSelect: (holderId: string) => void
}

export function HolderSelectionDialog({ isOpen, onClose, onSelect }: HolderSelectionDialogProps) {
    const { t } = useTranslation()
    const [holders, setHolders] = useState<Array<{ id: string; name: string }>>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (isOpen) {
            fetchHolders()
        }
    }, [isOpen])

    const fetchHolders = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('holders')
            .select('id, name')
            .order('name', { ascending: true })

        if (!error && data) {
            setHolders(data)
        }
        setLoading(false)
    }

    return (
        <BottomSheet
            isOpen={isOpen}
            onClose={onClose}
            title={t('transaction.selectHolder') || "Select Holder"}
        >
            <div className="p-6 space-y-4">
                <p className="text-sm text-muted-foreground">
                    {t('transaction.holderRequired') || "Please select a holder to mark this transaction as paid."}
                </p>

                <div className="grid gap-2 max-h-[60vh] overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : holders.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            {t('transaction.noHolders') || "No holders found"}
                        </div>
                    ) : (
                        holders.map((holder) => (
                            <button
                                key={holder.id}
                                onClick={() => onSelect(holder.id)}
                                className={cn(
                                    "flex items-center gap-3 p-4 rounded-xl border border-border/50 bg-card hover:bg-accent/50 transition-all text-left group"
                                )}
                            >
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                    <User className="h-5 w-5" />
                                </div>
                                <span className="font-medium text-base">{holder.name}</span>
                            </button>
                        ))
                    )}
                </div>

                <Button
                    variant="outline"
                    onClick={onClose}
                    className="w-full h-12 text-base rounded-xl mt-2"
                >
                    {t('common.cancel')}
                </Button>
            </div>
        </BottomSheet>
    )
}
