import type { PlayerRow } from "@/services/players.service"
import type { PlayerMatchStat } from "@/services/playerMatchStats.service"
import { LineupSlot } from "@/types/db"
import { RecommendedLineupPlayer } from "@/types/db"
import { PlayerAverages } from "@/types/db"

const SLOT_LABELS: Record<LineupSlot, string> = {
  PG: "Meneur",
  SG: "Arrière",
  SF: "Ailier",
  PF: "Ailier fort",
  C: "Pivot",
}

function normalize(value?: string | null) {
  return value
    ?.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim() ?? ""
}

function preferredSlots(player: PlayerRow): LineupSlot[] {
  const position = normalize(player.position)
  const archetype = normalize(player.archetype)

  if (position.includes("meneur")) return ["PG"]
  if (position.includes("arriere")) return ["SG"]
  if (position === "ailier" || position.includes("small forward")) return ["SF"]
  if (position.includes("ailier fort")) return ["PF"]
  if (position.includes("pivot")) return ["C"]

  if (archetype.includes("playmaker") || archetype.includes("floor general")) return ["PG"]
  if (archetype.includes("sharpshooter") || archetype.includes("shot creator") || archetype.includes("scoring guard")) return ["SG"]
  if (archetype.includes("wing") || archetype.includes("3 & d")) return ["SF"]
  if (archetype.includes("stretch four") || archetype.includes("hybrid big")) return ["PF"]
  if (archetype.includes("rim protector") || archetype.includes("paint beast") || archetype.includes("glass cleaner")) return ["C"]

  return []
}

const FALLBACK_SLOTS: Record<LineupSlot, LineupSlot[]> = {
  PG: ["SG"],
  SG: ["PG", "SF"],
  SF: ["SG", "PF"],
  PF: ["SF", "C"],
  C: ["PF"],
}

function isCompatibleWithSlot(player: PlayerRow, slot: LineupSlot) {
  const slots = preferredSlots(player)
  return slots.includes(slot)
}

function isFallbackCompatible(player: PlayerRow, slot: LineupSlot) {
  const slots = preferredSlots(player)
  return slots.some((s) => FALLBACK_SLOTS[slot].includes(s))
}

function avg(values: number[]) {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function aptitudeScore(player: PlayerRow) {
  const values = [
    player.off_rating,
    player.def_rating,
    player.tec_rating,
    player.phy_rating,
    player.spd_rating,
    player.sta_rating,
  ].filter((v): v is number => typeof v === "number")

  return values.length > 0 ? avg(values) : 50
}

function recentFormScore(stats: PlayerMatchStat[]) {
  const recent = stats.slice(0, 5)

  if (recent.length === 0) return 50

  const points = avg(recent.map((s) => s.points ?? 0))
  const rebounds = avg(recent.map((s) => s.rebounds ?? 0))
  const assists = avg(recent.map((s) => s.assists ?? 0))
  const steals = avg(recent.map((s) => s.steals ?? 0))
  const blocks = avg(recent.map((s) => s.blocks ?? 0))
  const plusMinus = avg(recent.map((s) => s.plus_minus ?? 0))

  return Math.min(
    100,
    points * 3 +
      rebounds * 2 +
      assists * 2 +
      steals * 4 +
      blocks * 4 +
      Math.max(0, plusMinus) * 1.5
  )
}

function playerScore(player: PlayerRow, stats: PlayerMatchStat[], slot: LineupSlot) {
  const slotFit = isCompatibleWithSlot(player, slot)
  ? 100
  : isFallbackCompatible(player, slot)
    ? 75
    : 20
  const aptitudes = aptitudeScore(player)
  const form = recentFormScore(stats)

  return Math.round(
  aptitudes * 0.35 +
    form * 0.25 +
    slotFit * 0.40
    )
}

function round1(value: number) {
  return Number(value.toFixed(1))
}

function playerAverages(stats: PlayerMatchStat[]): PlayerAverages {
  if (stats.length === 0) {
    return {
      points: 0,
      rebounds: 0,
      assists: 0,
      steals: 0,
      blocks: 0,
    }
  }

  return {
    points: round1(avg(stats.map((s) => s.points ?? 0))),
    rebounds: round1(avg(stats.map((s) => s.rebounds ?? 0))),
    assists: round1(avg(stats.map((s) => s.assists ?? 0))),
    steals: round1(avg(stats.map((s) => s.steals ?? 0))),
    blocks: round1(avg(stats.map((s) => s.blocks ?? 0))),
  }
}

export function recommendStartingFive(
  players: PlayerRow[],
  statsByPlayer: Record<string, PlayerMatchStat[]>
): RecommendedLineupPlayer[] {
  const eligible = players.filter((p) => p.status === "ACTIVE")
  const selected = new Set<string>()
  const slots: LineupSlot[] = ["PG", "SG", "SF", "PF", "C"]

  return slots.flatMap((slot) => {
    const exactCandidates = eligible
      .filter((p) => !selected.has(p.player_id))
      .filter((p) => isCompatibleWithSlot(p, slot))

    const fallbackCandidates = eligible
      .filter((p) => !selected.has(p.player_id))
      .filter((p) => isFallbackCompatible(p, slot))

    const pool =
      exactCandidates.length > 0
        ? exactCandidates
        : fallbackCandidates.length > 0
          ? fallbackCandidates
          : eligible.filter((p) => !selected.has(p.player_id))

    const candidates = pool
      .map((player) => {
        const stats = statsByPlayer[player.player_id] ?? []
        const exact = isCompatibleWithSlot(player, slot)
        const fallback = isFallbackCompatible(player, slot)

        return {
          slot,
          player,
          score: playerScore(player, stats, slot),
          reasons: [
            exact ? "Poste naturel" : fallback ? "Poste proche" : "Fallback",
            player.archetype ?? player.position ?? "Profil polyvalent",
          ],
          averages: playerAverages(stats),
        }
      })
      .sort((a, b) => b.score - a.score)

    const pick = candidates[0]
    if (!pick) return []

    selected.add(pick.player.player_id)
    return [pick]
  })
}