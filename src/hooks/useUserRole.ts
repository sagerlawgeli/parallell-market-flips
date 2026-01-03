import { useUserContext } from '../components/UserContext'

export type { UserRole } from '../components/UserContext'

export function useUserRole() {
    const { role, isAdmin, loading } = useUserContext()
    return { role, isAdmin, loading }
}
