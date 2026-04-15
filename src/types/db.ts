export type Role = 'ADMIN' | 'COACH' | 'PLAYER'

export type Team = {
  team_id: string
  name: string
  category: string | null
  season: string | null
  is_active: boolean
  created_at: string
}

export type PlayerStatus = 'ACTIVE' | 'INJURED' | 'SUSPENDED'

export type Player = {
  player_id: string
  team_id: string
  user_id: string | null
  first_name: string
  last_name: string
  position: string | null
  status: PlayerStatus
  created_at: string
  updated_at: string
  photo_url: string
}

export type EventType = 'TRAINING' | 'MATCH'

export type Event = {
  event_id: string
  team_id: string
  event_type: EventType
  title: string
  start_at: string
  end_at: string | null
  location: string | null
  notes: string | null
  created_by: string | null
  created_at: string
}

export type AttendanceStatus = 'PENDING' | 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'LATE'

export type AttendanceRow = {
  attendance_id: string
  event_id: string
  player_id: string
  status: AttendanceStatus
  comment: string | null
  marked_at: string | null
  marked_by: string | null
  updated_at: string
}