import { useState } from "react"
import { supabase } from "../lib/supabase"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

export function useHolderNotes(onSuccess: () => void) {
    const { t } = useTranslation()
    const [addingNote, setAddingNote] = useState<string | null>(null)

    const addNote = async (holderId: string, content: string) => {
        if (!content.trim()) return

        setAddingNote(holderId)
        try {
            const { error } = await supabase
                .from('holder_notes')
                .insert({
                    holder_id: holderId,
                    content: content.trim()
                })

            if (error) throw error

            toast.success(t('holdersSummary.noteAdded'))
            onSuccess()
        } catch (error) {
            console.error('Error adding note:', error)
            toast.error(t('holdersSummary.noteError'))
        } finally {
            setAddingNote(null)
        }
    }

    return { addNote, addingNote }
}
