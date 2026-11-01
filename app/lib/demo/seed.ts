import type { PlayerProfile, SlotKey } from '#shared/types'
import { ALL_SLOTS, HOBBY_OPTIONS } from '#shared/logic/availability'
import { mulberry32, shuffle } from '#shared/logic/matchmaking'
import { demoDb } from './db'

const FIRST = [
  'Lotte', 'Jonas', 'Emma', 'Seppe', 'Fien', 'Wout', 'Noor', 'Arne', 'Lore', 'Brecht',
  'Marie', 'Thibo', 'Amber', 'Robbe', 'Nina', 'Matthias', 'Janne', 'Cas', 'Hanne', 'Lukas',
  'Elise', 'Stijn', 'Febe', 'Daan', 'Lena', 'Jarne', 'Mila', 'Ruben', 'Axelle', 'Tuur',
  'Sofie', 'Milan', 'Kato', 'Vince', 'Lisa', 'Bram', 'Juliette', 'Senne', 'Marthe', 'Ferre',
  'Anouk', 'Gilles', 'Ella', 'Jens', 'Charlotte', 'Tibo', 'Yana', 'Maarten', 'Luna', 'Pieter',
]
const LAST = 'ABCDEFGHJKLMNPRSTVW'

const BIOS = [
  'Eerste keer padel, laatste keer thuis op de zetel.',
  'Kom vooral voor de afterparty.',
  'Smash eerst, excuses achteraf.',
  'Zoek nog een vast duo voor dinsdagavond.',
  'Tennis afgezworen, padel gevonden.',
  'Beloof niets, maar ik geef alles.',
  '',
  '',
]

/** Fills demo mode with a believable 50-player field in one click. */
export function seedDemoPlayers(count = 50) {
  const rng = mulberry32(20261101)
  const db = demoDb()
  const now = Date.now()

  db.mutate((data) => {
    const names = shuffle(FIRST, rng).slice(0, count)
    names.forEach((first, i) => {
      const id = `demo-${i.toString().padStart(2, '0')}`
      if (data.players[id]) return

      // Most people play on a few evenings; a minority has a wide-open week.
      const generous = rng() > 0.72
      const slots = ALL_SLOTS.filter((slot) => {
        if (slot.endsWith('avond')) return rng() > (generous ? 0.25 : 0.55)
        if (slot.endsWith('middag')) return rng() > (generous ? 0.55 : 0.85)
        return rng() > (generous ? 0.7 : 0.92)
      })
      const availability: SlotKey[] = slots.length
        ? slots
        : [ALL_SLOTS[Math.floor(rng() * ALL_SLOTS.length)]!]

      const player: PlayerProfile = {
        id,
        name: `${first} ${LAST[Math.floor(rng() * LAST.length)]}.`,
        age: 19 + Math.floor(rng() * 32),
        photo: null,
        hobbies: shuffle(HOBBY_OPTIONS, rng).slice(0, 2 + Math.floor(rng() * 3)),
        bio: BIOS[Math.floor(rng() * BIOS.length)]!,
        level: (1 + Math.floor(rng() * 4)) as PlayerProfile['level'],
        hoursPerWeek: [1, 2, 4, 6][Math.floor(rng() * 4)]!,
        availability,
        createdAt: now + i,
        present: rng() > 0.08,
        roundsPlayed: 0,
        roundsBenched: 0,
        lastRoundId: null,
      }
      data.players[id] = player

      const pin = String(1000 + ((i * 137) % 8999))
      if (!data.pins[pin]) data.pins[pin] = id
      data.contacts[id] = {
        phone: `+3247${String(1000000 + Math.floor(rng() * 8999999)).slice(0, 7)}`,
        consentAt: now,
      }
    })
  })

  return Object.keys(demoDb().snapshot().players).length
}

export function wipeDemo() {
  localStorage.removeItem('padelconnect.demo.v1')
  localStorage.removeItem('padelconnect.session')
  localStorage.removeItem('padelconnect.admin')
  location.reload()
}
