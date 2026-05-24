import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { listStatsByEvent, PlayerMatchStat, upsertPlayerStat } from "@/services/playerMatchStats.service"
import { PlayerRow, listPlayersByTeam } from "@/services/players.service"
import { Trophy, Zap } from "lucide-react"
import { recommendStartingFive } from "@/services/lineup.service"
import { listStatsByPlayers } from "@/services/playerMatchStats.service"
import { listPlayersByEventAttendance } from "@/services/players.service"
import { RecommendedLineupPlayer } from "@/types/db"

export function EventDetailsPage() {
  const { eventId } = useParams<{ eventId: string }>()

  const [event, setEvent] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"DETAILS" | "COMPOSITION" | "STATS" | "POST_MATCH">("DETAILS")
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
  const [recommendedLineup, setRecommendedLineup] = useState<RecommendedLineupPlayer[]>([])

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
        const allStats = await listStatsByPlayers(p.map((player) => player.player_id))

        const statsByPlayer = allStats.reduce<Record<string, PlayerMatchStat[]>>((acc, stat) => {
        acc[stat.player_id] = acc[stat.player_id] ?? []
        acc[stat.player_id].push(stat)
        return acc
        }, {})

        setRecommendedLineup(recommendStartingFive(p, statsByPlayer))

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

  const requiredStatFields: (keyof PlayerMatchStat)[] = [
    "minutes_played",
    "points",
    "rebounds",
    "assists",
    "steals",
    "blocks",
    "turnovers",
    "fouls",
    "fg2_made",
    "fg2_attempted",
    "fg3_made",
    "fg3_attempted",
    "ft_made",
    "ft_attempted",
    "plus_minus",
        ]

    const hasUnsavedStats = Object.keys(draftStats).length > 0

    const completedStats = players
    .map((player) => statFor(player.player_id))
    .filter(Boolean) as PlayerMatchStat[]

    const allPlayersHaveStats =
    players.length > 0 && completedStats.length === players.length

    const allStatsFieldsFilled =
    allPlayersHaveStats &&
    completedStats.every((stat) =>
        requiredStatFields.every((field) => stat[field] !== null && stat[field] !== undefined)
    )

    const scoreFilled = event.home_score !== null && event.away_score !== null
    const awardsFilled = Boolean(event.mvp_player_id && event.impact_player_id)

    const canShowPostMatch =
    allStatsFieldsFilled &&
    scoreFilled &&
    awardsFilled &&
    !hasUnsavedStats
    
    function topBy(field: keyof PlayerMatchStat) {
    return completedStats
        .map((stat) => ({
        stat,
        player: players.find((p) => p.player_id === stat.player_id),
        value: Number(stat[field] ?? 0),
        }))
        .filter((row) => row.player)
        .sort((a, b) => b.value - a.value)[0]
    }

    function playerName(playerId: string | null) {
    if (!playerId) return "Non renseigné"
    const player = players.find((p) => p.player_id === playerId)
    return player ? `${player.last_name} ${player.first_name}` : "Non renseigné"
    }

    const topScorer = topBy("points")
    const topRebounder = topBy("rebounds")
    const topAssist = topBy("assists")
    const topSteals = topBy("steals")
    const topBlocks = topBy("blocks")
    const bestPlusMinus = topBy("plus_minus")

    const teamTotals = completedStats.reduce(
    (acc, stat) => {
        acc.points += stat.points ?? 0
        acc.rebounds += stat.rebounds ?? 0
        acc.assists += stat.assists ?? 0
        acc.steals += stat.steals ?? 0
        acc.blocks += stat.blocks ?? 0
        acc.turnovers += stat.turnovers ?? 0
        acc.fg2Made += stat.fg2_made ?? 0
        acc.fg2Attempted += stat.fg2_attempted ?? 0
        acc.fg3Made += stat.fg3_made ?? 0
        acc.fg3Attempted += stat.fg3_attempted ?? 0
        acc.ftMade += stat.ft_made ?? 0
        acc.ftAttempted += stat.ft_attempted ?? 0
        return acc
    },
    {
        points: 0,
        rebounds: 0,
        assists: 0,
        steals: 0,
        blocks: 0,
        turnovers: 0,
        fg2Made: 0,
        fg2Attempted: 0,
        fg3Made: 0,
        fg3Attempted: 0,
        ftMade: 0,
        ftAttempted: 0,
    }
    )

    function pct(made: number, attempted: number) {
    if (attempted === 0) return "—"
    return `${Math.round((made / attempted) * 100)}%`
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

            <button
            className={`pb-2 text-sm font-medium ${
                activeTab === "COMPOSITION"
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground"
            }`}
            onClick={() => setActiveTab("COMPOSITION")}
            >
            Composition
            </button>

            {canShowPostMatch && (
            <button
                className={`pb-2 text-sm font-medium ${
                activeTab === "POST_MATCH"
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground"
                }`}
                onClick={() => setActiveTab("POST_MATCH")}
            >
                Après-Match
            </button>
            )}

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

        {activeTab === "COMPOSITION" && (
        <div className="space-y-4">
            <div>
            <h2 className="text-lg font-semibold">5 majeur recommandé</h2>
            <p className="text-sm text-muted-foreground">
                Proposition basée sur les joueurs convoqués, les aptitudes, la forme récente et le poste.
            </p>
            </div>

            {recommendedLineup.length === 0 ? (
            <div className="text-sm text-muted-foreground">
                Aucun joueur disponible pour générer une composition.
            </div>
            ) : (
            <div className="grid gap-4 xl:grid-cols-5 md:grid-cols-2">
                {recommendedLineup.map((item) => (
                <div key={item.slot} className="rounded-md border bg-background p-4 space-y-3">
                    <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">
                        {item.slot}
                    </span>
                    <span className="text-sm font-bold">
                        {item.score}
                    </span>
                    </div>

                    <div>
                    <div className="font-medium leading-tight">
                        {item.player.last_name} {item.player.first_name}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                        {item.player.position ?? "Poste non renseigné"}
                    </div>
                    {item.player.archetype && (
                        <div className="text-xs text-muted-foreground">
                        {item.player.archetype}
                        </div>
                    )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2">
                        {[
                            { label: "Pts", value: item.averages.points },
                            { label: "Reb", value: item.averages.rebounds },
                            { label: "Ast", value: item.averages.assists },
                            { label: "Int", value: item.averages.steals },
                            { label: "Blk", value: item.averages.blocks },
                        ].map((stat) => (
                            <div
                            key={stat.label}
                            className="rounded-md bg-muted/60 px-2 py-1.5 text-center"
                            >
                            <div className="text-sm font-semibold leading-none">
                                {stat.value}
                            </div>
                            <div className="mt-1 text-[11px] leading-none text-muted-foreground">
                                {stat.label}
                            </div>
                            </div>
                        ))}
                    </div>
                </div>
                ))}
            </div>
            )}
        </div>
        )}

        {activeTab === "POST_MATCH" && canShowPostMatch && (
        <div className="space-y-6">
            <div>
            <h2 className="text-lg font-semibold">Rapport après-match</h2>
            <p className="text-sm text-muted-foreground">
                Synthèse générée à partir des statistiques enregistrées.
            </p>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-md border bg-background p-4">
                <div className="text-xs text-muted-foreground">Score</div>
                <div className="text-2xl font-bold">
                HAC {event.home_score ?? "—"} - {event.away_score ?? "—"}
                </div>
                <div className="text-sm text-muted-foreground">
                {event.opponent_name ?? "Adversaire"}
                </div>
            </div>

            <div className="rounded-md border bg-background p-4">
                <div className="text-xs text-muted-foreground">MVP</div>
                <div className="flex items-center gap-2 text-lg font-semibold">
                <Trophy className="h-4 w-4 text-amber-600" />
                {playerName(event.mvp_player_id)}
                </div>
            </div>

            <div className="rounded-md border bg-background p-4">
                <div className="text-xs text-muted-foreground">Impact Player</div>
                <div className="flex items-center gap-2 text-lg font-semibold">
                <Zap className="h-4 w-4 text-blue-600" />
                {playerName(event.impact_player_id)}
                </div>
            </div>

            <div className="rounded-md border bg-background p-4">
                <div className="text-xs text-muted-foreground">Pertes de balle</div>
                <div className="text-2xl font-bold">{teamTotals.turnovers}</div>
            </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
            {[
                { label: "Meilleur scoreur", row: topScorer, suffix: "pts" },
                { label: "Meilleur rebondeur", row: topRebounder, suffix: "reb" },
                { label: "Meilleur passeur", row: topAssist, suffix: "ast" },
                { label: "Interceptions", row: topSteals, suffix: "int" },
                { label: "Contres", row: topBlocks, suffix: "blk" },
                { label: "Meilleur +/-", row: bestPlusMinus, suffix: "+/-" },
            ].map((item) => (
                <div key={item.label} className="rounded-md border bg-background p-4">
                <div className="text-xs text-muted-foreground">{item.label}</div>
                <div className="mt-1 font-semibold">
                    {item.row?.player?.last_name} {item.row?.player?.first_name}
                </div>
                <div className="text-2xl font-bold">
                    {item.row?.value ?? "—"} {item.suffix}
                </div>
                </div>
            ))}
            </div>

            <div className="rounded-md border bg-background p-4 space-y-3">
            <h3 className="font-semibold">Adresse équipe</h3>

            <div className="grid gap-3 md:grid-cols-3">
                <div>
                <div className="text-2xl font-bold">
                    {pct(teamTotals.fg2Made, teamTotals.fg2Attempted)}
                </div>
                <div className="text-sm text-muted-foreground">
                    2pts · {teamTotals.fg2Made}/{teamTotals.fg2Attempted}
                </div>
                </div>

                <div>
                <div className="text-2xl font-bold">
                    {pct(teamTotals.fg3Made, teamTotals.fg3Attempted)}
                </div>
                <div className="text-sm text-muted-foreground">
                    3pts · {teamTotals.fg3Made}/{teamTotals.fg3Attempted}
                </div>
                </div>

                <div>
                <div className="text-2xl font-bold">
                    {pct(teamTotals.ftMade, teamTotals.ftAttempted)}
                </div>
                <div className="text-sm text-muted-foreground">
                    LF · {teamTotals.ftMade}/{teamTotals.ftAttempted}
                </div>
                </div>
            </div>
            </div>
        </div>
        )}
    </div>
  )
}