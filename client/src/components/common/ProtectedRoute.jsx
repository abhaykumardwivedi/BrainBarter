import { Navigate, useLocation } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import { PageLoader } from './Loader'

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, profile, loading } = useAuthStore()
  const location = useLocation()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (adminOnly) {
    // Profile may still be loading right after a refresh — wait before deciding
    if (!profile) return <PageLoader />
    if (profile.role !== 'admin') return <Navigate to="/" replace />
  }
  return children
}
