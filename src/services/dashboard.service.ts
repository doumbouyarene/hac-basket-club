import { supabase } from "@/lib/supabase"

export type TopPlayer = { name: string; avg: number }

export type DashboardKpis = {
  playersActive: number
  wins: number
  losses: number
  winRate: number
  lastMatches: { title: string; homeScore: number; awayScore: number; opponent: string }[]
  attendanceRate: number
  topScorer: TopPlayer | null
  topAssist: TopPlayer | null
  topBlocks: TopPlayer | null
  topSteals: TopPlayer | null
}

export async function fetchDashboardKpis(): Promise<DashboardKpis> {
  const [
    playersRes,
    matchesRes,
    attendanceRes,
    statsRes,
  ] = await Promise.all([
    supabase
      .from("players")
      .select("player_id", { count: "exact", head: true })
      .eq("status", "ACTIVE"),

    supabase
      .from("events")
      .select("home_score, away_score, title, opponent_name")
      .eq("event_type", "MATCH")
      .not("home_score", "is", null)
      .order("start_at", { ascending: false }),

    supabase
      .from("attendance")
      .select("status"),

    supabase
      .from("player_match_stats")
      .select("player_id, points, assists, steals, blocks, players(first_name, last_name)"),
  ])

  if (playersRes.error) throw playersRes.error
  if (matchesRes.error) throw matchesRes.error
  if (attendanceRes.error) throw attendanceRes.error
  if (statsRes.error) throw statsRes.error

  // Bilan
  const matches = matchesRes.data ?? []
  const wins = matches.filter(m => (m.home_score ?? 0) > (m.away_score ?? 0)).length
  const losses = matches.filter(m => (m.home_score ?? 0) < (m.away_score ?? 0)).length
  const winRate = matches.length > 0 ? Math.round((wins / matches.length) * 100) : 0

  // Derniers matchs
  const lastMatches = matches.slice(0, 3).map(m => ({
  title: m.title,
  homeScore: m.home_score!,
  awayScore: m.away_score!,
  opponent: m.opponent_name ?? "Adversaire",
}))

  // Taux de présence
  const att = attendanceRes.data ?? []
  const relevant = att.filter(a => a.status === "PRESENT" || a.status === "ABSENT")
  const attendanceRate = relevant.length > 0
    ? Math.round((att.filter(a => a.status === "PRESENT").length / relevant.length) * 100)
    : 0

  // Top players
  const rows = (statsRes.data ?? []) as any[]

  function topBy(field: string): TopPlayer | null {
    const byPlayer = new Map<string, { name: string; total: number; count: number }>()
    for (const r of rows) {
      if (r[field] == null) continue
      const name = `${r.players?.first_name ?? ""} ${r.players?.last_name ?? ""}`.trim()
      const prev = byPlayer.get(r.player_id) ?? { name, total: 0, count: 0 }
      byPlayer.set(r.player_id, { name, total: prev.total + r[field], count: prev.count + 1 })
    }
    if (byPlayer.size === 0) return null
    const best = [...byPlayer.values()].sort((a, b) => (b.total / b.count) - (a.total / a.count))[0]
    return { name: best.name, avg: parseFloat((best.total / best.count).toFixed(1)) }
  }

  return {
    playersActive: playersRes.count ?? 0,
    wins,
    losses,
    winRate,
    lastMatches,
    attendanceRate,
    topScorer: topBy("points"),
    topAssist: topBy("assists"),
    topBlocks: topBy("blocks"),
    topSteals: topBy("steals"),
  }
}