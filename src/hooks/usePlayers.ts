import { useCallback, useEffect, useMemo, useState } from "react"
import {
  PlayerRow,
  PlayerStatus,
  createPlayer,
  deletePlayer,
  listPlayers,
  updatePlayer,
  PlayerCreate,
  PlayerUpdate,
} from "@/services/players.service"

export function usePlayers(defaultTeamId?: string) {
  const [items, setItems] = useState<PlayerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<PlayerStatus | "ALL">("ALL")

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listPlayers({
        search,
        status,
        team_id: defaultTeamId,
      })
      setItems(data)
    } catch (e: any) {
      setError(e.message ?? "Erreur chargement joueurs")
    } finally {
      setLoading(false)
    }
  }, [search, status, defaultTeamId])

  useEffect(() => {
    reload()
  }, [reload])

  const actions = useMemo(
    () => ({
      async add(payload: PlayerCreate) {
        const created = await createPlayer(payload)
        setItems((prev) => [created, ...prev])
      },
      async edit(player_id: string, patch: PlayerUpdate) {
        const updated = await updatePlayer(player_id, patch)
        setItems((prev) => prev.map((p) => (p.player_id === player_id ? updated : p)))
      },
      async remove(player_id: string) {
        await deletePlayer(player_id)
        setItems((prev) => prev.filter((p) => p.player_id !== player_id))
      },
      reload,
      setSearch,
      setStatus,
    }),
    [reload]
  )

  return { items, loading, error, search, status, actions }
}