import type {
  Connection, EventState, Match, PairHistory, PlayerContact, PlayerProfile, Round,
} from '#shared/types'
import { defaultEventState } from '#shared/logic/defaults'

/**
 * Demo mode. The whole event lives in localStorage and syncs across tabs on
 * the same device through a BroadcastChannel, so you can open the player app
 * and the management dashboard side by side without any backend at all.
 */

export const DEMO_KEY = 'padelconnect.demo.v1'
const CHANNEL = 'padelconnect.demo'

export interface DemoData {
  event: EventState
  players: Record<string, PlayerProfile>
  contacts: Record<string, PlayerContact>
  pins: Record<string, string>
  rounds: Record<string, Round>
  matches: Record<string, Match>
  connections: Record<string, Connection>
  history: Record<string, PairHistory>
}

export function emptyData(): DemoData {
  return {
    event: defaultEventState(),
    players: {},
    contacts: {},
    pins: {},
    rounds: {},
    matches: {},
    connections: {},
    history: {},
  }
}

type Listener = (data: DemoData) => void

class DemoDatabase {
  private data: DemoData = emptyData()
  private listeners = new Set<Listener>()
  private channel: BroadcastChannel | null = null
  private loaded = false

  load(): DemoData {
    if (this.loaded) return this.data
    this.loaded = true
    try {
      const raw = localStorage.getItem(DEMO_KEY)
      if (raw) this.data = { ...emptyData(), ...JSON.parse(raw) as DemoData }
    }
    catch {
      this.data = emptyData()
    }
    if (typeof BroadcastChannel !== 'undefined' && !this.channel) {
      this.channel = new BroadcastChannel(CHANNEL)
      this.channel.onmessage = () => {
        this.data = this.read()
        this.emit()
      }
    }
    window.addEventListener('storage', (e) => {
      if (e.key === DEMO_KEY) {
        this.data = this.read()
        this.emit()
      }
    })
    return this.data
  }

  private read(): DemoData {
    try {
      const raw = localStorage.getItem(DEMO_KEY)
      return raw ? { ...emptyData(), ...JSON.parse(raw) as DemoData } : emptyData()
    }
    catch {
      return emptyData()
    }
  }

  snapshot(): DemoData {
    return this.load()
  }

  /** Reads fresh from storage first so parallel tabs never clobber each other. */
  mutate(fn: (data: DemoData) => void): DemoData {
    this.load()
    const next = this.read()
    fn(next)
    this.data = next
    try {
      localStorage.setItem(DEMO_KEY, JSON.stringify(next))
    }
    catch (error) {
      console.warn('[padel-connect] demo opslag vol', error)
    }
    this.channel?.postMessage('changed')
    this.emit()
    return next
  }

  replace(data: DemoData) {
    this.mutate((draft) => {
      Object.assign(draft, data)
    })
  }

  subscribe(listener: Listener): () => void {
    this.load()
    this.listeners.add(listener)
    listener(this.data)
    return () => this.listeners.delete(listener)
  }

  private emit() {
    for (const listener of this.listeners) listener(this.data)
  }
}

let instance: DemoDatabase | null = null

export function demoDb(): DemoDatabase {
  if (!instance) instance = new DemoDatabase()
  return instance
}
