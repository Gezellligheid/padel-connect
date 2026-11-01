import { createDemoBackend } from './demo'
import { createFirebaseBackend, type FirebaseWebConfig } from './firebase'
import type { Backend, Scope } from './types'

export * from './types'
export { demoAdminPinMatches } from './demo'

const cache = new Map<Scope, Backend>()

export function getBackend(scope: Scope, config: FirebaseWebConfig): Backend {
  const cached = cache.get(scope)
  if (cached) return cached
  const backend = config.apiKey && config.projectId
    ? createFirebaseBackend(scope, config)
    : createDemoBackend(scope)
  cache.set(scope, backend)
  return backend
}

export function isDemoConfig(config: FirebaseWebConfig): boolean {
  return !(config.apiKey && config.projectId)
}
