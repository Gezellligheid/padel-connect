import { getBackend, isDemoConfig, type Backend, type Scope } from '~/lib/backend'
import type { FirebaseWebConfig } from '~/lib/backend/firebase'

export function useBackendClient(scope: Scope): Backend {
  const config = useRuntimeConfig().public.firebase as FirebaseWebConfig
  return getBackend(scope, config)
}

export function useBackendMode() {
  const config = useRuntimeConfig().public.firebase as FirebaseWebConfig
  return computed<'demo' | 'firebase'>(() => (isDemoConfig(config) ? 'demo' : 'firebase'))
}
