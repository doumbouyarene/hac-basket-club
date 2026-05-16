import { supabase } from "@/lib/supabase"

export type TeamRow = {
  team_id: string
  name: string
}

export async function listTeams() {
  const { data, error } = await supabase
    .from("teams")
    .select("team_id, name")
    .order("name", { ascending: true })

  if (error) throw error
  return (data ?? []) as TeamRow[]
}