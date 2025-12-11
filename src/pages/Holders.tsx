import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Trash2, Edit2, Plus, X, Save } from "lucide-react"
import type { Holder } from "../lib/types"

export default function HoldersPage() {
    const { t } = useTranslation()
    const [holders, setHolders] = useState<Holder[]>([])
    const [loading, setLoading] = useState(true)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState("")
    const [newHolderName, setNewHolderName] = useState("")
    const [isAdding, setIsAdding] = useState(false)

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
            setIsAdding(false)
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

    const handleUpdate = async (id: string) => {
        if (!editName.trim()) {
            toast.error(t('holders.nameRequired'))
            return
        }

        try {
            const { error } = await supabase
                .from('holders')
                .update({ name: editName.trim() })
                .eq('id', id)

            if (error) throw error

            toast.success(t('holders.updateSuccess'))
            setEditingId(null)
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
        setEditingId(holder.id)
        setEditName(holder.name)
    }

    const cancelEdit = () => {
        setEditingId(null)
        setEditName("")
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">{t('holders.title')}</h1>
                <p className="text-muted-foreground">
                    {t('holders.subtitle')}
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>{t('holders.listTitle')}</span>
                        {!isAdding && (
                            <Button onClick={() => setIsAdding(true)} size="sm">
                                <Plus className="h-4 w-4 mr-2" />
                                {t('holders.addNew')}
                            </Button>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {isAdding && (
                        <div className="flex gap-2 p-3 bg-muted/50 rounded-lg">
                            <Input
                                value={newHolderName}
                                onChange={(e) => setNewHolderName(e.target.value)}
                                placeholder={t('holders.namePlaceholder')}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAdd()
                                    if (e.key === 'Escape') {
                                        setIsAdding(false)
                                        setNewHolderName("")
                                    }
                                }}
                                autoFocus
                            />
                            <Button onClick={handleAdd} size="sm">
                                <Save className="h-4 w-4 mr-2" />
                                {t('common.save')}
                            </Button>
                            <Button
                                onClick={() => {
                                    setIsAdding(false)
                                    setNewHolderName("")
                                }}
                                variant="ghost"
                                size="sm"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    {loading ? (
                        <div className="text-center py-10 text-muted-foreground">{t('common.loading')}</div>
                    ) : holders.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">{t('holders.noHolders')}</div>
                    ) : (
                        <div className="space-y-2">
                            {holders.map((holder) => (
                                <div
                                    key={holder.id}
                                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                                >
                                    {editingId === holder.id ? (
                                        <div className="flex gap-2 flex-1">
                                            <Input
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleUpdate(holder.id)
                                                    if (e.key === 'Escape') cancelEdit()
                                                }}
                                                autoFocus
                                            />
                                            <Button onClick={() => handleUpdate(holder.id)} size="sm">
                                                <Save className="h-4 w-4 mr-2" />
                                                {t('common.save')}
                                            </Button>
                                            <Button onClick={cancelEdit} variant="ghost" size="sm">
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="font-medium">{holder.name}</span>
                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={() => startEdit(holder)}
                                                    variant="ghost"
                                                    size="sm"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    onClick={() => handleDelete(holder.id, holder.name)}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-500 hover:text-red-600"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
