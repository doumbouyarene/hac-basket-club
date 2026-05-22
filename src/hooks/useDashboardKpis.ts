import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { fetchDashboardKpis } from "@/services/dashboard.service"
import { DashboardKpis } from "@/types/db"

export function useDashboardKpis() {
  const [data, setData] = useState<DashboardKpis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function run() {
      setLoading(true)
      setError(null)

      // 1) récupérer la session
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession()
      if (sessionErr) throw sessionErr

      // 2) si pas de session -> on ne fait pas de requête KPI
      if (!sessionData.session) {
        throw new Error("Session non disponible (appel en anon).")
      }

      // 3) KPIs
      const kpis = await fetchDashboardKpis()
      if (mounted) setData(kpis)
    }

    run()
      .catch((e) => {
        console.error("KPI load error:", e)
        if (mounted) setError(e.message ?? "Erreur KPI")
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  return { data, loading, error }
}