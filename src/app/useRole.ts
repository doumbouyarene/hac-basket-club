import { useEffect, useState } from 'react'
import type { Role } from '../types/db'
import { getMyRole } from '../lib/api'

export function useRole() {
  const [role, setRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const r = await getMyRole()
        if (mounted) setRole(r)
      } catch (e) {
        if (mounted) setError((e as any).message ?? 'Erreur role')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  return { role, loading, error }
}