import type { BlockKey, DayKey, PlayerProfile, SlotKey } from '../types'

export const DAYS: { key: DayKey, short: string, long: string }[] = [
  { key: 'ma', short: 'Ma', long: 'Maandag' },
  { key: 'di', short: 'Di', long: 'Dinsdag' },
  { key: 'wo', short: 'Wo', long: 'Woensdag' },
  { key: 'do', short: 'Do', long: 'Donderdag' },
  { key: 'vr', short: 'Vr', long: 'Vrijdag' },
  { key: 'za', short: 'Za', long: 'Zaterdag' },
  { key: 'zo', short: 'Zo', long: 'Zondag' },
]

export const BLOCKS: { key: BlockKey, label: string, hint: string, icon: string }[] = [
  { key: 'ochtend', label: 'Ochtend', hint: '06 – 12u', icon: 'sunrise' },
  { key: 'middag', label: 'Middag', hint: '12 – 17u', icon: 'sun' },
  { key: 'avond', label: 'Avond', hint: '17 – 23u', icon: 'moon' },
]

export const ALL_SLOTS: SlotKey[] = DAYS.flatMap(d => BLOCKS.map(b => `${d.key}-${b.key}` as SlotKey))

export function slotLabel(slot: SlotKey): string {
  const [day, block] = slot.split('-') as [DayKey, BlockKey]
  const d = DAYS.find(x => x.key === day)
  const b = BLOCKS.find(x => x.key === block)
  return `${d?.long ?? day} ${b?.label.toLowerCase() ?? block}`
}

/** Compacts ["ma-avond","di-avond"] into "Ma, Di · avond" style chips. */
export function summariseAvailability(slots: SlotKey[]): string[] {
  const byBlock = new Map<BlockKey, DayKey[]>()
  for (const slot of slots) {
    const [day, block] = slot.split('-') as [DayKey, BlockKey]
    const list = byBlock.get(block) ?? []
    list.push(day)
    byBlock.set(block, list)
  }
  return BLOCKS.filter(b => byBlock.has(b.key)).map((b) => {
    const days = DAYS.filter(d => byBlock.get(b.key)!.includes(d.key)).map(d => d.short)
    return `${b.label}: ${days.join(' ')}`
  })
}

export const LEVELS: { value: 1 | 2 | 3 | 4, label: string, blurb: string }[] = [
  { value: 1, label: 'Nooit gespeeld', blurb: 'Vandaag is mijn allereerste keer' },
  { value: 2, label: 'Een paar keer', blurb: 'Ik ken de regels ongeveer' },
  { value: 3, label: 'Regelmatig', blurb: 'Ik speel af en toe met vrienden' },
  { value: 4, label: 'Vaak', blurb: 'Ik sta elke week op het veld' },
]

export const HOURS_OPTIONS = [
  { value: 1, label: '± 1 uur', blurb: 'Eén matchje per week' },
  { value: 2, label: '2 – 3 uur', blurb: 'Een vaste afspraak' },
  { value: 4, label: '4 – 5 uur', blurb: 'Meerdere keren per week' },
  { value: 6, label: '6 uur +', blurb: 'Zet mij maar elke dag op het veld' },
]

export const HOBBY_OPTIONS = [
  'Lopen', 'Fitness', 'Wielrennen', 'Zwemmen', 'Voetbal', 'Tennis',
  'Yoga', 'Wandelen', 'Skiën', 'Klimmen', 'Dansen', 'Festivals',
  'Koken', 'Reizen', 'Gaming', 'Fotografie', 'Muziek', 'Films & series',
  'Lezen', 'Terrasjes doen', 'Honden', 'Tuinieren', 'Bordspellen', 'Concerten',
]

/** Jaccard-ish overlap, normalised against the smaller of the two agendas so
 *  that someone with a packed week still matches someone with one free evening. */
export function availabilityOverlap(a: SlotKey[], b: SlotKey[]): number {
  if (!a.length || !b.length) return 0
  const setB = new Set(b)
  let shared = 0
  for (const slot of a) if (setB.has(slot)) shared++
  return shared / Math.min(a.length, b.length)
}

export function sharedSlots(a: PlayerProfile, b: PlayerProfile): SlotKey[] {
  const setB = new Set(b.availability)
  return a.availability.filter(s => setB.has(s))
}

export function sharedHobbies(a: PlayerProfile, b: PlayerProfile): string[] {
  const setB = new Set(b.hobbies)
  return a.hobbies.filter(h => setB.has(h))
}
