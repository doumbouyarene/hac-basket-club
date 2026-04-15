import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import type { JSX } from 'react'

export function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { session, isLoading } = useAuth()

  if (isLoading) return <div style={{ padding: 24 }}>Chargement...</div>
  if (!session) return <Navigate to="/login" replace />

  return children
}