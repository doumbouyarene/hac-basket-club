import { useParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import type { PlayerRow } from "@/services/players.service"

import { 
    type PlayerMatchStat, 
    listStatsByPlayer,
    listStatsByPlayerWithEvents
} from "@/services/playerMatchStats.service"
import { getPlayerById } from "@/services/players.service"

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts"

function avg(values: number[]) {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

export function PlayerDetailsPage() {
  const { playerId } = useParams<{ playerId: string }>()
  const navigate = useNavigate()
  const [player, setPlayer] = useState<PlayerRow | null>(null)
  const [stats, setStats] = useState<PlayerMatchStat[]>([])
  const [matchStats, setMatchStats] = useState<any[]>([])

  const aggregates = {
    points: avg(stats.map(s => s.points ?? 0)),
    assists: avg(stats.map(s => s.assists ?? 0)),
    rebounds: avg(stats.map(s => s.rebounds ?? 0)),
    fouls: avg(stats.map(s => s.fouls ?? 0)),
    }
    const radarData = [
    { stat: "Points", value: aggregates.points },
    { stat: "Passes", value: aggregates.assists },
    { stat: "Rebonds", value: aggregates.rebounds },
    { stat: "Fautes", value: Math.max(0, 5 - aggregates.fouls) }, // inversion visuelle
    ]

    useEffect(() => {
    async function load() {
        if (!playerId) return

        try {

        const p = await getPlayerById(playerId)
        setPlayer(p)
        
        const s = await listStatsByPlayer(playerId)
        setStats(s)

        const sw = await listStatsByPlayerWithEvents(playerId)
        setMatchStats(sw)
        } catch (err) {
        console.error("Erreur chargement fiche joueur", err)
        }
    }

    load()
    }, [playerId])

    if (!player) {
        return <div className="p-6">Chargement du joueur…</div>
    }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Fiche joueur</h1>
        <div className="grid md:grid-cols-2 gap-6 items-center">
        <div>

            <h2 className="text-xl font-semibold">
            {player.last_name} {player.first_name}
            </h2>
            <p className="text-muted-foreground">
            Poste : {player.position ?? "—"}
            </p>
        </div>


      <RadarChart width={500} height={300} data={radarData}>
        <PolarGrid />
        <PolarAngleAxis dataKey="stat" />
        <PolarRadiusAxis angle={90} domain={[0, 30]} />
        <Radar
            name="Profil"
            dataKey="value"
            stroke="#2563eb"
            fill="#2563eb"
            fillOpacity={0.6}
        />
      </RadarChart>
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Stats par match</h2>

        {matchStats.length === 0 ? (
            <div className="text-sm text-muted-foreground">
            Aucune statistique enregistrée pour ce joueur.
            </div>
        ) : (
            <table className="w-full text-sm border">
            <thead>
                <tr className="border-b bg-muted">
                <th className="p-2 text-left">Match</th>
                <th className="p-2 text-center">Min</th>
                <th className="p-2 text-center">Pts</th>
                <th className="p-2 text-center">Reb</th>
                <th className="p-2 text-center">Ast</th>
                <th className="p-2 text-center">Fautes</th>
                </tr>
            </thead>

            <tbody>
                {matchStats.map((s) => (
                <tr key={s.stat_id} className="border-b">
                    <td className="p-2">
                    <div className="font-medium">{s.event?.title ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                        {s.event?.start_at
                        ? new Date(s.event.start_at).toLocaleDateString("fr-FR")
                        : "—"}
                    </div>
                    </td>

                    <td className="p-2 text-center">{s.minutes_played ?? "—"}</td>
                    <td className="p-2 text-center">{s.points ?? "—"}</td>
                    <td className="p-2 text-center">{s.rebounds ?? "—"}</td>
                    <td className="p-2 text-center">{s.assists ?? "—"}</td>
                    <td className="p-2 text-center">{s.fouls ?? "—"}</td>
                </tr>
                ))}
            </tbody>
            </table>
        )}
        </div>
    </div>
    </div>
  )
}