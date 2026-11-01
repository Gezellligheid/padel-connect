import type {
  Connection, EventSettings, EventState, Match, PairHistory, PlayerProfile, Round,
} from '../types'
import { normaliseSettings } from './defaults'
import { connectionId, randomId } from './ids'
import { drawRound, pairKey } from './matchmaking'
import { ActionError, type Store } from './store'
import {
  type RegistrationInput, isValidPin, normalisePhone, toProfile, validateRegistration,
} from './validation'

/* ────────────────────────────────── accounts ───────────────────────────── */

export async function register(store: Store, input: RegistrationInput): Promise<{ playerId: string }> {
  const check = validateRegistration(input)
  if (!check.ok) throw new ActionError(`invalid_${check.field}`, check.message)

  const event = await store.getEvent()
  if (!event.settings.registrationOpen) {
    throw new ActionError('registration_closed', 'De inschrijvingen zijn gesloten. Spreek iemand van de crew aan.')
  }
  if (await store.findPlayerIdByPin(input.pin)) {
    throw new ActionError('pin_taken', 'Die pincode is al in gebruik. Kies een andere.')
  }

  const players = await store.listPlayers()
  const name = input.name.trim()
  if (players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
    // Not fatal — two Jans may show up — but we keep them distinguishable.
    throw new ActionError('name_taken', `Er is al een ${name}. Zet er de eerste letter van je achternaam bij.`)
  }

  const id = randomId()
  const profile = toProfile(id, input, store.now())
  await store.setPlayer(profile)
  await store.setContact(id, { phone: normalisePhone(input.phone), consentAt: store.now() })
  await store.setPin(input.pin, id)
  return { playerId: id }
}

export async function login(store: Store, pin: string): Promise<{ playerId: string }> {
  if (!isValidPin(pin)) throw new ActionError('invalid_pin', 'Een pincode bestaat uit 4 cijfers.')
  const playerId = await store.findPlayerIdByPin(pin)
  if (!playerId) throw new ActionError('unknown_pin', 'Geen speler gevonden met die pincode.', 401)
  const player = await store.getPlayer(playerId)
  if (!player) throw new ActionError('unknown_pin', 'Geen speler gevonden met die pincode.', 401)
  return { playerId }
}

export type ProfilePatch = Partial<Pick<PlayerProfile,
  'name' | 'age' | 'photo' | 'hobbies' | 'bio' | 'level' | 'hoursPerWeek' | 'availability'
>> & { phone?: string, pin?: string }

export async function updateProfile(store: Store, playerId: string, patch: ProfilePatch): Promise<void> {
  const player = await requirePlayer(store, playerId)
  const next: PlayerProfile = {
    ...player,
    name: patch.name?.trim().slice(0, 32) || player.name,
    age: patch.age === undefined ? player.age : patch.age,
    photo: patch.photo === undefined ? player.photo : patch.photo,
    hobbies: patch.hobbies?.slice(0, 12) ?? player.hobbies,
    bio: patch.bio === undefined ? player.bio : patch.bio.slice(0, 160),
    level: patch.level ?? player.level,
    hoursPerWeek: patch.hoursPerWeek ?? player.hoursPerWeek,
    availability: patch.availability?.length ? patch.availability : player.availability,
  }
  if (next.photo && next.photo.length > 400_000) {
    throw new ActionError('photo_too_large', 'Die foto is te zwaar.')
  }
  await store.setPlayer(next)

  if (patch.phone) {
    const contact = await store.getContact(playerId)
    await store.setContact(playerId, {
      phone: normalisePhone(patch.phone),
      consentAt: contact?.consentAt ?? store.now(),
    })
  }
  if (patch.pin) {
    if (!isValidPin(patch.pin)) throw new ActionError('invalid_pin', 'Een pincode bestaat uit 4 cijfers.')
    const owner = await store.findPlayerIdByPin(patch.pin)
    if (owner && owner !== playerId) throw new ActionError('pin_taken', 'Die pincode is al in gebruik.')
    const current = await store.getPinOf(playerId)
    if (current && current !== patch.pin) await store.deletePin(current)
    await store.setPin(patch.pin, playerId)
  }
}

