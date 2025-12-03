import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type UserRole = 'admin' | 'standard'

export function useUserRole() {
    const [role, setRole] = useState<UserRole>('standard')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchRole = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) {
                    setLoading(false)
                    return
                }

                const { data, error } = await supabase
                    .from('user_roles')
                    .select('role')
                    .eq('user_id', user.id)
                    .single()

                if (error || !data) {
                    // Default to standard if no role found
                    setRole('standard')
                } else {
                    setRole(data.role as UserRole)
                }
            } catch (error) {
                console.error('Error fetching user role:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchRole()
    }, [])

    return { role, isAdmin: role === 'admin', loading }
}
