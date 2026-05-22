import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { listPlayersByEventAttendance, listStatsByEvent, PlayerMatchStat, upsertPlayerStat } from "@/services/playerMatchStats.service"
import { PlayerRow, listPlayersByTeam } from "@/services/players.service"
import { Trophy, Zap } from "lucide-react"

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
  const [draftStats, setDraftStats] = useState<Record<string, Partial<PlayerMatchStat>>>({})
  const [savingStats, setSavingStats] = useState(false)
  const [mvpPlayerId, setMvpPlayerId] = useState<string>("")
  const [impactPlayerId, setImpactPlayerId] = useState<string>("")
  const [savingAwards, setSavingAwards] = useState(false)

    function AwardBadges({
        playerId,
        mvpPlayerId,
        impactPlayerId,
        }: {
        playerId: string
        mvpPlayerId: string
        impactPlayerId: string
        }) {
        return (
            <span className="inline-flex items-center gap-1 ml-2 align-middle">
            {mvpPlayerId === playerId && (
                <span title="MVP" className="inline-flex items-center text-amber-600">
                <Trophy className="h-4 w-4" />
                </span>
            )}
            {impactPlayerId === playerId && (
                <span title="Impact Player" className="inline-flex items-center text-blue-600">
                <Zap className="h-4 w-4" />
                </span>
            )}
            </span>
        )
    }

    function statFor(playerId: string) {
        return stats.find((s) => s.player_id === playerId)
    }

    function computePoints(stat: Partial<PlayerMatchStat>) {
    const fg2 = Number(stat.fg2_made ?? 0)
    const fg3 = Number(stat.fg3_made ?? 0)
    const ft = Number(stat.ft_made ?? 0)

    return fg2 * 2 + fg3 * 3 + ft
    }

    function updateDraft(
    playerId: string,
    field: keyof PlayerMatchStat,
    value: string
    ) {
    setDraftStats((prev) => {
        const current = {
        ...prev[playerId],
        player_id: playerId,
        event_id: event.event_id,
        [field]: value === "" ? null : Number(value),
        }

        const shouldRecomputePoints =
        field === "fg2_made" ||
        field === "fg3_made" ||
        field === "ft_made"

        const next = shouldRecomputePoints
        ? {
            ...current,
            points: computePoints(current),
            }
        : current

        return {
        ...prev,
        [playerId]: next,
        }
    })
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
        setMvpPlayerId(data.mvp_player_id ?? "")
        setImpactPlayerId(data.impact_player_id ?? "")

        if (data.home_score !== null) setHomeScore(data.home_score)
        if (data.away_score !== null) setAwayScore(data.away_score)
        
        const p = await listPlayersByEventAttendance(data.event_id)
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
        <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-md border bg-background p-4 space-y-2">
            <h2 className="text-lg font-semibold">Résumé</h2>
            <div><span className="font-medium">Type : </span>{event.event_type}</div>
            <div><span className="font-medium">Date : </span>{new Date(event.start_at).toLocaleString("fr-FR")}</div>
            {event.location && (
                <div><span className="font-medium">Lieu : </span>{event.location}</div>
            )}
            {event.opponent_name && (
                <div><span className="font-medium">Adversaire : </span>{event.opponent_name}</div>
            )}
            {event.home_score !== null && event.away_score !== null && (
                <div>
                <span className="font-medium">Score : </span>
                HAC {event.home_score} - {event.away_score} {event.opponent_name ?? "Adversaire"}
                </div>
            )}
            </div>

            <div className="rounded-md border bg-background p-4 space-y-2">
            <h2 className="text-lg font-semibold">Récompenses</h2>
            <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-600" />
                <span>MVP : {players.find(p => p.player_id === event.mvp_player_id)?.last_name} {players.find(p => p.player_id === event.mvp_player_id)?.first_name  ?? "Non renseigné"}</span>
            </div>
            <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-600" />
                <span>Impact Player : {players.find(p => p.player_id === event.impact_player_id)?.last_name} {players.find(p => p.player_id === event.impact_player_id)?.first_name ?? "Non renseigné"}</span>
            </div>
            </div>

            <div className="rounded-md border bg-background p-4 space-y-2 md:col-span-2">
            <h2 className="text-lg font-semibold">Notes</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {event.notes || "Aucune note."}
            </p>
            </div>
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
                    <div className="space-y-4">
        <h2 className="text-lg font-semibold">Récompenses individuelles</h2>

        <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
            <label className="text-sm font-medium flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-600" />
                MVP
            </label>
            <select
                className="w-full border rounded px-3 py-2"
                value={mvpPlayerId}
                onChange={(e) => setMvpPlayerId(e.target.value)}
            >
                <option value="">Non renseigné</option>
                {players.map((p) => (
                <option key={p.player_id} value={p.player_id}>
                    {p.last_name} {p.first_name}
                </option>
                ))}
            </select>
            </div>

            <div className="space-y-1">
            <label className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4 text-blue-600" />
                Impact Player
            </label>
            <select
                className="w-full border rounded px-3 py-2"
                value={impactPlayerId}
                onChange={(e) => setImpactPlayerId(e.target.value)}
            >
                <option value="">Non renseigné</option>
                {players.map((p) => (
                <option key={p.player_id} value={p.player_id}>
                    {p.last_name} {p.first_name}
                </option>
                ))}
            </select>
            </div>
        </div>

        <Button
            disabled={savingAwards}
            onClick={async () => {
            setSavingAwards(true)
            try {
                await supabase
                .from("events")
                .update({
                    mvp_player_id: mvpPlayerId || null,
                    impact_player_id: impactPlayerId || null,
                })
                .eq("event_id", event.event_id)

                setEvent((prev: any) => ({
                ...prev,
                mvp_player_id: mvpPlayerId || null,
                impact_player_id: impactPlayerId || null,
                }))
            } finally {
                setSavingAwards(false)
            }
            }}
        >
            {savingAwards ? "Enregistrement..." : "Enregistrer les récompenses"}
        </Button>
        </div>
            <h2 className="text-lg font-semibold">Stats par joueur</h2>

            <div className="max-h-[70vh] overflow-auto rounded-md border">
                <table className="w-full text-sm">
                    <thead className="sticky top-0 z-20 bg-muted shadow-sm">
                    <tr className="border-b bg-muted">
                    <th className="sticky left-0 z-30 p-2 text-left bg-muted border-r">
                        Joueur
                    </th>
                    <th className="p-2 text-center bg-muted">Min</th>
                    <th className="p-2 text-center bg-muted">Pts</th>
                    <th className="p-2 text-center bg-muted">Reb</th>
                    <th className="p-2 text-center bg-muted">Ast</th>
                    <th className="p-2 text-center bg-muted">Int</th>
                    <th className="p-2 text-center bg-muted">Blk</th>
                    <th className="p-2 text-center bg-muted">BP</th>
                    <th className="p-2 text-center bg-muted">Fautes</th>
                    <th className="p-2 text-center bg-muted">2pts M/T</th>
                    <th className="p-2 text-center bg-muted">3pts M/T</th>
                    <th className="p-2 text-center bg-muted">LF M/T</th>
                    <th className="p-2 text-center bg-muted">+/-</th>
                    </tr>
                </thead>

                <tbody>
                    {players.map((p) => {
                    const stat = statFor(p.player_id)

                    return (
                        <tr key={p.player_id} className="border-b">
                        <td className="sticky left-0 z-10 bg-background p-2 border-r">
                        {p.last_name} {p.first_name}
                        <AwardBadges
                            playerId={p.player_id}
                            mvpPlayerId={mvpPlayerId}
                            impactPlayerId={impactPlayerId}
                        />
                        </td>
                        
                        <td className="p-2 text-center">
                        <input
                            type="number"
                            min={0}
                            className="w-14 border rounded px-1 py-1 text-center"
                            value={(draftStats[p.player_id]?.minutes_played ?? stat?.minutes_played) ?? ""}
                            onChange={(e) => updateDraft(p.player_id, "minutes_played", e.target.value)}
                        />
                        </td>

                        <td className="p-2 text-center">
                        <input
                            type="number"
                            min={0}
                            readOnly
                            className="w-14 border rounded px-1 py-1 text-center bg-muted text-muted-foreground"
                            value={(draftStats[p.player_id]?.points ?? stat?.points) ?? ""}
                        />
                        </td>
                        
                        {(["rebounds", "assists", "steals", "blocks", "turnovers", "fouls",] as const).map(
                            (field) => (
                            <td key={field} className="p-2 text-center">
                                <input
                                type="number"
                                min={0}
                                className="w-14 border rounded px-1 py-1 text-center"
                                value={(draftStats[p.player_id]?.[field] ?? stat?.[field]) ?? ""}
                                onChange={(e) => updateDraft(p.player_id, field, e.target.value)}
                                />
                            </td>
                            )
                        )}

                        {/* 2pts */}
                        <td className="p-2 text-center">
                            <div className="flex items-center gap-1">
                            <input type="number" min={0} className="w-12 border rounded px-1 py-1 text-center"
                                value={(draftStats[p.player_id]?.fg2_made ?? stat?.fg2_made) ?? ""}
                                onChange={(e) => updateDraft(p.player_id, "fg2_made", e.target.value)} />
                            <span className="text-muted-foreground">/</span>
                            <input type="number" min={0} className="w-12 border rounded px-1 py-1 text-center"
                                value={(draftStats[p.player_id]?.fg2_attempted ?? stat?.fg2_attempted) ?? ""}
                                onChange={(e) => updateDraft(p.player_id, "fg2_attempted", e.target.value)} />
                            </div>
                        </td>

                        {/* 3pts */}
                        <td className="p-2 text-center">
                            <div className="flex items-center gap-1">
                            <input type="number" min={0} className="w-12 border rounded px-1 py-1 text-center"
                                value={(draftStats[p.player_id]?.fg3_made ?? stat?.fg3_made) ?? ""}
                                onChange={(e) => updateDraft(p.player_id, "fg3_made", e.target.value)} />
                            <span className="text-muted-foreground">/</span>
                            <input type="number" min={0} className="w-12 border rounded px-1 py-1 text-center"
                                value={(draftStats[p.player_id]?.fg3_attempted ?? stat?.fg3_attempted) ?? ""}
                                onChange={(e) => updateDraft(p.player_id, "fg3_attempted", e.target.value)} />
                            </div>
                        </td>

                        {/* LF */}
                        <td className="p-2 text-center">
                            <div className="flex items-center gap-1">
                            <input type="number" min={0} className="w-12 border rounded px-1 py-1 text-center"
                                value={(draftStats[p.player_id]?.ft_made ?? stat?.ft_made) ?? ""}
                                onChange={(e) => updateDraft(p.player_id, "ft_made", e.target.value)} />
                            <span className="text-muted-foreground">/</span>
                            <input type="number" min={0} className="w-12 border rounded px-1 py-1 text-center"
                                value={(draftStats[p.player_id]?.ft_attempted ?? stat?.ft_attempted) ?? ""}
                                onChange={(e) => updateDraft(p.player_id, "ft_attempted", e.target.value)} />
                            </div>
                        </td>

                        {/* +/- */}
                        <td className="p-2 text-center">
                        <input type="number" className="w-14 border rounded px-1 py-1 text-center"
                            value={(draftStats[p.player_id]?.plus_minus ?? stat?.plus_minus) ?? ""}
                            onChange={(e) => updateDraft(p.player_id, "plus_minus", e.target.value)} />
                        </td>
                        </tr>
                    )
                    })}
                </tbody>
                </table>
            </div>

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