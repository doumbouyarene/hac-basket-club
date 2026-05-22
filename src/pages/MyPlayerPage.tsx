import { useEffect, useState } from "react"
import { getMyPlayerProfile } from "@/lib/api"
import { PlayerDetailsPage } from "@/pages/PlayerDetailsPage"

export function MyPlayerPage() {
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const player = await getMyPlayerProfile()
        setPlayerId(player.player_id)
      } catch (e: any) {
        setError(e.message ?? "Fiche joueur introuvable")
      }
    }

    load()
  }, [])

  if (error) return <div className="p-6 text-red-600">{error}</div>
  if (!playerId) return <div className="p-6">Chargement...</div>

  return <PlayerDetailsPage forcedPlayerId={playerId} readOnly />
}