import { supabase } from './supabase'
import type { Role, Team, Player, Event, EventType, PlayerPublicEvent } from '../types/db'
import type { AttendanceRow, AttendanceStatus } from '../types/db'


function toErrorMessage(e: unknown): string {
  if (typeof e === 'string') return e
  if (e && typeof e === 'object' && 'message' in e) return String((e as any).message)
  return 'Erreur inconnue'
}

export async function getMyRole(): Promise<Role> {
  const user = (await supabase.auth.getUser()).data.user
  if (!user) throw new Error('Utilisateur non connecté')

  const { data, error } = await supabase
    .from('app_users')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (error) throw new Error(error.message)
  return data.role as Role
}

export async function getMyAppUser() {
  const user = (await supabase.auth.getUser()).data.user
  if (!user) throw new Error("Utilisateur non connecté")

  const { data, error } = await supabase
    .from("app_users")
    .select("user_id, email, role")
    .eq("user_id", user.id)
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function getMyPlayerProfile() {
  const user = (await supabase.auth.getUser()).data.user
  if (!user) throw new Error("Utilisateur non connecté")

  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("user_id", user.id)
    .limit(2)

  if (error) throw new Error(error.message)

  if (!data || data.length === 0) {
    throw new Error("Aucune fiche joueur n'est visible pour ce compte.")
  }

  if (data.length > 1) {
    throw new Error("Plusieurs fiches joueurs sont liées à ce compte.")
  }

  return data[0]
}

export async function listTeams(): Promise<Team[]> {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as Team[]
}

export async function listPlayers(): Promise<Player[]> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .order('last_name', { ascending: true })

  if (error) throw new Error(error.message)
  return data as Player[]
}

export async function createPlayer(payload: Omit<Player, 'player_id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('players')
    .insert(payload)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data as Player
}

export async function updatePlayer(player_id: string, payload: Partial<Player>) {
  const { data, error } = await supabase
    .from('players')
    .update(payload)
    .eq('player_id', player_id)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data as Player
}

export async function deletePlayer(player_id: string) {
  const { error } = await supabase
    .from('players')
    .delete()
    .eq('player_id', player_id)

  if (error) throw new Error(error.message)
}

export async function listEvents(): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('start_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as Event[]
}

export async function createEvent(payload: Omit<Event, 'event_id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('events')
    .insert(payload)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data as Event
}

export async function updateEvent(event_id: string, payload: Partial<Event>) {
  const { data, error } = await supabase
    .from('events')
    .update(payload)
    .eq('event_id', event_id)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data as Event
}

export async function deleteEvent(event_id: string) {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('event_id', event_id)

  if (error) throw new Error(error.message)
}

export { toErrorMessage }


export async function getEventById(event_id: string) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('event_id', event_id)
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function listPlayerPublicEvents(): Promise<PlayerPublicEvent[]> {
  const { data, error } = await supabase
    .from("player_events_public")
    .select("event_id, event_type, title, start_at, location, opponent_name, home_score, away_score")
    .order("start_at", { ascending: false })

  if (error) throw new Error(error.message)
  return data as PlayerPublicEvent[]
}

export async function listAttendanceByEvent(event_id: string) {
  // On récupère attendance + infos joueur via jointure
  const { data, error } = await supabase
    .from('attendance')
    .select(`
      attendance_id,
      event_id,
      player_id,
      status,
      comment,
      marked_at,
      marked_by,
      updated_at,
      players:player_id (
        player_id,
        first_name,
        last_name,
        position,
        photo_url,
        user_id
      )
    `)
    .eq('event_id', event_id)
    .order('updated_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as any[]
}

export async function updateAttendance(attendance_id: string, status: AttendanceStatus, comment: string | null) {
  const user = (await supabase.auth.getUser()).data.user
  if (!user) throw new Error('Utilisateur non connecté')

  const { data, error } = await supabase
    .from('attendance')
    .update({
      status,
      comment: comment?.trim() || null,
      marked_at: new Date().toISOString(),
      marked_by: user.id,
      updated_at: new Date().toISOString()
    })
    .eq('attendance_id', attendance_id)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data as AttendanceRow
}

export async function ensureAttendanceForEvent(event_id: string) {
  // RPC côté Postgres
  const { data, error } = await supabase.rpc('ensure_attendance_for_event', { p_event_id: event_id })
  if (error) throw new Error(error.message)
  return data as number
}
