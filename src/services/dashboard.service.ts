import { supabase } from "@/lib/supabase"

export type DashboardKpis = {
  playersCount: number
  eventsCount: number
  presentToday: number
}

export async function fetchDashboardKpis(
  today: Date
): Promise<DashboardKpis> {
  const start = new Date(today)
  start.setHours(0, 0, 0, 0)

  const end = new Date(today)
  end.setHours(23, 59, 59, 999)


const [playersRes, eventsRes, attendanceRes] = await Promise.all([
    // ✅ JOUEURS ACTIFS UNIQUEMENT
    supabase
      .from("players")
      .select("player_id", { count: "exact", head: true }),

    // ✅ TOUS LES ÉVÉNEMENTS (visibles via RLS)
    supabase
      .from("events")
      .select("event_id", { count: "exact", head: true }),

    // ✅ PRÉSENTS AUJOURD’HUI (corrigé précédemment)
    supabase
      .from("attendance")
      .select("attendance_id", { count: "exact", head: true })
      .eq("status", "PRESENT")
      .gte("marked_at", start.toISOString())
      .lte("marked_at", end.toISOString()),
  ])

  if (playersRes.error) throw playersRes.error
  if (eventsRes.error) throw eventsRes.error
  if (attendanceRes.error) throw attendanceRes.error

  return {
    playersCount: playersRes.count ?? 0,
    eventsCount: eventsRes.count ?? 0,
    presentToday: attendanceRes.count ?? 0,
  }
}