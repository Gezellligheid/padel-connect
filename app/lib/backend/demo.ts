import type { Connection, Match, Round } from '#shared/types'
import { type ActionContext, type ActionName, dispatch } from '#shared/logic/dispatch'
import { ActionError } from '#shared/logic/store'
import { demoDb } from '../demo/db'
import { createDemoStore } from '../demo/store'
import { type Backend, BackendError, type Scope, type SubscriptionHandlers } from './types'

const SESSION_KEY = 'padelconnect.session'
const ADMIN_KEY = 'padelconnect.admin'

/**
 * Demo backend: the exact same action router the server runs, executed in the
 * browser against localStorage. Lets the whole event be rehearsed on one
 * laptop before a single Firebase key exists.
 */
export function createDemoBackend(scope: Scope): Backend {
  const store = createDemoStore()
  const db = demoDb()

  const readSession = (): string | null => {
    if (!import.meta.client) return null
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')?.playerId ?? null
    }
    catch {
      return null
    }
  }
  const isAdmin = () => import.meta.client && localStorage.getItem(ADMIN_KEY) === '1'

  return {
    mode: 'demo',
    scope,

    userId: () => (scope === 'admin' ? (isAdmin() ? 'crew' : null) : readSession()),

    async call<T>(action: ActionName, payload: Record<string, unknown> = {}): Promise<T> {
      // The demo "login" for the crew is a plain pincode check against config.
      if (action === 'admin.roster' || action.startsWith('admin.')) {
        if (!isAdmin()) throw new BackendError('forbidden', 'Log in op de crew-pagina.', 403)
      }
      const ctx: ActionContext = { playerId: readSession(), isAdmin: isAdmin() }
      try {
        return await dispatch(store, action, payload, ctx) as T
      }
      catch (error) {
        if (error instanceof ActionError) throw new BackendError(error.code, error.message, error.status)
        throw error
      }
    },

    async adopt(session) {
      if (session.admin) {
        localStorage.setItem(ADMIN_KEY, '1')
        return
      }
      localStorage.setItem(SESSION_KEY, JSON.stringify({ playerId: session.playerId }))
    },

    async signOut() {
      if (scope === 'admin') localStorage.removeItem(ADMIN_KEY)
      else localStorage.removeItem(SESSION_KEY)
    },

    subscribe(handlers: SubscriptionHandlers) {
      return db.subscribe((data) => {
        const uid = readSession()
        handlers.event?.(data.event)
        handlers.players?.(Object.values(data.players).sort((a, b) => a.createdAt - b.createdAt))

        const rounds: Round[] = Object.values(data.rounds).sort((a, b) => a.index - b.index)
        handlers.rounds?.(rounds)

        const current = data.event.currentRoundId ? data.rounds[data.event.currentRoundId] ?? null : null
        handlers.round?.(current)

        const matches: Match[] = current
          ? Object.values(data.matches).filter(m => m.roundId === current.id).sort((a, b) => a.field - b.field)
          : []
        handlers.matches?.(matches)

        const all: Connection[] = Object.values(data.connections)
        handlers.connections?.(
          scope === 'admin' ? all : all.filter(c => c.from === uid || c.to === uid),
        )
      })
    },
  }
}

/** Nuxt runs env values through `destr`, so a numeric pincode arrives as a
 *  number — always compare as strings. */
export function demoAdminPinMatches(input: string, configured: unknown): boolean {
  const expected = String(configured ?? '').trim() || '2468'
  return String(input) === expected
}
