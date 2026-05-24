import { PlayerRow } from "@/services/players.service"

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
  home_score: number | null
  away_score: number | null
  opponent_name?: string | null
  mvp_player_id: string | null
  impact_player_id: string | null
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

export type PlayerPublicEvent = {
  event_id: string
  event_type: EventType
  title: string
  start_at: string
  location: string | null
  opponent_name: string | null
  home_score: number | null
  away_score: number | null
}

export type TopPlayer = { name: string; avg: number }

export type LowAttendancePlayer = {
  playerId: string
  name: string
  rate: number
  present: number
  total: number
}

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
  lowAttendancePlayers: LowAttendancePlayer[]
}

export type LineupSlot = "PG" | "SG" | "SF" | "PF" | "C"

export type RecommendedLineupPlayer = {
  slot: LineupSlot
  player: PlayerRow
  score: number
  reasons: string[]
  averages: PlayerAverages
}

export type PlayerAverages = {
  points: number
  rebounds: number
  assists: number
  steals: number
  blocks: number
}

type CompareSummary = {
  player: PlayerRow
  games: number
  points: number
  rebounds: number
  assists: number
  steals: number
  blocks: number
  turnovers: number
  plusMinus: number
  attendanceRate: number | null
  mvpCount: number
  impactCount: number
}