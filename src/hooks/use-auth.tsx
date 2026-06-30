import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

interface AuthContextType {
  user: RecordModel | null
  isAuthenticated: boolean
  userRole: string
  isAdmin: boolean
  canEdit: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => void
  loading: boolean
  updateProfile: (data: { name?: string; avatar?: File }) => Promise<{ error: any }>
  updatePassword: (password: string, passwordConfirm: string) => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<RecordModel | null>(
    pb.authStore.isValid ? pb.authStore.record : null,
  )
  const [isAuthenticated, setIsAuthenticated] = useState(pb.authStore.isValid)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = pb.authStore.onChange((_token, record) => {
      setUser(pb.authStore.isValid ? record : null)
      setIsAuthenticated(pb.authStore.isValid)
    })

    if (pb.authStore.isValid) {
      pb.collection('users')
        .authRefresh()
        .catch(() => pb.authStore.clear())
        .finally(() => setLoading(false))
    } else {
      if (pb.authStore.record) pb.authStore.clear()
      setLoading(false)
    }
    return () => {
      unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      await pb.collection('users').authWithPassword(email, password)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const signOut = () => {
    pb.authStore.clear()
  }

  const updateProfile = async (data: { name?: string; avatar?: File }) => {
    if (!user) return { error: new Error('Não autenticado') }
    try {
      const updateData: Record<string, any> = {}
      if (data.name !== undefined) updateData.name = data.name
      if (data.avatar) updateData.avatar = data.avatar
      const updated = await pb.collection('users').update(user.id, updateData)
      pb.authStore.save(pb.authStore.token, updated)
      setUser(updated)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const updatePassword = async (password: string, passwordConfirm: string) => {
    if (!user) return { error: new Error('Não autenticado') }
    try {
      await pb.collection('users').update(user.id, { password, passwordConfirm })
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const userRole = (user as any)?.role || 'admin'
  const isAdmin = userRole === 'admin'
  const canEdit = isAdmin

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        userRole,
        isAdmin,
        canEdit,
        signIn,
        signOut,
        loading,
        updateProfile,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
