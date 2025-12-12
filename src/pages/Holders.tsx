import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "../lib/supabase"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Card, CardContent } from "../components/ui/card"
import { Trash2, Edit2, Plus, Save, User } from "lucide-react"
import { BottomSheet } from "../components/ui/bottom-sheet"
import type { Holder } from "../lib/types"

export default function HoldersPage() {
    const { t } = useTranslation()
    const [holders, setHolders] = useState<Holder[]>([])
    const [loading, setLoading] = useState(true)
    const [editingHolder, setEditingHolder] = useState<Holder | null>(null)
    const [editName, setEditName] = useState("")
    const [isAddSheetOpen, setIsAddSheetOpen] = useState(false)
    const [newHolderName, setNewHolderName] = useState("")

    useEffect(() => {
        fetchHolders()
    }, [])

    const fetchHolders = async () => {
        try {
            const { data, error } = await supabase
                .from('holders')
                .select('*')
                .order('name', { ascending: true })

            if (error) throw error

            const formattedHolders: Holder[] = data.map((h: any) => ({
                id: h.id,
                name: h.name,
                createdAt: h.created_at,
                createdBy: h.created_by
            }))

            setHolders(formattedHolders)
        } catch (error) {
            console.error('Error fetching holders:', error)
            toast.error(t('holders.fetchError'))
        } finally {
            setLoading(false)
        }
    }

    const handleAdd = async () => {
        if (!newHolderName.trim()) {
            toast.error(t('holders.nameRequired'))
            return
        }

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { error } = await supabase
                .from('holders')
                .insert({
                    name: newHolderName.trim(),
                    created_by: user.id
                })

            if (error) throw error

            toast.success(t('holders.addSuccess'))
            setNewHolderName("")
            setIsAddSheetOpen(false)
            fetchHolders()
        } catch (error: any) {
            console.error('Error adding holder:', error)
            if (error.code === '23505') {
                toast.error(t('holders.duplicateName'))
            } else {
                toast.error(t('holders.addError'))
            }
        }
    }

    const handleUpdate = async () => {
        if (!editName.trim() || !editingHolder) {
            toast.error(t('holders.nameRequired'))
            return
        }

        try {
            const { error } = await supabase
                .from('holders')
                .update({ name: editName.trim() })
                .eq('id', editingHolder.id)

            if (error) throw error

            toast.success(t('holders.updateSuccess'))
            setEditingHolder(null)
            setEditName("")
            fetchHolders()
        } catch (error: any) {
            console.error('Error updating holder:', error)
            if (error.code === '23505') {
                toast.error(t('holders.duplicateName'))
            } else {
                toast.error(t('holders.updateError'))
            }
        }
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(t('holders.confirmDelete', { name }))) return

        try {
            const { error } = await supabase
                .from('holders')
                .delete()
                .eq('id', id)

            if (error) throw error

            toast.success(t('holders.deleteSuccess'))
            fetchHolders()
        } catch (error) {
            console.error('Error deleting holder:', error)
            toast.error(t('holders.deleteError'))
        }
    }

    const startEdit = (holder: Holder) => {
        setEditingHolder(holder)
        setEditName(holder.name)
    }

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
            >
                {/* Header */}
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{t('holders.title')}</h1>
                            <p className="text-muted-foreground text-sm md:text-base mt-1">
                                {t('holders.subtitle')}
                            </p>
                        </div>
                        <Button onClick={() => setIsAddSheetOpen(true)} className="rounded-xl">
                            <Plus className="h-4 w-4 mr-2" />
                            {t('holders.addNew')}
                        </Button>
                    </div>
                </div>

                {/* Holders List */}
                <div className="grid gap-3">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="text-center">
                                <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                <p className="text-muted-foreground">{t('common.loading')}</p>
                            </div>
                        </div>
                    ) : holders.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-20"
                        >
                            <div className="mx-auto w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                                <User className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <p className="text-muted-foreground text-lg">{t('holders.noHolders')}</p>
                        </motion.div>
                    ) : (
                        <AnimatePresence mode="popLayout">
                            {holders.map((holder, index) => (
                                <motion.div
                                    key={holder.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <Card className="border-0 shadow-sm hover:shadow-md transition-all">
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                        <User className="h-5 w-5 text-primary" />
                                                    </div>
                                                    <span className="font-semibold text-lg">{holder.name}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                                        <Button
                                                            onClick={() => startEdit(holder)}
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-9 w-9 rounded-xl"
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </Button>
                                                    </motion.div>
                                                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                                        <Button
                                                            onClick={() => handleDelete(holder.id, holder.name)}
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-9 w-9 rounded-xl text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </motion.div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    )}
                </div>
            </motion.div>

            {/* Add Holder Bottom Sheet */}
            <BottomSheet
                isOpen={isAddSheetOpen}
                onClose={() => {
                    setIsAddSheetOpen(false)
                    setNewHolderName("")
                }}
                title={t('holders.addNew')}
            >
                <div className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium mb-2">{t('holders.name')}</label>
                        <Input
                            value={newHolderName}
                            onChange={(e) => setNewHolderName(e.target.value)}
                            placeholder={t('holders.namePlaceholder')}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAdd()
                            }}
                            className="h-12 text-base rounded-xl"
                            autoFocus
                        />
                    </div>

                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsAddSheetOpen(false)
                                setNewHolderName("")
                            }}
                            className="flex-1 h-12 text-base rounded-xl"
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button
                            onClick={handleAdd}
                            className="flex-1 h-12 text-base rounded-xl"
                        >
                            <Save className="h-4 w-4 mr-2" />
                            {t('common.save')}
                        </Button>
                    </div>
                </div>
            </BottomSheet>

            {/* Edit Holder Bottom Sheet */}
            <BottomSheet
                isOpen={!!editingHolder}
                onClose={() => {
                    setEditingHolder(null)
                    setEditName("")
                }}
                title={t('holders.edit')}
            >
                <div className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium mb-2">{t('holders.name')}</label>
                        <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleUpdate()
                            }}
                            className="h-12 text-base rounded-xl"
                            autoFocus
                        />
                    </div>

                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setEditingHolder(null)
                                setEditName("")
                            }}
                            className="flex-1 h-12 text-base rounded-xl"
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button
                            onClick={handleUpdate}
                            className="flex-1 h-12 text-base rounded-xl"
                        >
                            <Save className="h-4 w-4 mr-2" />
                            {t('common.update')}
                        </Button>
                    </div>
                </div>
            </BottomSheet>
        </>
    )
}
