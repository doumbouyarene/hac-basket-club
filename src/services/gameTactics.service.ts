import { supabase } from "@/lib/supabase"

export type GameTactic = {
  tactic_id: string
  team_id: string | null
  title: string
  description: string | null
  facebook_url: string
  tactic_type: string | null
  created_at: string
}

export async function listGameTactics(): Promise<GameTactic[]> {
  const { data, error } = await supabase
    .from("game_tactics")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function createGameTactic(payload: {
  title: string
  facebook_url: string
  tactic_type?: string | null
  description?: string | null
}) {
  const { error } = await supabase
    .from("game_tactics")
    .insert({
      title: payload.title,
      facebook_url: payload.facebook_url,
      tactic_type: payload.tactic_type ?? null,
      description: payload.description ?? null,
    })

  if (error) throw error
}

export async function deleteGameTactic(tacticId: string) {
  const { error } = await supabase
    .from("game_tactics")
    .delete()
    .eq("tactic_id", tacticId)

  if (error) throw error
}