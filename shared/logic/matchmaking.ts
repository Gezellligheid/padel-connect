import type { Match, PairHistory, PlayerProfile } from '../types'
import { availabilityOverlap } from './availability'

export const WEIGHTS = {
  availability: 0.50,
  level: 0.22,
  hours: 0.10,
  novelty: 0.18,
} as const

export function pairKey(a: string, b: string): string {
  return a < b ? `${a}__${b}` : `${b}__${a}`
}

export type HistoryMap = Map<string, PairHistory>

function history(map: HistoryMap, a: string, b: string): PairHistory {
  return map.get(pairKey(a, b)) ?? { id: pairKey(a, b), together: 0, partnered: 0 }
}

/** 0 – 1. How good a court-mate is `b` for `a` right now? */
export function affinity(a: PlayerProfile, b: PlayerProfile, map: HistoryMap): number {
  const avail = availabilityOverlap(a.availability, b.availability)
  const level = 1 - Math.abs(a.level - b.level) / 3
  const hours = 1 - Math.min(Math.abs(a.hoursPerWeek - b.hoursPerWeek), 5) / 5
  const novelty = 1 / (1 + history(map, a.id, b.id).together)
  return (
    WEIGHTS.availability * avail
    + WEIGHTS.level * level
    + WEIGHTS.hours * hours
    + WEIGHTS.novelty * novelty
  )
}

/** Deterministic-but-shufflable RNG so a round can be replayed from its seed. */
export function mulberry32(seed: number) {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6D2B79F5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffle<T>(items: T[], rng: () => number): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

/**
 * Picks who plays this round. Courts × 4 is the hard ceiling, so with 50
 * players and 8 courts only 32 people are on a court at once — the rest get
 * bench priority next round. Nobody should sit out twice in a row.
 */
export function selectPlayers(
  candidates: PlayerProfile[],
  capacity: number,
  rng: () => number,
): { playing: PlayerProfile[], benched: PlayerProfile[] } {
  const seats = Math.min(capacity, Math.floor(candidates.length / 4) * 4)
  const ranked = shuffle(candidates, rng).sort((a, b) => {
    // longest-waiting first, then fewest rounds played
    if (b.roundsBenched !== a.roundsBenched) return b.roundsBenched - a.roundsBenched
    return a.roundsPlayed - b.roundsPlayed
  })
  return { playing: ranked.slice(0, seats), benched: ranked.slice(seats) }
}

/**
 * Greedy affinity grouping. Each group is seeded with the player who is
 * hardest to place (smallest agenda, longest bench streak) and then filled
 * with the three best-scoring partners, picked from the top of the list with a
 * little randomness so two identical rounds never produce identical foursomes.
 */
export function buildGroups(
  players: PlayerProfile[],
  map: HistoryMap,
  rng: () => number,
): PlayerProfile[][] {
  const pool = players.slice()
  const groups: PlayerProfile[][] = []

  while (pool.length >= 4) {
    pool.sort((a, b) => {
      if (b.roundsBenched !== a.roundsBenched) return b.roundsBenched - a.roundsBenched
      return a.availability.length - b.availability.length
    })
    const seed = pool.shift()!
    const group = [seed]

    while (group.length < 4 && pool.length) {
      const scored = pool
        .map(p => ({
          p,
          score: group.reduce((sum, g) => sum + affinity(g, p, map), 0) / group.length,
        }))
        .sort((a, b) => b.score - a.score)

      // weighted pick from the top candidates keeps it fresh without pairing
      // people who have nothing in common
      const window = scored.slice(0, Math.min(3, scored.length))
      const total = window.reduce((s, c) => s + c.score + 0.001, 0)
      let roll = rng() * total
      let chosen = window[0]!
      for (const c of window) {
        roll -= c.score + 0.001
        if (roll <= 0) { chosen = c; break }
      }
      group.push(chosen.p)
      pool.splice(pool.indexOf(chosen.p), 1)
    }
    groups.push(group)
  }
  return groups
}

/** Of the three possible 2v2 splits, prefer the one with the freshest pairs. */
export function splitTeams(
  group: PlayerProfile[],
  map: HistoryMap,
  rng: () => number,
): [[string, string], [string, string]] {
  const [a, b, c, d] = group as [PlayerProfile, PlayerProfile, PlayerProfile, PlayerProfile]
  const options: [[string, string], [string, string]][] = [
    [[a.id, b.id], [c.id, d.id]],
    [[a.id, c.id], [b.id, d.id]],
    [[a.id, d.id], [b.id, c.id]],
  ]
  const cost = (opt: [[string, string], [string, string]]) =>
    opt.reduce((sum, team) => sum + history(map, team[0], team[1]).partnered, 0) + rng() * 0.4
  return options.sort((x, y) => cost(x) - cost(y))[0]!
}

export interface DrawInput {
  roundId: string
  candidates: PlayerProfile[]
  fieldCount: number
  fieldNames: string[]
  history: HistoryMap
  seed?: number
  now?: number
}

export interface DrawResult {
  matches: Omit<Match, 'id'>[]
  benchIds: string[]
  playingIds: string[]
}

export function drawRound(input: DrawInput): DrawResult {
  const now = input.now ?? Date.now()
  const rng = mulberry32(input.seed ?? now)
  const { playing, benched } = selectPlayers(input.candidates, input.fieldCount * 4, rng)
  const groups = buildGroups(playing, input.history, rng)

  const matches = groups.map((group, i) => {
    const teams = splitTeams(group, input.history, rng)
    return {
      roundId: input.roundId,
      field: i + 1,
      fieldName: input.fieldNames[i] ?? `Veld ${i + 1}`,
      teams,
      playerIds: [...teams[0], ...teams[1]],
      score: [0, 0] as [number, number],
      finishedBy: [],
      status: 'playing' as const,
      startedAt: now,
      endedAt: null,
    }
  })

  return {
    matches,
    benchIds: benched.map(p => p.id),
    playingIds: groups.flat().map(p => p.id),
  }
}
