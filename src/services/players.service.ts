import { supabase } from "@/lib/supabase"

export type PlayerStatus = "ACTIVE" | "INJURED" | "SUSPENDED"

export type PlayerRow = {
  player_id: string
  team_id: string
  user_id: string | null
  first_name: string
  last_name: string
  birth_date: string | null        // 'yyyy-mm-dd'
  birth_place: string | null
  height_cm: number | null
  weight_kg: number | null
  neighborhood: string | null
  position: string | null
  status: PlayerStatus
  photo_url: string | null
  archetype: string | null
  off_rating: number | null
  def_rating: number | null
  tec_rating: number | null
  phy_rating: number | null
  spd_rating: number | null
  sta_rating: number | null
  created_at: string
  updated_at: string
}

export type PlayerCreate = {
  team_id: string
  first_name: string
  last_name: string
  birth_date: string | null        // 'yyyy-mm-dd'
  birth_place: string | null
  height_cm: number | null
  weight_kg: number | null
  neighborhood: string | null
  position?: string | null
  status?: PlayerStatus
  photo_url?: string | null
  archetype?: string | null
  user_id?: string | null
  off_rating: number | null
  def_rating: number | null
  tec_rating: number | null
  phy_rating: number | null
  spd_rating: number | null
  sta_rating: number | null
}

export type PlayerUpdate = Partial<Omit<PlayerCreate, "team_id">> & {
  status?: PlayerStatus
}

export async function listPlayers(params: {
  search?: string
  status?: PlayerStatus | "ALL"
  team_id?: string
}) {
  const { search, status, team_id } = params

  let q = supabase
  .from("players")
  .select(`
      player_id,
      team_id,
      first_name,
      last_name,
      birth_date,
      birth_place,
      height_cm,
      weight_kg,
      neighborhood,
      position,
      status,
      photo_url,
      archetype,
      off_rating,
      def_rating,
      tec_rating,
      phy_rating,
      spd_rating,
      sta_rating
      `)
  .order("last_name", { ascending: true })
  .order("first_name", { ascending: true })

  if (team_id) q = q.eq("team_id", team_id)
  if (status && status !== "ALL") q = q.eq("status", status)

  if (search && search.trim()) {
    // PostgREST: or() sur colonnes texte
    const s = search.trim()
    q = q.or(`first_name.ilike.%${s}%,last_name.ilike.%${s}%`)
  }

  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as PlayerRow[]
}

export async function createPlayer(payload: PlayerCreate) {
  const { data, error } = await supabase
    .from("players")
    .insert({
        team_id: payload.team_id,
        first_name: payload.first_name,
        last_name: payload.last_name,
        birth_date: payload.birth_date ?? null,
        birth_place: payload.birth_place ?? null,
        height_cm: payload.height_cm ?? null,
        weight_kg: payload.weight_kg ?? null,
        neighborhood: payload.neighborhood ?? null,
        position: payload.position ?? null,
        status: payload.status,
        photo_url: payload.photo_url ?? null,
        archetype: payload.archetype ?? null,
        off_rating: payload.off_rating ?? null,
        def_rating: payload.def_rating ?? null,
        tec_rating: payload.tec_rating ?? null,
        phy_rating: payload.phy_rating ?? null,
        spd_rating: payload.spd_rating ?? null,
        sta_rating: payload.sta_rating ?? null,
    })


    .select(
      "player_id, team_id, user_id, first_name, last_name, position, status, photo_url, archetype, off_rating, def_rating, tec_rating, phy_rating, spd_rating, sta_rating, created_at, updated_at"
    )
    .single()

  if (error) throw error
  return data as PlayerRow
}

export async function updatePlayer(player_id: string, patch: PlayerUpdate) {
  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  }

  const fields: (keyof PlayerUpdate)[] = [
    "first_name", "last_name", "birth_date", "birth_place",
    "height_cm", "weight_kg", "neighborhood", "position",
    "status", "photo_url", "archetype", "user_id",
    "off_rating", "def_rating", "tec_rating", "phy_rating", "spd_rating", "sta_rating",
  ]

  for (const field of fields) {
    if (field in patch) {
      updateData[field] = (patch as any)[field] ?? null
    }
  }

  const { data, error } = await supabase
    .from("players")
    .update(updateData)
    .eq("player_id", player_id)
    .select("player_id, team_id, user_id, first_name, last_name, birth_date, birth_place, height_cm, weight_kg, neighborhood, position, status, photo_url, archetype, off_rating, def_rating, tec_rating, phy_rating, spd_rating, sta_rating, created_at, updated_at")
    .single()

  if (error) throw error
  return data as PlayerRow
}

export async function deletePlayer(player_id: string) {
  const { error } = await supabase.from("players").delete().eq("player_id", player_id)
  if (error) throw error
}


export async function getPlayerById(playerId: string) {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("player_id", playerId)
    .single()

  if (error) throw error
  return data
}


export async function listPlayersByTeam(teamId: string) {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("team_id", teamId)
    .order("last_name", { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function listPlayersByEventAttendance(eventId: string) {
  const { data, error } = await supabase
    .from("attendance")
    .select(`
      player_id,
      status,
      players:player_id (*)
    `)
    .eq("event_id", eventId)
    .in("status", ["PRESENT", "LATE"])

  if (error) throw error

  return (data ?? [])
    .map((row: any) => row.players)
    .filter(Boolean)
}