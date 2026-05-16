import { supabase } from "../../lib/supabase"

export async function fetchPresenceData(eventId: string) {
  // 🔹 Événement
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("event_id, title, start_at, opponent_name, team_id")
    .eq("event_id", eventId)
    .single()
    
    if (eventError) {
    throw eventError
    }

    if (!event) {
    throw new Error(`Événement introuvable pour eventId=${eventId}`)
    }


  // 🔹 Présences = PRESENT
  const { data: attendance, error: attError } = await supabase
    .from("attendance")
    .select(`
      player:players (
        first_name,
        last_name,
        position
      )
    `)
    .eq("event_id", eventId)
    .eq("status", "PRESENT")

  if (attError) throw attError

  return { event, attendance }
}