/* ─────────────────────────────── connections ───────────────────────────── */

export async function connect(store: Store, from: string, to: string): Promise<Connection> {
  if (from === to) throw new ActionError('self_connect', 'Jezelf toevoegen gaat niet.')
  await requirePlayer(store, from)
  await requirePlayer(store, to)

  const history = await store.getHistory()
  if (!(history.get(pairKey(from, to))?.together)) {
    throw new ActionError('never_played', 'Je kan enkel connecteren met mensen waarmee je gespeeld hebt.', 403)
  }

  const event = await store.getEvent()
  const connection: Connection = {
    id: connectionId(to, from),
    from,
    to,
    roundId: event.currentRoundId,
    createdAt: store.now(),
  }
  await store.setConnection(connection)
  return connection
}

export async function disconnect(store: Store, from: string, to: string): Promise<void> {
  await store.deleteConnection(connectionId(to, from))
}

/* ────────────────────────────────── matches ────────────────────────────── */

export async function setScore(
  store: Store, playerId: string, matchId: string, score: [number, number],
): Promise<Match> {
  const { match } = await requireActiveMatch(store, playerId, matchId)
  const next = { ...match, score: [bounded(score[0]), bounded(score[1])] as [number, number] }
  await store.setMatch(next)
  return next
}

/** A player taps "klaar". When all four agree, the match closes itself. */
export async function toggleFinished(
  store: Store, playerId: string, matchId: string, finished: boolean,
): Promise<{ match: Match, roundClosed: boolean }> {
  const { match, round } = await requireActiveMatch(store, playerId, matchId)

  const finishedBy = new Set(match.finishedBy)
  if (finished) finishedBy.add(playerId)
  else finishedBy.delete(playerId)

  const everyone = match.playerIds.every(id => finishedBy.has(id))
  const next: Match = {
    ...match,
    finishedBy: match.playerIds.filter(id => finishedBy.has(id)),
    status: everyone ? 'finished' : 'playing',
    endedAt: everyone ? store.now() : null,
  }
  await store.setMatch(next)

  let roundClosed = false
  if (everyone && round.status === 'playing') {
    const matches = await store.listMatches(round.id)
    if (matches.every(m => m.status === 'finished')) {
      await store.setRound({ ...round, status: 'connecting' })
      roundClosed = true
    }
  }
  return { match: next, roundClosed }
}

/* ─────────────────────────────── event control ─────────────────────────── */

export async function startEvent(store: Store): Promise<EventState> {
  const event = await store.getEvent()
  if (event.status === 'live') return event
  const next: EventState = {
    ...event,
    status: 'live',
    startedAt: event.startedAt ?? store.now(),
    endedAt: null,
    updatedAt: store.now(),
  }
  await store.setEvent(next)
  return next
}

export async function endEvent(store: Store): Promise<EventState> {
  const event = await store.getEvent()
  if (event.currentRoundId) {
    const round = await store.getRound(event.currentRoundId)
    if (round && round.status !== 'done') {
      await store.setRound({ ...round, status: 'done', endedAt: store.now() })
    }
  }
  const next: EventState = { ...event, status: 'ended', endedAt: store.now(), updatedAt: store.now() }
  await store.setEvent(next)
  return next
}

export async function reopenEvent(store: Store): Promise<EventState> {
  const event = await store.getEvent()
  const next: EventState = { ...event, status: 'live', endedAt: null, updatedAt: store.now() }
  await store.setEvent(next)
  return next
}

export async function updateSettings(store: Store, patch: Partial<EventSettings>): Promise<EventState> {
  const event = await store.getEvent()
  const next: EventState = {
    ...event,
    settings: normaliseSettings(patch, event.settings),
    updatedAt: store.now(),
  }
  await store.setEvent(next)
  return next
}

