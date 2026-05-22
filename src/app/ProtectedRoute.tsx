import { Navigate } from "react-router-dom"
import { useAuth } from "./AuthProvider"
import { useRole } from "./useRole"
import type { JSX } from "react"
import type { Role } from "@/types/db"

type ProtectedRouteProps = {
  children: JSX.Element
  allowedRoles?: Role[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { session, isLoading } = useAuth()
  const { role, loading: roleLoading } = useRole()

  if (isLoading || roleLoading) {
    return <div className="p-6">Chargement...</div>
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && (!role || !allowedRoles.includes(role))) {
    return <Navigate to="/" replace />
  }

  return children
}