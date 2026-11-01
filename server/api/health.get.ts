import { serverConfigured } from '../utils/firebase'

export default defineEventHandler(() => ({
  ok: true,
  mode: serverConfigured() ? 'firebase' : 'demo',
  adminPinSet: Boolean(useRuntimeConfig().adminPin),
}))
