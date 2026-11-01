import type {
  Connection, EventState, Match, PairHistory, PlayerContact, PlayerProfile, Round,
} from '#shared/types'
import type { Store } from '#shared/logic/store'
import { defaultEventState } from '#shared/logic/defaults'
import { db } from './firebase'

const EVENT_DOC = ['event', 'state'] as const

/** `Store` implementation on top of Firestore via firebase-admin. */
export function createFirestoreStore(): Store {
  const fs = db()

  const eventRef = () => fs.collection(EVENT_DOC[0]).doc(EVENT_DOC[1])
  const players = () => fs.collection('players')
  const pins = () => fs.collection('pins')
  const rounds = () => fs.collection('rounds')
  const connections = () => fs.collection('connections')
  const pairs = () => fs.collection('pairs')

  return {
    now: () => Date.now(),

    async getEvent() {
      const snap = await eventRef().get()
      if (!snap.exists) {
        const fresh = defaultEventState()
        await eventRef().set(fresh)
        return fresh
      }
      return snap.data() as EventState
    },
    async setEvent(event: EventState) {
      await eventRef().set(event)
    },

    async getPlayer(id) {
      const snap = await players().doc(id).get()
      return snap.exists ? snap.data() as PlayerProfile : null
    },
    async listPlayers() {
      const snap = await players().orderBy('createdAt').get()
      return snap.docs.map(d => d.data() as PlayerProfile)
    },
    async setPlayer(player: PlayerProfile) {
      await players().doc(player.id).set(player)
    },
    async setPlayers(list: PlayerProfile[]) {
      await commitInChunks(list, (batch, player) => batch.set(players().doc(player.id), player))
    },
    async deletePlayer(id) {
      await fs.recursiveDelete(players().doc(id))
    },

    async getContact(id) {
      const snap = await players().doc(id).collection('private').doc('contact').get()
      return snap.exists ? snap.data() as PlayerContact : null
    },
    async setContact(id, contact: PlayerContact) {
      await players().doc(id).collection('private').doc('contact').set(contact)
    },

    async findPlayerIdByPin(pin) {
      const snap = await pins().doc(pin).get()
      return snap.exists ? (snap.data() as { playerId: string }).playerId : null
    },
    async getPinOf(playerId) {
      const snap = await pins().where('playerId', '==', playerId).limit(1).get()
      return snap.empty ? null : snap.docs[0]!.id
    },
    async setPin(pin, playerId) {
      await pins().doc(pin).set({ playerId })
    },
    async deletePin(pin) {
      await pins().doc(pin).delete()
    },

    async getRound(id) {
      const snap = await rounds().doc(id).get()
      return snap.exists ? snap.data() as Round : null
    },
    async listRounds() {
      const snap = await rounds().orderBy('index').get()
      return snap.docs.map(d => d.data() as Round)
    },
    async setRound(round: Round) {
      await rounds().doc(round.id).set(round)
    },

    async getMatch(roundId, matchId) {
      const snap = await rounds().doc(roundId).collection('matches').doc(matchId).get()
      return snap.exists ? snap.data() as Match : null
    },
    async listMatches(roundId) {
      const snap = await rounds().doc(roundId).collection('matches').orderBy('field').get()
      return snap.docs.map(d => d.data() as Match)
    },
    async setMatch(match: Match) {
      await rounds().doc(match.roundId).collection('matches').doc(match.id).set(match)
    },
    async setMatches(list: Match[]) {
      await commitInChunks(list, (batch, match) =>
        batch.set(rounds().doc(match.roundId).collection('matches').doc(match.id), match))
    },

    async listConnections() {
      const snap = await connections().get()
      return snap.docs.map(d => d.data() as Connection)
    },
    async setConnection(connection: Connection) {
      await connections().doc(connection.id).set(connection)
    },
    async deleteConnection(id) {
      await connections().doc(id).delete()
    },

    async getHistory() {
      const snap = await pairs().get()
      return new Map(snap.docs.map(d => [d.id, d.data() as PairHistory]))
    },
    async setHistory(entries: PairHistory[]) {
      await commitInChunks(entries, (batch, entry) => batch.set(pairs().doc(entry.id), entry))
    },

    async resetEventData() {
      for (const ref of [rounds(), connections(), pairs()]) {
        const snap = await ref.get()
        await Promise.all(snap.docs.map(d => fs.recursiveDelete(d.ref)))
      }
      const snap = await players().get()
      await commitInChunks(snap.docs, (batch, d) =>
        batch.update(d.ref, { roundsPlayed: 0, roundsBenched: 0, lastRoundId: null }))
    },
  }

  async function commitInChunks<T>(
    items: T[],
    apply: (batch: FirebaseFirestore.WriteBatch, item: T) => void,
  ) {
    for (let i = 0; i < items.length; i += 400) {
      const batch = fs.batch()
      for (const item of items.slice(i, i + 400)) apply(batch, item)
      await batch.commit()
    }
  }
}
