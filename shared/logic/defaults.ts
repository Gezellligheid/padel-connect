import type { EventSettings, EventState } from '../types'

export const DEFAULT_FIELD_COUNT = 8

export function defaultFieldNames(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `Veld ${i + 1}`)
}

export const DEFAULT_SETTINGS: EventSettings = {
  fieldCount: DEFAULT_FIELD_COUNT,
  gamesToWin: 8,
  fieldNames: defaultFieldNames(DEFAULT_FIELD_COUNT),
  registrationOpen: true,
  announcement: '',
}

export function defaultEventState(now = Date.now()): EventState {
  return {
    status: 'idle',
    settings: { ...DEFAULT_SETTINGS, fieldNames: [...DEFAULT_SETTINGS.fieldNames] },
    currentRoundId: null,
    roundCount: 0,
    startedAt: null,
    endedAt: null,
    updatedAt: now,
  }
}

/** Keeps `fieldNames` the same length as `fieldCount`, preserving custom names. */
export function normaliseSettings(input: Partial<EventSettings>, base: EventSettings): EventSettings {
  const fieldCount = clamp(Math.round(input.fieldCount ?? base.fieldCount), 1, 24)
  const names = input.fieldNames ?? base.fieldNames
  return {
    fieldCount,
    gamesToWin: clamp(Math.round(input.gamesToWin ?? base.gamesToWin), 1, 50),
    fieldNames: Array.from({ length: fieldCount }, (_, i) => (names[i] || `Veld ${i + 1}`).slice(0, 24)),
    registrationOpen: input.registrationOpen ?? base.registrationOpen,
    announcement: (input.announcement ?? base.announcement).slice(0, 200),
  }
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(n) ? n : min))
}
