import type { Connection, EventState, Match, PlayerProfile, Round } from '#shared/types'
import type { ActionName } from '#shared/logic/dispatch'

export type BackendMode = 'demo' | 'firebase'
export type Scope = 'player' | 'admin'

export interface SubscriptionHandlers {
  event?: (event: EventState) => void
  players?: (players: PlayerProfile[]) => void
  round?: (round: Round | null) => void
  rounds?: (rounds: Round[]) => void
  matches?: (matches: Match[]) => void
  connections?: (connections: Connection[]) => void
  error?: (error: Error) => void
}

export interface Backend {
  readonly mode: BackendMode
  readonly scope: Scope
  /** uid of whoever is signed in on this scope */
  userId(): string | null
  call: <T = unknown>(action: ActionName, payload?: Record<string, unknown>) => Promise<T>
  /** Hands over the credential returned by `auth.login` / `auth.register`. */
  adopt: (session: { playerId: string, token?: string | null, admin?: boolean }) => Promise<void>
  signOut: () => Promise<void>
  subscribe: (handlers: SubscriptionHandlers) => () => void
}

export class BackendError extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message)
    this.name = 'BackendError'
  }
}
