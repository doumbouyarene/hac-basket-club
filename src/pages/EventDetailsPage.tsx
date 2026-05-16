import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { listStatsByEvent, PlayerMatchStat, upsertPlayerStat } from "@/services/playerMatchStats.service"
import { PlayerRow, listPlayersByTeam } from "@/services/players.service"

export function EventDetailsPage() {
  const { eventId } = useParams<{ eventId: string }>()

  const [event, setEvent] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"DETAILS" | "STATS">("DETAILS")
  const [homeScore, setHomeScore] = useState<number | "">("")
  const [awayScore, setAwayScore] = useState<number | "">("")
  const [savingScore, setSavingScore] = useState(false)
  const [players, setPlayers] = useState<PlayerRow[]>([])
  const [stats, setStats] = useState<PlayerMatchStat[]>([])
  const [draftStats, setDraftStats] = useState<
    Record<string, Partial<PlayerMatchStat>>>({})
    const [savingStats, setSavingStats] = useState(false)

    
    function statFor(playerId: string) {
        return stats.find((s) => s.player_id === playerId)
    }

    function updateDraft(
        playerId: string,
        field: keyof PlayerMatchStat,
        value: string
        ) {
        setDraftStats((prev) => ({
            ...prev,
            [playerId]: {
            ...prev[playerId],
            player_id: playerId,
            event_id: event.event_id,
            [field]: value === "" ? null : Number(value),
            },
        }))
        }


  useEffect(() => {
    async function load() {
      if (!eventId) {
        setError("ID événement manquant")
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from("events")
          .select("*")
          .eq("event_id", eventId)
          .single()

        if (error) throw error
        setEvent(data)

        if (data.home_score !== null) setHomeScore(data.home_score)
        if (data.away_score !== null) setAwayScore(data.away_score)
        
        const p = await listPlayersByTeam(data.team_id)
        const s = await listStatsByEvent(data.event_id)
        setPlayers(p)
        setStats(s)


      } catch (e: any) {
        console.error(e)
        setError("Événement introuvable")
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [eventId])

  if (loading) {
    return <div className="p-6">Chargement de l’événement…</div>
  }

  if (error || !event) {
    return <div className="p-6 text-red-600">{error}</div>
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">{event.title}</h1>
      {/* Les briques suivantes viendront ici */}

      <div className="border-b">
        <nav className="flex gap-6">
            <button
            className={`pb-2 text-sm font-medium ${
                activeTab === "DETAILS"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground"
            }`}
            onClick={() => setActiveTab("DETAILS")}
            >
            Détails
            </button>
            
            <button
            className={`pb-2 text-sm font-medium ${
                activeTab === "STATS"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground"
            }`}
            onClick={() => setActiveTab("STATS")}
            >
            Stats du match
            </button>
        </nav>
        </div>
        {activeTab === "DETAILS" && (
        <div className="space-y-2">

            <div>
            <span className="font-medium">Date : </span>
            {new Date(event.start_at).toLocaleString("fr-FR")}
            </div>

            {event.location && (
            <div>
                <span className="font-medium">Lieu : </span>
                {event.location}
            </div>
            )}
        </div>
        )}
        {activeTab === "STATS" && (
        <div className="space-y-6">
            <div className="space-y-4">
                <h2 className="text-lg font-semibold">Score du match</h2>
                <div className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground">HAC</span>
                <input
                    type="number"
                    className="w-20 border rounded px-2 py-1 text-center"
                    value={homeScore}
                    onChange={(e) =>
                        setHomeScore(e.target.value === "" ? "" : Number(e.target.value))
                    }
                />

                <span className="font-semibold text-lg">–</span>
                
                <div className="text-xs text-muted-foreground">
                    {event.opponent_name ?? "Adversaire"}
                    </div>

                <input
                    type="number"
                    className="w-20 border rounded px-2 py-1 text-center"
                    value={awayScore}
                    onChange={(e) =>
                        setAwayScore(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    />

                    <Button
                    disabled={savingScore}
                    onClick={async () => {
                        if (homeScore === "" || awayScore === "") return

                        setSavingScore(true)
                        try {
                        await supabase
                            .from("events")
                            .update({
                            home_score: homeScore,
                            away_score: awayScore,
                            })
                            .eq("event_id", event.event_id)
                        } finally {
                        setSavingScore(false)
                        }
                    }}
                    >
                    Enregistrer le score
                    </Button>
                </div>
            </div>
            
            <div className="space-y-4">
            <h2 className="text-lg font-semibold">Stats par joueur</h2>

            <table className="w-full text-sm border">
                <thead>
                <tr className="border-b bg-muted">
                    <th className="p-2 text-left">Joueur</th>
                    <th className="p-2 text-center">Min</th>
                    <th className="p-2 text-center">Pts</th>
                    <th className="p-2 text-center">Reb</th>
                    <th className="p-2 text-center">Ast</th>
                    <th className="p-2 text-center">Fautes</th>
                </tr>
                </thead>

                <tbody>
                {players.map((p) => {
                    const stat = statFor(p.player_id)

                    return (
                    <tr key={p.player_id} className="border-b">
                        <td className="p-2">
                        {p.last_name} {p.first_name}
                        </td>

                        {(["minutes_played", "points", "rebounds", "assists", "fouls"] as const).map(
                        (field) => (
                            <td key={field} className="p-2 text-center">
                            <input
                                type="number"
                                className="w-16 border rounded px-2 py-1 text-center"
                                value={
                                (draftStats[p.player_id]?.[field] ??
                                    stat?.[field]) ??
                                ""
                                }
                                onChange={(e) =>
                                updateDraft(p.player_id, field, e.target.value)
                                }
                            />
                            </td>
                        )
                        )}
                    </tr>
                    )
                })}
                </tbody>
            </table>

            <Button
                disabled={savingStats}
                onClick={async () => {
                setSavingStats(true)
                try {
                    for (const stat of Object.values(draftStats)) {
                    await upsertPlayerStat(stat as any)
                    }

                    setDraftStats({})
                    const refreshed = await listStatsByEvent(event.event_id)
                    setStats(refreshed)
                } finally {
                    setSavingStats(false)
                }
                }}
            >
                Enregistrer les stats
            </Button>
            </div>

        </div>
        )}
    </div>
  )
}