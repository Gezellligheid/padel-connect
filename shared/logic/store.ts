import type {
  Connection, EventState, Match, PairHistory, PlayerContact, PlayerProfile, Round,
} from '../types'

/**
 * Every mutation in the app is written once, against this interface.
 * Two drivers implement it: `server/utils/firestore-store.ts` (Firestore via
 * firebase-admin) and `app/lib/demo/store.ts` (localStorage, for demo mode).
 */
export interface Store {
  now(): number

  getEvent(): Promise<EventState>
  setEvent(event: EventState): Promise<void>

  getPlayer(id: string): Promise<PlayerProfile | null>
  listPlayers(): Promise<PlayerProfile[]>
  setPlayer(player: PlayerProfile): Promise<void>
  setPlayers(players: PlayerProfile[]): Promise<void>
  deletePlayer(id: string): Promise<void>

  getContact(id: string): Promise<PlayerContact | null>
  setContact(id: string, contact: PlayerContact): Promise<void>

  /** pin → playerId. Lives in a server-only collection. */
  findPlayerIdByPin(pin: string): Promise<string | null>
  getPinOf(playerId: string): Promise<string | null>
  setPin(pin: string, playerId: string): Promise<void>
  deletePin(pin: string): Promise<void>

  getRound(id: string): Promise<Round | null>
  listRounds(): Promise<Round[]>
  setRound(round: Round): Promise<void>

  getMatch(roundId: string, matchId: string): Promise<Match | null>
  listMatches(roundId: string): Promise<Match[]>
  setMatch(match: Match): Promise<void>
  setMatches(matches: Match[]): Promise<void>

  listConnections(): Promise<Connection[]>
  setConnection(connection: Connection): Promise<void>
  deleteConnection(id: string): Promise<void>

  getHistory(): Promise<Map<string, PairHistory>>
  setHistory(entries: PairHistory[]): Promise<void>

  /** Wipes rounds, matches, connections and per-player counters. */
  resetEventData(): Promise<void>
}

export class ActionError extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message)
    this.name = 'ActionError'
  }
}