export async function setPresence(store: Store, playerId: string, present: boolean): Promise<void> {
  const player = await requirePlayer(store, playerId)
  await store.setPlayer({ ...player, present })
}

export async function removePlayer(store: Store, playerId: string): Promise<void> {
  const pin = await store.getPinOf(playerId)
  if (pin) await store.deletePin(pin)
  const connections = await store.listConnections()
  for (const c of connections) {
    if (c.from === playerId || c.to === playerId) await store.deleteConnection(c.id)
  }
  await store.deletePlayer(playerId)
}

/* ───────────────────────────────── rounds ──────────────────────────────── */

export async function startRound(store: Store, seed?: number): Promise<{ round: Round, matches: Match[] }> {
  const event = await store.getEvent()
  if (event.status !== 'live') {
    throw new ActionError('event_not_live', 'Start eerst het event voor je een ronde opstart.')
  }
  if (event.currentRoundId) {
    const current = await store.getRound(event.currentRoundId)
    if (current && current.status === 'playing') {
      throw new ActionError('round_in_progress', 'Er loopt nog een ronde. Sluit die eerst af.')
    }
    if (current && current.status === 'connecting') {
      await store.setRound({ ...current, status: 'done', endedAt: store.now() })
    }
  }

  const players = await store.listPlayers()
  const candidates = players.filter(p => p.present)
  if (candidates.length < 4) {
    throw new ActionError('not_enough_players', 'Je hebt minstens 4 aanwezige spelers nodig.')
  }

  const roundId = randomId(8)
  const history = await store.getHistory()
  const draw = drawRound({
    roundId,
    candidates,
    fieldCount: event.settings.fieldCount,
    fieldNames: event.settings.fieldNames,
    history,
    seed,
    now: store.now(),
  })

  const matches: Match[] = draw.matches.map(m => ({ ...m, id: `${roundId}-v${m.field}` }))
  await store.setMatches(matches)

  const round: Round = {
    id: roundId,
    index: event.roundCount + 1,
    status: 'playing',
    startedAt: store.now(),
    endedAt: null,
    benchIds: draw.benchIds,
    matchIds: matches.map(m => m.id),
  }
  await store.setRound(round)

  // Bookkeeping: counters plus pair history, so the next draw knows who met whom.
  const playing = new Set(draw.playingIds)
  await store.setPlayers(players.map((p) => {
    if (!p.present) return p
    return playing.has(p.id)
      ? { ...p, roundsPlayed: p.roundsPlayed + 1, roundsBenched: 0, lastRoundId: roundId }
      : { ...p, roundsBenched: p.roundsBenched + 1 }
  }))

  const updates = new Map<string, PairHistory>()
  const bump = (a: string, b: string, partnered: boolean) => {
    const key = pairKey(a, b)
    const base = updates.get(key) ?? history.get(key) ?? { id: key, together: 0, partnered: 0 }
    updates.set(key, {
      id: key,
      together: base.together + 1,
      partnered: base.partnered + (partnered ? 1 : 0),
    })
  }
  for (const match of matches) {
    const ids = match.playerIds
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const sameTeam = match.teams.some(t => t.includes(ids[i]!) && t.includes(ids[j]!))
        bump(ids[i]!, ids[j]!, sameTeam)
      }
    }
  }
  await store.setHistory([...updates.values()])

  await store.setEvent({
    ...event,
    currentRoundId: roundId,
    roundCount: event.roundCount + 1,
    updatedAt: store.now(),
  })

  return { round, matches }
}

