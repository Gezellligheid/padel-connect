import { adminToken, pinEquals, throttle } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  throttle(event, 'admin-login', 8, 5 * 60_000)
  const { pin } = await readBody<{ pin: string }>(event)
  // `destr` turns a numeric NUXT_ADMIN_PIN into a number — normalise first.
  const expected = String(useRuntimeConfig().adminPin ?? '').trim()

  if (!expected) {
    setResponseStatus(event, 503)
    return { ok: false, code: 'no_admin_pin', message: 'Er is nog geen crew-pincode ingesteld (NUXT_ADMIN_PIN).' }
  }
  if (!pinEquals(String(pin ?? ''), expected)) {
    setResponseStatus(event, 401)
    return { ok: false, code: 'wrong_pin', message: 'Verkeerde crew-pincode.' }
  }
  return { ok: true, data: { playerId: 'crew', token: await adminToken(), admin: true } }
})
