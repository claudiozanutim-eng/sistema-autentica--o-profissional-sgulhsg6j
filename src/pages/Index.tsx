import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'

// This is just a redirector index
const Index = () => {
  const { isAuthenticated, loading } = useAuth()

  if (loading) return null

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <Navigate to="/login" replace />
}

export default Index
