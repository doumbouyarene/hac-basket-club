import { useParams } from "react-router-dom"
import { supabase } from "@/lib/supabase"

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
  const [attendance, setAttendance] = useState<any[]>([])


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

  const totalEvents   = attendance.length
  const totalPresent  = attendance.filter(a => a.status === "PRESENT").length
  const totalAbsent   = attendance.filter(a => a.status === "ABSENT").length
  const attendanceRate = (totalPresent + totalAbsent) > 0
    ? Math.round((totalPresent / (totalPresent + totalAbsent)) * 100)
    : null

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

        const { data: att } = await supabase
          .from("attendance")
          .select("status, event:events(event_id, title, start_at, event_type)")
          .eq("player_id", playerId)

        const sorted = (att ?? []).sort((a: any, b: any) =>
          new Date(b.event?.start_at ?? 0).getTime() - new Date(a.event?.start_at ?? 0).getTime()
        )
        setAttendance(sorted)

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
  <div className="p-6 space-y-8">
    <h1 className="text-2xl font-semibold">Fiche joueur</h1>

    {/* Identité + Radar */}
    <div className="grid md:grid-cols-2 gap-6 items-center">
      <div className="flex flex-col items-start gap-3">
        {player.photo_url ? (
          <img src={player.photo_url} alt={`${player.first_name} ${player.last_name}`}
            className="w-34 h-34 rounded-full object-cover border" />
        ) : (
          <div className="w-34 h-34 rounded-full bg-muted border flex items-center justify-center text-2xl font-semibold text-muted-foreground">
            {player.first_name[0]}{player.last_name[0]}
          </div>
        )}
        <h2 className="text-xl font-semibold">{player.last_name} {player.first_name}</h2>
        <p className="text-muted-foreground">Poste : {player.position ?? "—"}</p>
        {player.archetype && (
          <p className="text-muted-foreground">Archétype : {player.archetype}</p>
        )}
      </div>

      <RadarChart width={300} height={300} data={radarData}>
        <PolarGrid />
        <PolarAngleAxis dataKey="stat" />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
        <Radar name="Profil" dataKey="value" stroke="#2563eb" fill="#2563eb" fillOpacity={0.4} />
      </RadarChart>
    </div>

    {/* ───── SECTION STATISTIQUES ───── */}
    <section className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Statistiques {n > 0 && <span className="normal-case font-normal">— {n} match{n > 1 ? "s" : ""}</span>}
      </h3>

      {n === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune statistique enregistrée.</p>
      ) : (
        <>
          {/* KPIs moyennes */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {[
              { label: "Pts",  value: aggregates.points.toFixed(1) },
              { label: "Reb",  value: aggregates.rebounds.toFixed(1) },
              { label: "Ast",  value: aggregates.assists.toFixed(1) },
              { label: "Int",  value: aggregates.steals.toFixed(1) },
              { label: "Blk",  value: aggregates.blocks.toFixed(1) },
              { label: "BP",   value: aggregates.turnovers.toFixed(1) },
              { label: "Fts",  value: aggregates.fouls.toFixed(1) },
              { label: "Min",  value: aggregates.minutes_played.toFixed(1) },
              {
                label: "+/-",
                value: (aggregates.plus_minus >= 0 ? "+" : "") + aggregates.plus_minus.toFixed(1),
                color: aggregates.plus_minus >= 0 ? "text-green-600" : "text-red-600",
              },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-lg border bg-background p-3 text-center shadow-sm">
                <div className={`text-xl font-bold ${color ?? ""}`}>{value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Tirs */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "2pts", made: aggregates.fg2_made, att: aggregates.fg2_attempted, pct: shooting.fg2 },
              { label: "3pts", made: aggregates.fg3_made, att: aggregates.fg3_attempted, pct: shooting.fg3 },
              { label: "LF",   made: aggregates.ft_made,  att: aggregates.ft_attempted,  pct: shooting.ft  },
            ].map(({ label, made, att, pct }) => (
              <div key={label} className="rounded-lg border bg-background p-3 text-center shadow-sm">
                <div className="text-xl font-bold">{pct !== null ? `${pct}%` : "—"}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {label} · {made.toFixed(1)}/{att.toFixed(1)}
                </div>
              </div>
            ))}
          </div>

          {/* Table détaillée */}
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
                      <td className="p-2 text-center">{s.blocks ?? "—"}</td>
                      <td className="p-2 text-center">{s.turnovers ?? "—"}</td>
                      <td className="p-2 text-center">{s.fouls ?? "—"}</td>
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
        </>
      )}
    </section>

    {/* ───── SECTION PRÉSENCES ───── */}
    <section className="space-y-4">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Présences</h3>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border bg-background p-4 text-center shadow-sm">
          <div className="text-2xl font-bold">{totalEvents}</div>
          <div className="text-xs text-muted-foreground mt-1">Événements</div>
        </div>
        <div className="rounded-lg border bg-background p-4 text-center shadow-sm">
          <div className="text-2xl font-bold text-green-600">{totalPresent}</div>
          <div className="text-xs text-muted-foreground mt-1">Présences</div>
        </div>
        <div className="rounded-lg border bg-background p-4 text-center shadow-sm">
          <div className="text-2xl font-bold">
            {attendanceRate !== null ? `${attendanceRate}%` : "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Taux de présence</div>
        </div>
      </div>

      {/* Historique */}
      {attendance.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune présence enregistrée.</p>
      ) : (
        <table className="w-full text-sm border">
          <thead>
            <tr className="border-b bg-muted">
              <th className="p-2 text-left">Événement</th>
              <th className="p-2 text-center">Type</th>
              <th className="p-2 text-center">Date</th>
              <th className="p-2 text-center">Statut</th>
            </tr>
          </thead>
          <tbody>
            {attendance.map((a: any, i: number) => (
              <tr key={i} className="border-b">
                <td className="p-2 font-medium">{a.event?.title ?? "—"}</td>
                <td className="p-2 text-center text-xs text-muted-foreground">{a.event?.event_type ?? "—"}</td>
                <td className="p-2 text-center text-xs text-muted-foreground">
                  {a.event?.start_at ? new Date(a.event.start_at).toLocaleDateString("fr-FR") : "—"}
                </td>
                <td className="p-2 text-center">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    a.status === "PRESENT"  ? "bg-green-100 text-green-700" :
                    a.status === "ABSENT"   ? "bg-red-100 text-red-700" :
                    a.status === "EXCUSED"  ? "bg-yellow-100 text-yellow-700" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {a.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  </div>
)
}