/** Force-closes a round: unfinished matches are marked finished as-is. */
export async function endRound(store: Store, roundId?: string): Promise<Round> {
  const event = await store.getEvent()
  const id = roundId ?? event.currentRoundId
  if (!id) throw new ActionError('no_round', 'Er loopt geen ronde.')
  const round = await store.getRound(id)
  if (!round) throw new ActionError('no_round', 'Ronde niet gevonden.')

  const matches = await store.listMatches(id)
  const open = matches.filter(m => m.status !== 'finished')
  if (open.length) {
    await store.setMatches(open.map(m => ({ ...m, status: 'finished' as const, endedAt: store.now() })))
  }
  const next: Round = { ...round, status: 'connecting' }
  await store.setRound(next)
  return next
}

/** Closes the connect window and makes room for the next draw. */
export async function closeRound(store: Store, roundId?: string): Promise<Round> {
  const event = await store.getEvent()
  const id = roundId ?? event.currentRoundId
  if (!id) throw new ActionError('no_round', 'Er loopt geen ronde.')
  const round = await store.getRound(id)
  if (!round) throw new ActionError('no_round', 'Ronde niet gevonden.')
  const next: Round = { ...round, status: 'done', endedAt: round.endedAt ?? store.now() }
  await store.setRound(next)
  return next
}

/** Swap someone who did not turn up for someone on the bench. */
export async function substitute(
  store: Store, matchId: string, outId: string, inId: string,
): Promise<Match> {
  const event = await store.getEvent()
  if (!event.currentRoundId) throw new ActionError('no_round', 'Er loopt geen ronde.')
  const round = await store.getRound(event.currentRoundId)
  if (!round) throw new ActionError('no_round', 'Ronde niet gevonden.')
  const match = await store.getMatch(round.id, matchId)
  if (!match) throw new ActionError('no_match', 'Match niet gevonden.')
  if (!match.playerIds.includes(outId)) throw new ActionError('not_in_match', 'Die speler staat niet op dat veld.')
  if (match.playerIds.includes(inId)) throw new ActionError('already_in_match', 'Die speler staat al op dat veld.')
  await requirePlayer(store, inId)

  const swap = (id: string) => (id === outId ? inId : id)
  const next: Match = {
    ...match,
    teams: match.teams.map(t => t.map(swap)) as Match['teams'],
    playerIds: match.playerIds.map(swap),
    finishedBy: match.finishedBy.filter(id => id !== outId),
  }
  await store.setMatch(next)
  await store.setRound({
    ...round,
    benchIds: [...round.benchIds.filter(id => id !== inId), outId],
  })
  return next
}

export async function resetEvent(store: Store): Promise<EventState> {
  await store.resetEventData()
  const event = await store.getEvent()
  const next: EventState = {
    ...event,
    status: 'idle',
    currentRoundId: null,
    roundCount: 0,
    startedAt: null,
    endedAt: null,
    updatedAt: store.now(),
  }
  await store.setEvent(next)
  return next
}

/* ────────────────────────────────── helpers ────────────────────────────── */

function bounded(n: number): number {
  return Math.max(0, Math.min(99, Math.round(Number(n) || 0)))
}

async function requirePlayer(store: Store, id: string): Promise<PlayerProfile> {
  const player = await store.getPlayer(id)
  if (!player) throw new ActionError('unknown_player', 'Speler niet gevonden.', 404)
  return player
}

async function requireActiveMatch(store: Store, playerId: string, matchId: string) {
  const event = await store.getEvent()
  if (!event.currentRoundId) throw new ActionError('no_round', 'Er loopt geen ronde.')
  const round = await store.getRound(event.currentRoundId)
  if (!round) throw new ActionError('no_round', 'Ronde niet gevonden.')
  const match = await store.getMatch(round.id, matchId)
  if (!match) throw new ActionError('no_match', 'Match niet gevonden.')
  if (!match.playerIds.includes(playerId)) throw new ActionError('not_in_match', 'Je speelt niet op dit veld.', 403)
  if (round.status === 'done') throw new ActionError('round_closed', 'Deze ronde is al afgesloten.')
  return { match, round, event }
}
