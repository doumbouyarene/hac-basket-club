
import { supabase } from "@/lib/supabase"

export type PlayerMatchStat = {
  stat_id: string
  player_id: string
  event_id: string

  minutes_played: number | null
  points: number | null
  rebounds: number | null
  assists: number | null
  fouls: number | null
  steals: number | null
  turnovers: number | null
  blocks: number | null

  fg2_made: number | null
  fg2_attempted: number | null
  fg3_made: number | null
  fg3_attempted: number | null
  ft_made: number | null
  ft_attempted: number | null
  plus_minus: number | null

  created_at: string
}

export async function listStatsByEvent(eventId: string) {
  const { data, error } = await supabase
    .from("player_match_stats")
    .select("*")
    .eq("event_id", eventId)

  if (error) throw error
  return data as PlayerMatchStat[]
}

export async function upsertPlayerStat(payload: Omit<PlayerMatchStat, "stat_id" | "created_at">) {
  const { error } = await supabase
    .from("player_match_stats")
    .upsert(payload, {
      onConflict: "player_id,event_id",
    })

  if (error) throw error
}

export async function listStatsByPlayer(playerId: string) {
  const { data, error } = await supabase
    .from("player_match_stats")
    .select("*")
    .eq("player_id", playerId)

  if (error) throw error
  return data
}

export async function listStatsByPlayerWithEvents(playerId: string) {
  const { data, error } = await supabase
    .from("player_match_stats")
    .select(`
        stat_id,
        minutes_played,
        points,
        rebounds,
        assists,
        steals,
        turnovers,
        fouls,
        fg2_made,
        fg2_attempted,
        fg3_made,
        fg3_attempted,
        ft_made,
        ft_attempted,
        plus_minus,
        event:events (
              event_id,
              title,
              start_at,
              mvp_player_id,
              impact_player_id
            )
    `)
    .eq("player_id", playerId)

  if (error) throw error

  const rows = (data ?? []) as any[]

  // ✅ tri descendant par date d'event (si présente)
  rows.sort((a, b) => {
    const da = a?.event?.start_at ? new Date(a.event.start_at).getTime() : 0
    const db = b?.event?.start_at ? new Date(b.event.start_at).getTime() : 0
    return db - da
  })

  return rows
}

export async function listStatsByPlayers(playerIds: string[]) {
  if (playerIds.length === 0) return []

  const { data, error } = await supabase
    .from("player_match_stats")
    .select("*")
    .in("player_id", playerIds)

  if (error) throw error

  return (data ?? []) as PlayerMatchStat[]
}