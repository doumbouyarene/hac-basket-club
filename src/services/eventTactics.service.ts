import { supabase } from "@/lib/supabase"

export async function linkTacticToEvent(
  tacticId: string,
  eventId: string
) {
  const { error } = await supabase
    .from("event_tactics")
    .insert({
      tactic_id: tacticId,
      event_id: eventId,
    })

  if (error) throw error
}

export async function unlinkTacticFromEvent(
  tacticId: string,
  eventId: string
) {
  const { error } = await supabase
    .from("event_tactics")
    .delete()
    .eq("tactic_id", tacticId)
    .eq("event_id", eventId)

  if (error) throw error
}

export async function listTacticIdsByEvent(eventId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("event_tactics")
    .select("tactic_id")
    .eq("event_id", eventId)

  if (error) throw error

  return (data ?? []).map((row) => row.tactic_id)
}