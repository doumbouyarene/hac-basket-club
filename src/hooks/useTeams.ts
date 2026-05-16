import { useEffect, useState } from "react"
import { TeamRow, listTeams } from "@/services/teams.service"

export function useTeams() {
  const [teams, setTeams] = useState<TeamRow[]>([])
  const [loadingTeams, setLoadingTeams] = useState(true)
  const [teamsError, setTeamsError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function run() {
      setLoadingTeams(true)
      setTeamsError(null)
      try {
        const data = await listTeams()
        if (mounted) setTeams(data)
      } catch (e: any) {
        if (mounted) setTeamsError(e.message ?? "Erreur chargement équipes")
      } finally {
        if (mounted) setLoadingTeams(false)
      }
    }

    run()
    return () => {
      mounted = false
    }
  }, [])

  return { teams, loadingTeams, teamsError }
}