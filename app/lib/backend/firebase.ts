import { type FirebaseApp, getApps, initializeApp } from 'firebase/app'
import {
  type Auth, type User, getAuth, initializeAuth, browserLocalPersistence,
  onAuthStateChanged, signInWithCustomToken, signOut as fbSignOut,
} from 'firebase/auth'
import {
  type Firestore, collection, doc, getFirestore, onSnapshot, or, query, where,
} from 'firebase/firestore'
import type { Connection, EventState, Match, PlayerProfile, Round } from '#shared/types'
import type { ActionName } from '#shared/logic/dispatch'
import { type Backend, BackendError, type Scope, type SubscriptionHandlers } from './types'

export interface FirebaseWebConfig {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}

/**
 * Player and crew get their own named Firebase app, so an organiser can be
 * logged in as themselves on the player app and as the crew on /manage in the
 * same browser without the two sessions fighting over one auth slot.
 */
function appFor(scope: Scope, config: FirebaseWebConfig): { app: FirebaseApp, auth: Auth, firestore: Firestore } {
  const name = scope === 'admin' ? 'padel-crew' : '[DEFAULT]'
  const existing = getApps().find(a => a.name === name)
  const app = existing ?? initializeApp(config, name === '[DEFAULT]' ? undefined : name)
  let auth: Auth
  try {
    auth = initializeAuth(app, { persistence: browserLocalPersistence })
  }
  catch {
    auth = getAuth(app)
  }
  return { app, auth, firestore: getFirestore(app) }
}

export function createFirebaseBackend(scope: Scope, config: FirebaseWebConfig): Backend {
  const { auth, firestore } = appFor(scope, config)

  let user: User | null = auth.currentUser
  const authReady = new Promise<void>((resolve) => {
    let settled = false
    onAuthStateChanged(auth, (next) => {
      user = next
      if (!settled) {
        settled = true
        resolve()
      }
    })
  })

  async function authHeader(): Promise<Record<string, string>> {
    await authReady
    if (!user) return {}
    return { Authorization: `Bearer ${await user.getIdToken()}` }
  }

  return {
    mode: 'firebase',
    scope,

    userId: () => user?.uid ?? null,

    async call<T>(action: ActionName, payload: Record<string, unknown> = {}): Promise<T> {
      const headers = { 'Content-Type': 'application/json', ...(await authHeader()) }
      const response = await fetch('/api/action', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action, payload }),
      })
      const body = await response.json().catch(() => ({})) as
        { ok?: boolean, data?: T, code?: string, message?: string }
      if (!response.ok || body.ok === false) {
        throw new BackendError(
          body.code ?? 'request_failed',
          body.message ?? 'Er ging iets mis. Probeer het opnieuw.',
          response.status,
        )
      }
      return body.data as T
    },

    async adopt(session) {
      if (!session.token) throw new BackendError('no_token', 'Geen sessietoken ontvangen.')
      const credential = await signInWithCustomToken(auth, session.token)
      user = credential.user
      // Make sure the fresh custom claims (admin) are present on the ID token.
      await user.getIdToken(true)
    },

    async signOut() {
      await fbSignOut(auth)
      user = null
    },

    subscribe(handlers: SubscriptionHandlers) {
      const stops: Array<() => void> = []
      let matchStop: (() => void) | null = null
      let roundStop: (() => void) | null = null
      let watchedRoundId: string | null = null
      const fail = (error: unknown) => handlers.error?.(error as Error)

      authReady.then(() => {
        if (!user) return

        stops.push(onSnapshot(doc(firestore, 'event', 'state'), (snap) => {
          const event = snap.data() as EventState | undefined
          if (!event) return
          handlers.event?.(event)
          attachRound(event.currentRoundId ?? null)
        }, fail))

        stops.push(onSnapshot(collection(firestore, 'players'), (snap) => {
          const players = snap.docs.map(d => d.data() as PlayerProfile)
          players.sort((a, b) => a.createdAt - b.createdAt)
          handlers.players?.(players)
        }, fail))

        if (handlers.rounds) {
          stops.push(onSnapshot(collection(firestore, 'rounds'), (snap) => {
            const rounds = snap.docs.map(d => d.data() as Round).sort((a, b) => a.index - b.index)
            handlers.rounds?.(rounds)
          }, fail))
        }

        if (handlers.connections) {
          const ref = collection(firestore, 'connections')
          const q = scope === 'admin'
            ? query(ref)
            : query(ref, or(where('from', '==', user.uid), where('to', '==', user.uid)))
          stops.push(onSnapshot(q, (snap) => {
            handlers.connections?.(snap.docs.map(d => d.data() as Connection))
          }, fail))
        }
      }).catch(fail)

      function attachRound(roundId: string | null) {
        if (roundId === watchedRoundId) return
        watchedRoundId = roundId
        roundStop?.()
        matchStop?.()
        roundStop = null
        matchStop = null
        if (!roundId) {
          handlers.round?.(null)
          handlers.matches?.([])
          return
        }
        roundStop = onSnapshot(doc(firestore, 'rounds', roundId), (snap) => {
          handlers.round?.((snap.data() as Round | undefined) ?? null)
        }, fail)
        matchStop = onSnapshot(collection(firestore, 'rounds', roundId, 'matches'), (snap) => {
          const matches = snap.docs.map(d => d.data() as Match).sort((a, b) => a.field - b.field)
          handlers.matches?.(matches)
        }, fail)
      }

      return () => {
        for (const stop of stops) stop()
        roundStop?.()
        matchStop?.()
      }
    },
  }
}
