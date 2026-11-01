import { login } from '#shared/logic/actions'
import { ActionError } from '#shared/logic/store'
import { playerToken, throttle } from '../../utils/auth'
import { createFirestoreStore } from '../../utils/firestore-store'

export default defineEventHandler(async (event) => {
  throttle(event, 'login', 10, 5 * 60_000)
  const { pin } = await readBody<{ pin: string }>(event)
  try {
    const { playerId } = await login(createFirestoreStore(), pin)
    return { ok: true, data: { playerId, token: await playerToken(playerId) } }
  }
  catch (error) {
    if (error instanceof ActionError) {
      setResponseStatus(event, error.status)
      return { ok: false, code: error.code, message: error.message }
    }
    throw error
  }
})
