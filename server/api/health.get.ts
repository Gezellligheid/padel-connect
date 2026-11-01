import { auth, serverConfigured } from '../utils/firebase'

/**
 * Never throws: this endpoint exists so the UI can tell "no service account"
 * apart from "the Admin SDK blew up", and a 500 here would make both look the
 * same. Touching `auth()` forces credential parsing and module loading, which
 * is exactly where configuration mistakes surface.
 */
export default defineEventHandler(async () => {
  const configured = serverConfigured()
  if (!configured) {
    return { ok: true, mode: 'demo' as const, adminReady: false, reason: 'no_service_account' }
  }

  try {
    auth()
    return {
      ok: true,
      mode: 'firebase' as const,
      adminReady: true,
      reason: null,
      adminPinSet: Boolean(useRuntimeConfig().adminPin),
    }
  }
  catch (error) {
    console.error('[padel-connect] admin SDK kon niet starten', error)
    return {
      ok: true,
      mode: 'firebase' as const,
      adminReady: false,
      reason: 'admin_sdk_failed',
      detail: error instanceof Error ? error.message.slice(0, 300) : String(error).slice(0, 300),
    }
  }
})
