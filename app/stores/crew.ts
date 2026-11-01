import { defineStore } from 'pinia'
import type { Connection, EventSettings, EventState, Match, PlayerProfile, Round } from '#shared/types'
import { defaultEventState } from '#shared/logic/defaults'
import type { RosterRow } from '#shared/logic/dispatch'
import { BackendError, demoAdminPinMatches } from '~/lib/backend'

export const useCrewStore = defineStore('crew', () => {
  const backend = useBackendClient('admin')
  const toast = useToast()
  const config = useRuntimeConfig()

  const event = ref<EventState>(defaultEventState())
  const players = ref<PlayerProfile[]>([])
  const round = ref<Round | null>(null)
  const rounds = ref<Round[]>([])
  const matches = ref<Match[]>([])
  const connections = ref<Connection[]>([])
  const roster = ref<RosterRow[]>([])

  const authed = ref(false)
  const ready = ref(false)
  const busy = ref(false)

  let stop: (() => void) | null = null

  const byId = computed(() => new Map(players.value.map(p => [p.id, p])))
  const present = computed(() => players.value.filter(p => p.present))
  const absent = computed(() => players.value.filter(p => !p.present))

  const capacity = computed(() => event.value.settings.fieldCount * 4)
  const seated = computed(() => Math.min(capacity.value, Math.floor(present.value.length / 4) * 4))
  const benchPreview = computed(() => Math.max(0, present.value.length - seated.value))

  const bench = computed(() =>
    (round.value?.benchIds ?? []).map(id => byId.value.get(id)).filter(Boolean) as PlayerProfile[])

  const matchesFinished = computed(() => matches.value.filter(m => m.status === 'finished').length)
  const roundProgress = computed(() =>
    matches.value.length ? matchesFinished.value / matches.value.length : 0)

  /** Who connected with whom, as an adjacency list for the network view. */
  const connectionGraph = computed(() => {
    const map = new Map<string, { out: Set<string>, in: Set<string> }>()
    const touch = (id: string) => {
      if (!map.has(id)) map.set(id, { out: new Set(), in: new Set() })
      return map.get(id)!
    }
    for (const player of players.value) touch(player.id)
    for (const c of connections.value) {
      touch(c.from).out.add(c.to)
      touch(c.to).in.add(c.from)
    }
    return map
  })

  const mutualPairs = computed(() => {
    const seen = new Set<string>()
    const pairs: [string, string][] = []
    for (const c of connections.value) {
      const key = c.from < c.to ? `${c.from}|${c.to}` : `${c.to}|${c.from}`
      if (seen.has(key)) continue
      const reverse = connections.value.some(o => o.from === c.to && o.to === c.from)
      if (reverse) {
        seen.add(key)
        pairs.push([c.from, c.to])
      }
    }
    return pairs
  })

  const leaderboard = computed(() =>
    players.value
      .map((player) => {
        const node = connectionGraph.value.get(player.id)
        const out = node?.out.size ?? 0
        const inc = node?.in.size ?? 0
        const mutual = [...(node?.out ?? [])].filter(id => node?.in.has(id)).length
        return { player, out, in: inc, mutual, score: mutual * 2 + inc }
      })
      .sort((a, b) => b.score - a.score || b.in - a.in))

  const lonely = computed(() =>
    leaderboard.value.filter(row => row.in === 0 && row.player.present).map(row => row.player))

  const stats = computed(() => {
    const totals = players.value.length || 1
    return {
      players: players.value.length,
      present: present.value.length,
      connections: connections.value.length,
      mutual: mutualPairs.value.length,
      averagePerPlayer: Math.round((connections.value.length / totals) * 10) / 10,
      roundsPlayed: event.value.roundCount,
      courtsBusy: matches.value.filter(m => m.status === 'playing').length,
    }
  })

  function start() {
    if (stop || !import.meta.client) return
    authed.value = Boolean(backend.userId())
    stop = backend.subscribe({
      event: value => (event.value = value),
      players: value => (players.value = value),
      round: value => (round.value = value),
      rounds: value => (rounds.value = value),
      matches: value => (matches.value = value),
      connections: value => (connections.value = value),
      error: error => console.error('[padel-connect crew]', error),
    })
    setTimeout(() => {
      authed.value = Boolean(backend.userId())
      ready.value = true
      if (authed.value) void refreshRoster()
    }, 400)
  }

  function dispose() {
    stop?.()
    stop = null
  }

  async function login(pin: string) {
    if (backend.mode === 'demo') {
      if (!demoAdminPinMatches(pin, config.public.demoAdminPin)) {
        throw new BackendError('wrong_pin', 'Verkeerde crew-pincode.')
      }
      await backend.adopt({ playerId: 'crew', admin: true })
      authed.value = true
      dispose()
      start()
      await refreshRoster()
      return
    }
    const response = await $fetch<{ ok: boolean, data?: { token: string }, message?: string }>(
      '/api/admin/login',
      { method: 'POST', body: { pin }, ignoreResponseError: true },
    )
    if (!response.ok || !response.data) throw new BackendError('wrong_pin', response.message ?? 'Inloggen mislukt.')
    await backend.adopt({ playerId: 'crew', token: response.data.token, admin: true })
    authed.value = true
    dispose()
    start()
    await refreshRoster()
  }

  async function logout() {
    await backend.signOut()
    authed.value = false
    roster.value = []
  }

  async function refreshRoster() {
    try {
      roster.value = await backend.call<RosterRow[]>('admin.roster')
    }
    catch {
      /* not authorised (yet) */
    }
  }

  async function run<T>(action: Parameters<typeof backend.call>[0], payload?: Record<string, unknown>, success?: string) {
    busy.value = true
    try {
      const result = await backend.call<T>(action, payload)
      if (success) toast.success(success)
      return result
    }
    catch (error) {
      toast.error(error instanceof BackendError ? error.message : 'Er ging iets mis.')
      return null
    }
    finally {
      busy.value = false
    }
  }

  return {
    event, players, round, rounds, matches, connections, roster, authed, ready, busy,
    byId, present, absent, capacity, seated, benchPreview, bench,
    matchesFinished, roundProgress, connectionGraph, mutualPairs, leaderboard, lonely, stats,

    start, dispose, login, logout, refreshRoster,

    startEvent: () => run('admin.startEvent', {}, 'Het event is gestart. Veel plezier!'),
    endEvent: () => run('admin.endEvent', {}, 'Event afgesloten.'),
    reopenEvent: () => run('admin.reopenEvent', {}, 'Event heropend.'),
    saveSettings: (settings: Partial<EventSettings>) => run('admin.settings', { settings }, 'Instellingen bewaard.'),
    startRound: () => run('admin.startRound', {}, 'Nieuwe ronde geloot!'),
    endRound: () => run('admin.endRound', {}, 'Ronde gestopt — spelers kunnen nu connecteren.'),
    closeRound: () => run('admin.closeRound', {}, 'Ronde afgesloten.'),
    setPresence: async (playerId: string, present: boolean) => {
      await run('admin.presence', { playerId, present })
      await refreshRoster()
    },
    removePlayer: async (playerId: string) => {
      await run('admin.removePlayer', { playerId }, 'Speler verwijderd.')
      await refreshRoster()
    },
    substitute: (matchId: string, outId: string, inId: string) =>
      run('admin.substitute', { matchId, outId, inId }, 'Speler gewisseld.'),
    reset: async () => {
      await run('admin.reset', {}, 'Alles gereset.')
      await refreshRoster()
    },
    backendMode: backend.mode,
  }
})
