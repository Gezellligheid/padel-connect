import type { PlayerProfile } from '../types'
import * as actions from './actions'
import { ActionError, type Store } from './store'

export type ActionName =
  | 'auth.register'
  | 'auth.login'
  | 'player.updateProfile'
  | 'player.connect'
  | 'player.disconnect'
  | 'player.contacts'
  | 'player.deleteMe'
  | 'match.score'
  | 'match.finish'
  | 'admin.roster'
  | 'admin.startEvent'
  | 'admin.endEvent'
  | 'admin.reopenEvent'
  | 'admin.settings'
  | 'admin.startRound'
  | 'admin.endRound'
  | 'admin.closeRound'
  | 'admin.presence'
  | 'admin.removePlayer'
  | 'admin.substitute'
  | 'admin.reset'

export interface ActionContext {
  /** uid of the signed-in player, if any */
  playerId: string | null
  isAdmin: boolean
}

export interface RosterRow extends PlayerProfile {
  phone: string | null
  connectionsMade: number
  connectionsReceived: number
}

/** The single router every mutation goes through — API route and demo driver alike. */
export async function dispatch(
  store: Store,
  action: ActionName,
  payload: Record<string, unknown>,
  ctx: ActionContext,
): Promise<unknown> {
  const me = () => {
    if (!ctx.playerId) throw new ActionError('unauthenticated', 'Log eerst in met je pincode.', 401)
    return ctx.playerId
  }
  const admin = () => {
    if (!ctx.isAdmin) throw new ActionError('forbidden', 'Alleen de crew kan dit doen.', 403)
  }
  const str = (key: string): string => {
    const value = payload[key]
    if (typeof value !== 'string' || !value) throw new ActionError('bad_request', `"${key}" ontbreekt.`)
    return value
  }

  switch (action) {
    case 'auth.register':
      return actions.register(store, payload as never)

    case 'auth.login':
      return actions.login(store, str('pin'))

    case 'player.updateProfile':
      return actions.updateProfile(store, me(), (payload.patch ?? {}) as never)

    case 'player.connect':
      return actions.connect(store, me(), str('targetId'))

    case 'player.disconnect':
      return actions.disconnect(store, me(), str('targetId'))

    case 'player.contacts': {
      const uid = me()
      const connections = await store.listConnections()
      const mine = connections.filter(c => c.from === uid)
      const out: Record<string, string> = {}
      for (const connection of mine) {
        const contact = await store.getContact(connection.to)
        if (contact) out[connection.to] = contact.phone
      }
      return out
    }

    case 'player.deleteMe':
      return actions.removePlayer(store, me())

    case 'match.score': {
      const score = payload.score as [number, number]
      if (!Array.isArray(score) || score.length !== 2) throw new ActionError('bad_request', 'Ongeldige score.')
      return actions.setScore(store, me(), str('matchId'), score)
    }

    case 'match.finish':
      return actions.toggleFinished(store, me(), str('matchId'), payload.finished !== false)

    case 'admin.roster': {
      admin()
      const [players, connections] = await Promise.all([store.listPlayers(), store.listConnections()])
      const rows: RosterRow[] = []
      for (const player of players) {
        const contact = await store.getContact(player.id)
        rows.push({
          ...player,
          phone: contact?.phone ?? null,
          connectionsMade: connections.filter(c => c.from === player.id).length,
          connectionsReceived: connections.filter(c => c.to === player.id).length,
        })
      }
      return rows
    }

    case 'admin.startEvent':
      admin()
      return actions.startEvent(store)

    case 'admin.endEvent':
      admin()
      return actions.endEvent(store)

    case 'admin.reopenEvent':
      admin()
      return actions.reopenEvent(store)

    case 'admin.settings':
      admin()
      return actions.updateSettings(store, (payload.settings ?? {}) as never)

    case 'admin.startRound':
      admin()
      return actions.startRound(store, typeof payload.seed === 'number' ? payload.seed : undefined)

    case 'admin.endRound':
      admin()
      return actions.endRound(store)

    case 'admin.closeRound':
      admin()
      return actions.closeRound(store)

    case 'admin.presence':
      admin()
      return actions.setPresence(store, str('playerId'), payload.present !== false)

    case 'admin.removePlayer':
      admin()
      return actions.removePlayer(store, str('playerId'))

    case 'admin.substitute':
      admin()
      return actions.substitute(store, str('matchId'), str('outId'), str('inId'))

    case 'admin.reset':
      admin()
      return actions.resetEvent(store)

    default:
      throw new ActionError('unknown_action', `Onbekende actie: ${action as string}`, 404)
  }
}
