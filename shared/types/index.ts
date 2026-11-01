/** Domain model for Padel Connect. Shared by the Nitro server, the Firestore
 *  client driver and the on-device demo driver. */

export type DayKey = 'ma' | 'di' | 'wo' | 'do' | 'vr' | 'za' | 'zo'
export type BlockKey = 'ochtend' | 'middag' | 'avond'
/** e.g. `"wo-avond"` */
export type SlotKey = `${DayKey}-${BlockKey}`

/** 1 = never held a racket, 4 = plays every week */
export type SkillLevel = 1 | 2 | 3 | 4

export interface PlayerProfile {
  id: string
  name: string
  age: number | null
  /** data-URL of a square 320px jpeg, or null */
  photo: string | null
  hobbies: string[]
  bio: string
  level: SkillLevel
  /** hours per week someone wants to spend on padel */
  hoursPerWeek: number
  availability: SlotKey[]
  createdAt: number
  /** on-site: is this player actually here and playing along? */
  present: boolean
  /** bookkeeping used by the matchmaker */
  roundsPlayed: number
  roundsBenched: number
  /** last round this player was part of */
  lastRoundId: string | null
}

/** Never leaves the server / the owner's own device without consent. */
export interface PlayerContact {
  phone: string
  /** timestamp of privacy-statement consent */
  consentAt: number
}

export type EventStatus = 'idle' | 'live' | 'ended'
export type RoundStatus = 'none' | 'playing' | 'connecting' | 'done'

export interface EventSettings {
  /** how many courts the venue has open */
  fieldCount: number
  /** games a match runs to before the group may close it off */
  gamesToWin: number
  /** names shown on the court cards, index 0 = court 1 */
  fieldNames: string[]
  /** allow players to register while the event is already live */
  registrationOpen: boolean
  /** soft reminder shown on the player home screen */
  announcement: string
}

export interface EventState {
  status: EventStatus
  settings: EventSettings
  currentRoundId: string | null
  roundCount: number
  startedAt: number | null
  endedAt: number | null
  updatedAt: number
}

export interface Round {
  id: string
  index: number
  status: RoundStatus
  startedAt: number
  endedAt: number | null
  /** players sitting this one out, in bench-priority order */
  benchIds: string[]
  matchIds: string[]
}

export type MatchStatus = 'playing' | 'finished'

export interface Match {
  id: string
  roundId: string
  /** 1-based court number */
  field: number
  fieldName: string
  /** [[a, b], [c, d]] — team A and team B */
  teams: [[string, string], [string, string]]
  playerIds: string[]
  score: [number, number]
  /** ids of players who tapped "klaar" */
  finishedBy: string[]
  status: MatchStatus
  startedAt: number
  endedAt: number | null
}

export interface Connection {
  /** `${to}__${from}` */
  id: string
  from: string
  to: string
  roundId: string | null
  createdAt: number
}

/** Counts how often two players already shared a court — drives novelty. */
export interface PairHistory {
  /** `${min}__${max}` */
  id: string
  together: number
  /** times they were in the same *team* */
  partnered: number
}

export interface PublicSnapshot {
  event: EventState
  players: PlayerProfile[]
  round: Round | null
  matches: Match[]
}

/** Shape stored client-side after login. */
export interface Session {
  playerId: string
  name: string
  token: string
}
