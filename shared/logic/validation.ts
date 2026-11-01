import type { PlayerProfile, SlotKey } from '../types'
import { ALL_SLOTS, HOBBY_OPTIONS } from './availability'

export interface RegistrationInput {
  name: string
  age: number | null
  phone: string
  pin: string
  photo: string | null
  hobbies: string[]
  bio: string
  level: number
  hoursPerWeek: number
  availability: string[]
  consent: boolean
}

export type Validation = { ok: true } | { ok: false, field: string, message: string }

const SLOT_SET = new Set<string>(ALL_SLOTS)
const HOBBY_SET = new Set(HOBBY_OPTIONS)

export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin)
}

/** Blocks the pincodes everybody picks — they cause collisions and guesses. */
export const WEAK_PINS = new Set(['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234', '4321'])

export function normalisePhone(raw: string): string {
  const trimmed = raw.replace(/[\s().-]/g, '')
  if (/^00\d{8,15}$/.test(trimmed)) return `+${trimmed.slice(2)}`
  if (/^0\d{8,10}$/.test(trimmed)) return `+32${trimmed.slice(1)}` // BE / NL local notation
  return trimmed
}

export function isValidPhone(raw: string): boolean {
  return /^\+?\d{8,15}$/.test(normalisePhone(raw))
}

export function validateRegistration(input: RegistrationInput): Validation {
  const name = input.name?.trim() ?? ''
  if (name.length < 2 || name.length > 32) return { ok: false, field: 'name', message: 'Je naam moet tussen 2 en 32 tekens zijn.' }
  if (input.age !== null && (input.age < 16 || input.age > 99)) return { ok: false, field: 'age', message: 'Leeftijd moet tussen 16 en 99 liggen.' }
  if (!isValidPhone(input.phone ?? '')) return { ok: false, field: 'phone', message: 'Dat lijkt geen geldig gsm-nummer.' }
  if (!isValidPin(input.pin ?? '')) return { ok: false, field: 'pin', message: 'Je pincode bestaat uit exact 4 cijfers.' }
  if (WEAK_PINS.has(input.pin)) return { ok: false, field: 'pin', message: 'Kies een iets minder voorspelbare pincode.' }
  if (![1, 2, 3, 4].includes(input.level)) return { ok: false, field: 'level', message: 'Kies je niveau.' }
  if (!(input.availability?.length)) return { ok: false, field: 'availability', message: 'Duid minstens één moment aan waarop je kan padellen.' }
  if (input.availability.some(s => !SLOT_SET.has(s))) return { ok: false, field: 'availability', message: 'Onbekend tijdslot.' }
  if ((input.hobbies ?? []).some(h => !HOBBY_SET.has(h))) return { ok: false, field: 'hobbies', message: 'Onbekende hobby.' }
  if ((input.bio ?? '').length > 160) return { ok: false, field: 'bio', message: 'Hou het kort — max 160 tekens.' }
  if (input.photo && input.photo.length > 400_000) return { ok: false, field: 'photo', message: 'Die foto is te zwaar. Probeer een andere.' }
  if (!input.consent) return { ok: false, field: 'consent', message: 'We hebben je akkoord nodig met de privacyverklaring.' }
  return { ok: true }
}

export function toProfile(id: string, input: RegistrationInput, now = Date.now()): PlayerProfile {
  return {
    id,
    name: input.name.trim(),
    age: input.age,
    photo: input.photo,
    hobbies: (input.hobbies ?? []).slice(0, 12),
    bio: (input.bio ?? '').trim(),
    level: input.level as PlayerProfile['level'],
    hoursPerWeek: input.hoursPerWeek,
    availability: input.availability as SlotKey[],
    createdAt: now,
    present: true,
    roundsPlayed: 0,
    roundsBenched: 0,
    lastRoundId: null,
  }
}
