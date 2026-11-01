import { type ActionName, dispatch } from '#shared/logic/dispatch'
import { ActionError } from '#shared/logic/store'
import { readContext } from '../utils/auth'
import { createFirestoreStore } from '../utils/firestore-store'

/** Single entry point for every mutation and privileged read. */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ action: ActionName, payload?: Record<string, unknown> }>(event)
  if (!body?.action) {
    throw createError({ statusCode: 400, data: { ok: false, code: 'bad_request', message: 'Geen actie opgegeven.' } })
  }
  if (body.action === 'auth.register' || body.action === 'auth.login') {
    throw createError({
      statusCode: 400,
      data: { ok: false, code: 'bad_request', message: 'Gebruik /api/auth/* voor aanmelden.' },
    })
  }

  const ctx = await readContext(event)
  const store = createFirestoreStore()

  try {
    const data = await dispatch(store, body.action, body.payload ?? {}, ctx)
    return { ok: true, data: data ?? null }
  }
  catch (error) {
    if (error instanceof ActionError) {
      setResponseStatus(event, error.status)
      return { ok: false, code: error.code, message: error.message }
    }
    console.error('[padel-connect] action failed', body.action, error)
    setResponseStatus(event, 500)
    return { ok: false, code: 'server_error', message: 'Er ging iets mis op de server.' }
  }
})
