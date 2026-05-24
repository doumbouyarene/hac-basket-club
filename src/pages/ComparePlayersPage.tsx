import { useEffect, useMemo, useState } from "react"
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend,
} from "recharts"
import { Trophy, Zap } from "lucide-react"
import { listPlayers, type PlayerRow } from "@/services/players.service"
import { listStatsByPlayers, type PlayerMatchStat } from "@/services/playerMatchStats.service"
import { supabase } from "@/lib/supabase"

type CompareSummary = {
  player: PlayerRow
  games: number
  points: number
  rebounds: number
  assists: number
  steals: number
  blocks: number
  turnovers: number
  plusMinus: number
  attendanceRate: number | null
  mvpCount: number
  impactCount: number
}

function avg(values: number[]) {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function round1(value: number) {
  return Number(value.toFixed(1))
}

function buildSummary(
  player: PlayerRow,
  stats: PlayerMatchStat[],
  attendanceRows: any[],
  awardRows: any[]
): CompareSummary {
  const playerStats = stats.filter((s) => s.player_id === player.player_id)

  const relevantAttendance = attendanceRows.filter(
    (a) =>
      a.player_id === player.player_id &&
      ["PRESENT", "LATE", "ABSENT"].includes(a.status)
  )

  const presentLike = relevantAttendance.filter(
    (a) => a.status === "PRESENT" || a.status === "LATE"
  )

  const attendanceRate =
    relevantAttendance.length > 0
      ? Math.round((presentLike.length / relevantAttendance.length) * 100)
      : null

  return {
    player,
    games: playerStats.length,
    points: round1(avg(playerStats.map((s) => s.points ?? 0))),
    rebounds: round1(avg(playerStats.map((s) => s.rebounds ?? 0))),
    assists: round1(avg(playerStats.map((s) => s.assists ?? 0))),
    steals: round1(avg(playerStats.map((s) => s.steals ?? 0))),
    blocks: round1(avg(playerStats.map((s) => s.blocks ?? 0))),
    turnovers: round1(avg(playerStats.map((s) => s.turnovers ?? 0))),
    plusMinus: round1(avg(playerStats.map((s) => s.plus_minus ?? 0))),
    attendanceRate,
    mvpCount: awardRows.filter((e) => e.mvp_player_id === player.player_id).length,
    impactCount: awardRows.filter((e) => e.impact_player_id === player.player_id).length,
  }
}

function valueOf(summary: CompareSummary, key: keyof CompareSummary) {
  const value = summary[key]
  return typeof value === "number" ? value : null
}

function WinnerBadge({
  a,
  b,
  metric,
  lowerIsBetter = false,
}: {
  a: CompareSummary
  b: CompareSummary
  metric: keyof CompareSummary
  lowerIsBetter?: boolean
}) {
  const av = valueOf(a, metric)
  const bv = valueOf(b, metric)

  if (av === null || bv === null || av === bv) return null

  const winner = lowerIsBetter ? (av < bv ? a : b) : av > bv ? a : b

  return (
    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
      Avantage {winner.player.last_name}
    </span>
  )
}

function PlayerCard({ summary }: { summary: CompareSummary }) {
  const p = summary.player

  return (
    <div className="rounded-md border bg-background p-4 space-y-4">
      <div className="flex items-center gap-3">
        {p.photo_url ? (
          <img
            src={p.photo_url}
            alt={`${p.first_name} ${p.last_name}`}
            className="h-14 w-14 rounded-full object-cover border"
          />
        ) : (
          <div className="h-14 w-14 rounded-full bg-muted border flex items-center justify-center font-semibold">
            {p.first_name[0]}{p.last_name[0]}
          </div>
        )}

        <div className="min-w-0">
          <div className="font-semibold leading-tight">
            {p.last_name} {p.first_name}
          </div>
          <div className="text-sm text-muted-foreground">
            {p.position ?? "Poste non renseigné"}
          </div>
          {p.archetype && (
            <div className="text-xs text-muted-foreground truncate">
              {p.archetype}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Pts", value: summary.points },
          { label: "Reb", value: summary.rebounds },
          { label: "Ast", value: summary.assists },
          { label: "+/-", value: summary.plusMinus },
          { label: "Prés.", value: summary.attendanceRate !== null ? `${summary.attendanceRate}%` : "—" },
          { label: "Matchs", value: summary.games },
        ].map((item) => (
          <div key={item.label} className="rounded-md bg-muted/60 p-2 text-center">
            <div className="font-semibold">{item.value}</div>
            <div className="text-[11px] text-muted-foreground">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 text-sm">
        <span className="inline-flex items-center gap-1 rounded-md border px-2 py-1">
          <Trophy className="h-4 w-4 text-amber-600" />
          {summary.mvpCount} MVP
        </span>
        <span className="inline-flex items-center gap-1 rounded-md border px-2 py-1">
          <Zap className="h-4 w-4 text-blue-600" />
          {summary.impactCount} Impact
        </span>
      </div>
    </div>
  )
}

export function ComparePlayersPage() {
  const [players, setPlayers] = useState<PlayerRow[]>([])
  const [playerAId, setPlayerAId] = useState("")
  const [playerBId, setPlayerBId] = useState("")
  const [stats, setStats] = useState<PlayerMatchStat[]>([])
  const [attendanceRows, setAttendanceRows] = useState<any[]>([])
  const [awardRows, setAwardRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadPlayers() {
      try {
        const data = await listPlayers({ status: "ACTIVE" })
        setPlayers(data)
      } catch (e: any) {
        setError(e.message ?? "Erreur chargement joueurs")
      } finally {
        setLoading(false)
      }
    }

    loadPlayers()
  }, [])

  useEffect(() => {
    async function loadComparisonData() {
      const ids = [playerAId, playerBId].filter(Boolean)
      if (ids.length === 0) return

      const [statsData, attendanceRes, awardsRes] = await Promise.all([
        listStatsByPlayers(ids),
        supabase
          .from("attendance")
          .select("player_id, status")
          .in("player_id", ids),
        supabase
          .from("events")
          .select("mvp_player_id, impact_player_id")
          .or(`mvp_player_id.in.(${ids.join(",")}),impact_player_id.in.(${ids.join(",")})`),
      ])

      if (attendanceRes.error) throw attendanceRes.error
      if (awardsRes.error) throw awardsRes.error

      setStats(statsData)
      setAttendanceRows(attendanceRes.data ?? [])
      setAwardRows(awardsRes.data ?? [])
    }

    loadComparisonData().catch((e) =>
      setError(e.message ?? "Erreur comparaison")
    )
  }, [playerAId, playerBId])

  const selectedA = players.find((p) => p.player_id === playerAId)
  const selectedB = players.find((p) => p.player_id === playerBId)

  const summaryA = useMemo(
    () =>
      selectedA
        ? buildSummary(selectedA, stats, attendanceRows, awardRows)
        : null,
    [selectedA, stats, attendanceRows, awardRows]
  )

  const summaryB = useMemo(
    () =>
      selectedB
        ? buildSummary(selectedB, stats, attendanceRows, awardRows)
        : null,
    [selectedB, stats, attendanceRows, awardRows]
  )

  const radarData =
    summaryA && summaryB
      ? [
          { stat: "OFF", A: selectedA?.off_rating ?? 0, B: selectedB?.off_rating ?? 0 },
          { stat: "DEF", A: selectedA?.def_rating ?? 0, B: selectedB?.def_rating ?? 0 },
          { stat: "TEC", A: selectedA?.tec_rating ?? 0, B: selectedB?.tec_rating ?? 0 },
          { stat: "PHY", A: selectedA?.phy_rating ?? 0, B: selectedB?.phy_rating ?? 0 },
          { stat: "SPD", A: selectedA?.spd_rating ?? 0, B: selectedB?.spd_rating ?? 0 },
          { stat: "STA", A: selectedA?.sta_rating ?? 0, B: selectedB?.sta_rating ?? 0 },
        ]
      : []

  if (loading) return <div className="p-6">Chargement...</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Comparateur de profils</h2>
        <p className="text-sm text-muted-foreground">
          Compare deux joueurs selon leurs aptitudes, stats, présence et récompenses.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <select
          className="w-full rounded-md border bg-background px-3 py-2"
          value={playerAId}
          onChange={(e) => setPlayerAId(e.target.value)}
        >
          <option value="">Choisir joueur A</option>
          {players.map((p) => (
            <option key={p.player_id} value={p.player_id}>
              {p.last_name} {p.first_name}
            </option>
          ))}
        </select>

        <select
          className="w-full rounded-md border bg-background px-3 py-2"
          value={playerBId}
          onChange={(e) => setPlayerBId(e.target.value)}
        >
          <option value="">Choisir joueur B</option>
          {players
            .filter((p) => p.player_id !== playerAId)
            .map((p) => (
              <option key={p.player_id} value={p.player_id}>
                {p.last_name} {p.first_name}
              </option>
            ))}
        </select>
      </div>

      {summaryA && summaryB && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <PlayerCard summary={summaryA} />
            <PlayerCard summary={summaryB} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-md border bg-background p-4">
              <h3 className="font-semibold">Aptitudes</h3>
              <RadarChart width={360} height={300} data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="stat" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
                <Radar name={summaryA.player.last_name} dataKey="A" stroke="#2563eb" fill="#2563eb" fillOpacity={0.25} />
                <Radar name={summaryB.player.last_name} dataKey="B" stroke="#dc2626" fill="#dc2626" fillOpacity={0.2} />
                <Legend />
              </RadarChart>
            </div>

            <div className="rounded-md border bg-background p-4 space-y-3">
              <h3 className="font-semibold">Avantages clés</h3>

              {[
                { label: "Scoring", metric: "points" as const },
                { label: "Rebond", metric: "rebounds" as const },
                { label: "Création", metric: "assists" as const },
                { label: "Défense active", metric: "steals" as const },
                { label: "Protection cercle", metric: "blocks" as const },
                { label: "Discipline ballon", metric: "turnovers" as const, lowerIsBetter: true },
                { label: "Impact +/-", metric: "plusMinus" as const },
                { label: "Présence", metric: "attendanceRate" as const },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3 rounded-md bg-muted/50 px-3 py-2">
                  <span className="text-sm font-medium">{row.label}</span>
                  <WinnerBadge
                    a={summaryA}
                    b={summaryB}
                    metric={row.metric}
                    lowerIsBetter={row.lowerIsBetter}
                  />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}