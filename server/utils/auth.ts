import type { H3Event } from 'h3'
import type { ActionContext } from '#shared/logic/dispatch'
import { auth } from './firebase'

export const ADMIN_UID = 'crew'

export async function readContext(event: H3Event): Promise<ActionContext> {
  const header = getRequestHeader(event, 'authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return { playerId: null, isAdmin: false }
  try {
    const decoded = await auth().verifyIdToken(token)
    const isAdmin = decoded.admin === true || decoded.uid === ADMIN_UID
    return { playerId: isAdmin ? null : decoded.uid, isAdmin }
  }
  catch {
    return { playerId: null, isAdmin: false }
  }
}

export function playerToken(playerId: string): Promise<string> {
  return auth().createCustomToken(playerId)
}

export function adminToken(): Promise<string> {
  return auth().createCustomToken(ADMIN_UID, { admin: true })
}

/* ── very small in-memory throttle, enough to stop pincode guessing ──────── */

const buckets = new Map<string, { count: number, resetAt: number }>()

export function throttle(event: H3Event, key: string, limit: number, windowMs: number) {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const id = `${key}:${ip}`
  const now = Date.now()
  const bucket = buckets.get(id)
  if (!bucket || bucket.resetAt < now) {
    buckets.set(id, { count: 1, resetAt: now + windowMs })
    return
  }
  bucket.count++
  if (bucket.count > limit) {
    throw createError({
      statusCode: 429,
      data: {
        ok: false,
        code: 'rate_limited',
        message: 'Te veel pogingen. Wacht even en probeer opnieuw.',
      },
    })
  }
}

/** Constant-time-ish compare so the admin pin cannot be timed out of us. */
export function pinEquals(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
