import { cert, getApp, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import type { ServiceAccount } from 'firebase-admin/app'

let initialised = false

function parseServiceAccount(raw: string): ServiceAccount {
  const text = raw.trim().startsWith('{')
    ? raw
    : Buffer.from(raw, 'base64').toString('utf8')
  const json = JSON.parse(text) as Record<string, string>
  return {
    projectId: json.project_id ?? json.projectId,
    clientEmail: json.client_email ?? json.clientEmail,
    privateKey: (json.private_key ?? json.privateKey ?? '').replace(/\\n/g, '\n'),
  }
}

export function serverConfigured(): boolean {
  return Boolean(useRuntimeConfig().firebaseServiceAccount)
}

function ensureApp() {
  if (initialised && getApps().length) return getApp()
  const raw = useRuntimeConfig().firebaseServiceAccount
  if (!raw) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Firebase is niet geconfigureerd op de server. Zie README.md.',
    })
  }
  const app = getApps().length
    ? getApp()
    : initializeApp({ credential: cert(parseServiceAccount(raw)) })
  initialised = true
  return app
}

let configured = false

export function db() {
  const firestore = getFirestore(ensureApp())
  if (!configured) {
    // settings() may only be called before the instance is first used.
    configured = true
    firestore.settings({ ignoreUndefinedProperties: true })
  }
  return firestore
}

export function auth() {
  return getAuth(ensureApp())
}
