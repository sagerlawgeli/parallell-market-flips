import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { supabase } from "../lib/supabase"

export type UserRole = 'admin' | 'standard'

interface UserContextType {
    role: UserRole
    isAdmin: boolean
    loading: boolean
    user: any | null
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
    const [role, setRole] = useState<UserRole>('standard')
    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState<any | null>(null)

    useEffect(() => {
        const fetchUserAndRole = async (currentUser: any) => {
            if (!currentUser) {
                setRole('standard')
                setLoading(false)
                return
            }

            try {
                const { data, error } = await supabase
                    .from('user_roles')
                    .select('role')
                    .eq('user_id', currentUser.id)
                    .single()

                if (error || !data) {
                    setRole('standard')
                } else {
                    setRole(data.role as UserRole)
                }
            } catch (error) {
                console.error('Error fetching user role:', error)
                setRole('standard')
            } finally {
                setLoading(false)
            }
        }

        // Initial check
        supabase.auth.getSession().then(({ data: { session } }) => {
            const currentUser = session?.user ?? null
            setUser(currentUser)
            fetchUserAndRole(currentUser)
        })

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            const currentUser = session?.user ?? null
            setUser(currentUser)
            if (currentUser) {
                setLoading(true)
                fetchUserAndRole(currentUser)
            } else {
                setRole('standard')
                setLoading(false)
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    return (
        <UserContext.Provider value={{ role, isAdmin: role === 'admin', loading, user }}>
            {children}
        </UserContext.Provider>
    )
}

export function useUserContext() {
    const context = useContext(UserContext)
    if (context === undefined) {
        throw new Error('useUserContext must be used within a UserProvider')
    }
    return context
}
