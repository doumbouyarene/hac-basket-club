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

const n = stats.length

const sum = (field: keyof PlayerMatchStat) =>
  stats.reduce((acc, s) => acc + (s[field] as number ?? 0), 0)

  const aggregates = {
    minutes_played: n ? sum("minutes_played") / n : 0,
    points:         n ? sum("points") / n : 0,
    rebounds:       n ? sum("rebounds") / n : 0,
    assists:        n ? sum("assists") / n : 0,
    steals:         n ? sum("steals") / n : 0,
    blocks: n ? sum("blocks") / n : 0,
    turnovers:      n ? sum("turnovers") / n : 0,
    fouls:          n ? sum("fouls") / n : 0,
    plus_minus:     n ? sum("plus_minus") / n : 0,
    fg2_made:       n ? sum("fg2_made") / n : 0,
    fg2_attempted:  n ? sum("fg2_attempted") / n : 0,
    fg3_made:       n ? sum("fg3_made") / n : 0,
    fg3_attempted:  n ? sum("fg3_attempted") / n : 0,
    ft_made:        n ? sum("ft_made") / n : 0,
    ft_attempted:   n ? sum("ft_attempted") / n : 0,
  }

  const shooting = {
    fg2: sum("fg2_attempted") > 0
      ? Math.round((sum("fg2_made") / sum("fg2_attempted")) * 100)
      : null,
    fg3: sum("fg3_attempted") > 0
      ? Math.round((sum("fg3_made") / sum("fg3_attempted")) * 100)
      : null,
    ft: sum("ft_attempted") > 0
      ? Math.round((sum("ft_made") / sum("ft_attempted")) * 100)
      : null,
  }

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
    
    const radarData = [
      { stat: "OFF", value: player.off_rating ?? 0 },
      { stat: "TEC", value: player.tec_rating ?? 0 },
      { stat: "PHY", value: player.phy_rating ?? 0 },
      { stat: "DEF", value: player.def_rating ?? 0 },
      { stat: "STA", value: player.sta_rating ?? 0 },
      { stat: "SPD", value: player.spd_rating ?? 0 },
    ]

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Fiche joueur</h1>
        <div className="grid md:grid-cols-2 gap-6 items-center">
          <div className="flex flex-col items-start gap-3">
            {player.photo_url ? (
          <img
            src={player.photo_url}
            alt={`${player.first_name} ${player.last_name}`}
            className="w-34 h-34 rounded-full object-cover border"
          />
        ) : (
          <div className="w-34 h-34 rounded-full bg-muted border flex items-center justify-center text-2xl font-semibold text-muted-foreground">
            {player.first_name[0]}{player.last_name[0]}
          </div>
        )}

        <h2 className="text-xl font-semibold">
          {player.last_name} {player.first_name}
        </h2>
        <p className="text-muted-foreground">
          Poste : {player.position ?? "—"}
        </p>
        {player.archetype && (
          <p className="text-muted-foreground">
            Archétype : {player.archetype}
          </p>
        )}
      </div>

      <RadarChart width={300} height={300} data={radarData}>
        <PolarGrid />
        <PolarAngleAxis dataKey="stat" />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
        <Radar
          name="Profil"
          dataKey="value"
          stroke="#2563eb"
          fill="#2563eb"
          fillOpacity={0.4}
        />
      </RadarChart>

      {n > 0 && (
  <div className="space-y-1 pt-1">
    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
      Moyennes saison ({n} match{n > 1 ? "s" : ""})
    </p>
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      <span><span className="text-muted-foreground">Min </span>{aggregates.minutes_played.toFixed(1)}</span>
      <span><span className="text-muted-foreground">Pts </span>{aggregates.points.toFixed(1)}</span>
      <span><span className="text-muted-foreground">Reb </span>{aggregates.rebounds.toFixed(1)}</span>
      <span><span className="text-muted-foreground">Ast </span>{aggregates.assists.toFixed(1)}</span>
      <span><span className="text-muted-foreground">Int </span>{aggregates.steals.toFixed(1)}</span>
      <span><span className="text-muted-foreground">BP </span>{aggregates.turnovers.toFixed(1)}</span>
      <span><span className="text-muted-foreground">Fts </span>{aggregates.fouls.toFixed(1)}</span>
      <span><span className="text-muted-foreground">Blk </span>{aggregates.blocks.toFixed(1)}</span>
      <span className={aggregates.plus_minus >= 0 ? "text-green-600" : "text-red-600"}>
        <span className="text-muted-foreground">+/- </span>
        {aggregates.plus_minus >= 0 ? "+" : ""}{aggregates.plus_minus.toFixed(1)}
      </span>
    </div>
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      <span>
        <span className="text-muted-foreground">2pts </span>
        {aggregates.fg2_made.toFixed(1)}/{aggregates.fg2_attempted.toFixed(1)}
        {shooting.fg2 !== null && <span className="text-muted-foreground"> ({shooting.fg2}%)</span>}
      </span>
      <span>
        <span className="text-muted-foreground">3pts </span>
        {aggregates.fg3_made.toFixed(1)}/{aggregates.fg3_attempted.toFixed(1)}
        {shooting.fg3 !== null && <span className="text-muted-foreground"> ({shooting.fg3}%)</span>}
      </span>
      <span>
        <span className="text-muted-foreground">LF </span>
        {aggregates.ft_made.toFixed(1)}/{aggregates.ft_attempted.toFixed(1)}
        {shooting.ft !== null && <span className="text-muted-foreground"> ({shooting.ft}%)</span>}
      </span>
    </div>
  </div>
)}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border">
          <thead>
            <tr className="border-b bg-muted">
              <th className="p-2 text-left">Match</th>
              <th className="p-2 text-center">Min</th>
              <th className="p-2 text-center">Pts</th>
              <th className="p-2 text-center">Reb</th>
              <th className="p-2 text-center">Ast</th>
              <th className="p-2 text-center">Int</th>
              <th className="p-2 text-center">Blk</th>
              <th className="p-2 text-center">BP</th>
              <th className="p-2 text-center">Fts</th>
              <th className="p-2 text-center">2pts</th>
              <th className="p-2 text-center">3pts</th>
              <th className="p-2 text-center">LF</th>
              <th className="p-2 text-center">+/-</th>
            </tr>
          </thead>
          <tbody>
            {matchStats.map((s) => {
              const fg2pct = s.fg2_attempted > 0 ? Math.round(s.fg2_made / s.fg2_attempted * 100) : null
              const fg3pct = s.fg3_attempted > 0 ? Math.round(s.fg3_made / s.fg3_attempted * 100) : null
              const ftpct  = s.ft_attempted  > 0 ? Math.round(s.ft_made  / s.ft_attempted  * 100) : null

              return (
                <tr key={s.stat_id} className="border-b">
                  <td className="p-2">
                    <div className="font-medium">{s.event?.title ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.event?.start_at ? new Date(s.event.start_at).toLocaleDateString("fr-FR") : "—"}
                    </div>
                  </td>
                  <td className="p-2 text-center">{s.minutes_played ?? "—"}</td>
                  <td className="p-2 text-center">{s.points ?? "—"}</td>
                  <td className="p-2 text-center">{s.rebounds ?? "—"}</td>
                  <td className="p-2 text-center">{s.assists ?? "—"}</td>
                  <td className="p-2 text-center">{s.steals ?? "—"}</td>
                  <td className="p-2 text-center">{s.turnovers ?? "—"}</td>
                  <td className="p-2 text-center">{s.fouls ?? "—"}</td>
                  <td className="p-2 text-center">{s.blocks ?? "—"}</td>
                  <td className="p-2 text-center text-xs">
                    {s.fg2_made ?? "—"}/{s.fg2_attempted ?? "—"}
                    {fg2pct !== null && <div className="text-muted-foreground">{fg2pct}%</div>}
                  </td>
                  <td className="p-2 text-center text-xs">
                    {s.fg3_made ?? "—"}/{s.fg3_attempted ?? "—"}
                    {fg3pct !== null && <div className="text-muted-foreground">{fg3pct}%</div>}
                  </td>
                  <td className="p-2 text-center text-xs">
                    {s.ft_made ?? "—"}/{s.ft_attempted ?? "—"}
                    {ftpct !== null && <div className="text-muted-foreground">{ftpct}%</div>}
                  </td>
                  <td className={`p-2 text-center font-medium ${s.plus_minus > 0 ? "text-green-600" : s.plus_minus < 0 ? "text-red-600" : ""}`}>
                    {s.plus_minus != null ? (s.plus_minus > 0 ? `+${s.plus_minus}` : s.plus_minus) : "—"}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
    </div>
  )
}