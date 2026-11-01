import type {
  Connection, EventState, Match, PairHistory, PlayerContact, PlayerProfile, Round,
} from '#shared/types'
import type { Store } from '#shared/logic/store'
import { demoDb } from './db'

/** `Store` implementation backed by the on-device demo database. */
export function createDemoStore(): Store {
  const db = demoDb()
  const data = () => db.snapshot()

  return {
    now: () => Date.now(),

    async getEvent() {
      return data().event
    },
    async setEvent(event: EventState) {
      db.mutate((d) => { d.event = event })
    },

    async getPlayer(id) {
      return data().players[id] ?? null
    },
    async listPlayers() {
      return Object.values(data().players).sort((a, b) => a.createdAt - b.createdAt)
    },
    async setPlayer(player: PlayerProfile) {
      db.mutate((d) => { d.players[player.id] = player })
    },
    async setPlayers(players: PlayerProfile[]) {
      db.mutate((d) => { for (const p of players) d.players[p.id] = p })
    },
    async deletePlayer(id) {
      db.mutate((d) => {
        delete d.players[id]
        delete d.contacts[id]
        for (const [pin, owner] of Object.entries(d.pins)) if (owner === id) delete d.pins[pin]
      })
    },

    async getContact(id) {
      return data().contacts[id] ?? null
    },
    async setContact(id, contact: PlayerContact) {
      db.mutate((d) => { d.contacts[id] = contact })
    },

    async findPlayerIdByPin(pin) {
      return data().pins[pin] ?? null
    },
    async getPinOf(playerId) {
      return Object.entries(data().pins).find(([, id]) => id === playerId)?.[0] ?? null
    },
    async setPin(pin, playerId) {
      db.mutate((d) => { d.pins[pin] = playerId })
    },
    async deletePin(pin) {
      db.mutate((d) => { delete d.pins[pin] })
    },

    async getRound(id) {
      return data().rounds[id] ?? null
    },
    async listRounds() {
      return Object.values(data().rounds).sort((a, b) => a.index - b.index)
    },
    async setRound(round: Round) {
      db.mutate((d) => { d.rounds[round.id] = round })
    },

    async getMatch(roundId, matchId) {
      const match = data().matches[matchId]
      return match && match.roundId === roundId ? match : null
    },
    async listMatches(roundId) {
      return Object.values(data().matches)
        .filter(m => m.roundId === roundId)
        .sort((a, b) => a.field - b.field)
    },
    async setMatch(match: Match) {
      db.mutate((d) => { d.matches[match.id] = match })
    },
    async setMatches(matches: Match[]) {
      db.mutate((d) => { for (const m of matches) d.matches[m.id] = m })
    },

    async listConnections() {
      return Object.values(data().connections)
    },
    async setConnection(connection: Connection) {
      db.mutate((d) => { d.connections[connection.id] = connection })
    },
    async deleteConnection(id) {
      db.mutate((d) => { delete d.connections[id] })
    },

    async getHistory() {
      return new Map(Object.entries(data().history))
    },
    async setHistory(entries: PairHistory[]) {
      db.mutate((d) => { for (const e of entries) d.history[e.id] = e })
    },

    async resetEventData() {
      db.mutate((d) => {
        d.rounds = {}
        d.matches = {}
        d.connections = {}
        d.history = {}
        for (const player of Object.values(d.players)) {
          d.players[player.id] = { ...player, roundsPlayed: 0, roundsBenched: 0, lastRoundId: null }
        }
      })
    },
  }
}
