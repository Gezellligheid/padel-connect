import { defineStore } from 'pinia'
import type { Connection, EventState, Match, PlayerProfile, Round } from '#shared/types'
import { defaultEventState } from '#shared/logic/defaults'
import type { RegistrationInput } from '#shared/logic/validation'
import { BackendError } from '~/lib/backend'

export type Phase =
  | 'loading'
  | 'anonymous'
  /** event hasn't been started by the crew yet */
  | 'idle'
  /** event live, no round running */
  | 'waiting'
  /** round running, you're on a court */
  | 'playing'
  /** your court is done, the round isn't */
  | 'match-done'
  /** connect window */
  | 'connecting'
  /** round running, you're resting */
  | 'bench'
  | 'ended'

export const usePadelStore = defineStore('padel', () => {
  const backend = useBackendClient('player')
  const toast = useToast()

  const event = ref<EventState>(defaultEventState())
  const players = ref<PlayerProfile[]>([])
  const round = ref<Round | null>(null)
  const matches = ref<Match[]>([])
  const connections = ref<Connection[]>([])
  const contacts = ref<Record<string, string>>({})

  const playerId = ref<string | null>(null)
  const ready = ref(false)
  const connectionError = ref<string | null>(null)

  let stop: (() => void) | null = null

  const byId = computed(() => new Map(players.value.map(p => [p.id, p])))
  const me = computed(() => (playerId.value ? byId.value.get(playerId.value) ?? null : null))

  const myMatch = computed(() =>
    playerId.value ? matches.value.find(m => m.playerIds.includes(playerId.value!)) ?? null : null)

  const myTeamIndex = computed(() => {
    if (!myMatch.value || !playerId.value) return -1
    return myMatch.value.teams.findIndex(team => team.includes(playerId.value!))
  })

  const myPartner = computed(() => {
    if (!myMatch.value || myTeamIndex.value < 0) return null
    const team = myMatch.value.teams[myTeamIndex.value]!
    const id = team.find(p => p !== playerId.value)
    return id ? byId.value.get(id) ?? null : null
  })

  const myOpponents = computed(() => {
    if (!myMatch.value || myTeamIndex.value < 0) return []
    const team = myMatch.value.teams[myTeamIndex.value === 0 ? 1 : 0]!
    return team.map(id => byId.value.get(id)).filter(Boolean) as PlayerProfile[]
  })

  const myCourtMates = computed(() => {
    if (!myMatch.value) return []
    return myMatch.value.playerIds
      .filter(id => id !== playerId.value)
      .map(id => byId.value.get(id))
      .filter(Boolean) as PlayerProfile[]
  })

  const onBench = computed(() =>
    Boolean(playerId.value && round.value?.benchIds.includes(playerId.value)))

  const friendIds = computed(() =>
    new Set(connections.value.filter(c => c.from === playerId.value).map(c => c.to)))

  const admirerIds = computed(() =>
    new Set(connections.value.filter(c => c.to === playerId.value).map(c => c.from)))

  const friends = computed(() =>
    connections.value
      .filter(c => c.from === playerId.value)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(c => ({
        connection: c,
        player: byId.value.get(c.to) ?? null,
        phone: contacts.value[c.to] ?? null,
        mutual: admirerIds.value.has(c.to),
      }))
      .filter(f => f.player))

  const phase = computed<Phase>(() => {
    if (!ready.value) return 'loading'
    if (!playerId.value || !me.value) return 'anonymous'
    if (event.value.status === 'ended') return 'ended'
    if (event.value.status === 'idle') return 'idle'
    if (!round.value || round.value.status === 'done') return 'waiting'
    if (round.value.status === 'connecting') return 'connecting'
    if (onBench.value) return 'bench'
    if (!myMatch.value) return 'waiting'
    return myMatch.value.status === 'finished' ? 'match-done' : 'playing'
  })

  /** Everyone still on court when your own match is already done. */
  const stillPlaying = computed(() => matches.value.filter(m => m.status === 'playing').length)

  function start() {
    if (stop || !import.meta.client) return
    playerId.value = backend.userId()
    stop = backend.subscribe({
      event: value => (event.value = value),
      players: value => (players.value = value),
      round: value => (round.value = value),
      matches: value => (matches.value = value),
      connections: (value) => {
        connections.value = value
        void refreshContacts()
      },
      error: (error) => {
        connectionError.value = error.message
        console.error('[padel-connect]', error)
      },
    })
    // The Firebase driver resolves its auth state asynchronously.
    const poll = setInterval(() => {
      const uid = backend.userId()
      if (uid !== playerId.value) {
        playerId.value = uid
        void refreshContacts()
      }
      if (uid !== null || Date.now() - began > 2500) {
        ready.value = true
        if (uid !== null) clearInterval(poll)
      }
    }, 120)
    const began = Date.now()
    setTimeout(() => { ready.value = true }, 2600)
  }

  function dispose() {
    stop?.()
    stop = null
  }

  /** The subscription is bound to whoever was signed in when it opened, so it
   *  has to be rebuilt the moment that changes — otherwise a freshly logged-in
   *  player sees an empty event until they reload. */
  function restart() {
    dispose()
    start()
  }

  async function refreshContacts() {
    if (!playerId.value) {
      contacts.value = {}
      return
    }
    try {
      contacts.value = await backend.call<Record<string, string>>('player.contacts')
    }
    catch {
      /* not signed in yet, or offline — the list simply shows no numbers */
    }
  }

  /* ── auth ─────────────────────────────────────────────────────────────── */

  async function authenticate(endpoint: 'login' | 'register', body: unknown) {
    if (backend.mode === 'demo') {
      const data = await backend.call<{ playerId: string }>(
        endpoint === 'login' ? 'auth.login' : 'auth.register',
        endpoint === 'login' ? body as Record<string, unknown> : body as Record<string, unknown>,
      )
      await backend.adopt({ playerId: data.playerId })
      playerId.value = data.playerId
      restart()
      await refreshContacts()
      return data.playerId
    }

    const response = await $fetch<{ ok: boolean, data?: { playerId: string, token: string }, code?: string, message?: string }>(
      `/api/auth/${endpoint}`,
      { method: 'POST', body: body as Record<string, unknown>, ignoreResponseError: true },
    )
    if (!response.ok || !response.data) {
      throw new BackendError(response.code ?? 'failed', response.message ?? 'Aanmelden mislukte.')
    }
    await backend.adopt(response.data)
    playerId.value = response.data.playerId
    restart()
    await refreshContacts()
    return response.data.playerId
  }

  const login = (pin: string) => authenticate('login', { pin })
  const register = (input: RegistrationInput) => authenticate('register', input)

  async function logout() {
    await backend.signOut()
    playerId.value = null
    contacts.value = {}
    connections.value = []
    restart()
    await navigateTo('/')
  }

  /* ── player actions ───────────────────────────────────────────────────── */

  async function run<T>(fn: () => Promise<T>, success?: string): Promise<T | null> {
    try {
      const result = await fn()
      if (success) toast.success(success)
      return result
    }
    catch (error) {
      toast.error(error instanceof BackendError ? error.message : 'Er ging iets mis.')
      return null
    }
  }

  const setScore = (score: [number, number]) =>
    myMatch.value
      ? backend.call('match.score', { matchId: myMatch.value.id, score }).catch(() => {})
      : Promise.resolve()

  const setFinished = (finished: boolean) =>
    run(() => backend.call('match.finish', { matchId: myMatch.value!.id, finished }))

  const connect = (targetId: string) =>
    run(() => backend.call('player.connect', { targetId }))

  const disconnect = (targetId: string) =>
    run(() => backend.call('player.disconnect', { targetId }), 'Connectie verwijderd.')

  const updateProfile = (patch: Record<string, unknown>) =>
    run(() => backend.call('player.updateProfile', { patch }), 'Profiel bijgewerkt.')

  return {
    // state
    event, players, round, matches, connections, contacts, playerId, ready, connectionError,
    // derived
    byId, me, myMatch, myTeamIndex, myPartner, myOpponents, myCourtMates,
    onBench, friends, friendIds, admirerIds, phase, stillPlaying,
    // lifecycle
    start, dispose, restart, refreshContacts,
    // actions
    login, register, logout, setScore, setFinished, connect, disconnect, updateProfile,
    backendMode: backend.mode,
  }
})
