import { register } from '#shared/logic/actions'
import { ActionError } from '#shared/logic/store'
import type { RegistrationInput } from '#shared/logic/validation'
import { playerToken, throttle } from '../../utils/auth'
import { createFirestoreStore } from '../../utils/firestore-store'

export default defineEventHandler(async (event) => {
  throttle(event, 'register', 12, 10 * 60_000)
  const input = await readBody<RegistrationInput>(event)
  try {
    const { playerId } = await register(createFirestoreStore(), input)
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
