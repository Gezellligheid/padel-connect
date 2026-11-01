<script setup lang="ts">
import { LEVELS, summariseAvailability } from '#shared/logic/availability'

const crew = useCrewStore()

const search = ref('')
const filter = ref<'all' | 'present' | 'absent'>('all')
const confirmDelete = ref<string | null>(null)

const rows = computed(() => {
  const term = search.value.trim().toLowerCase()
  return crew.roster
    .filter(row => (filter.value === 'all'
      || (filter.value === 'present' && row.present)
      || (filter.value === 'absent' && !row.present)))
    .filter(row => !term
      || row.name.toLowerCase().includes(term)
      || (row.phone ?? '').includes(term)
      || row.hobbies.some(h => h.toLowerCase().includes(term)))
})

const FILTERS = [
  { key: 'all', label: 'Iedereen' },
  { key: 'present', label: 'Aanwezig' },
  { key: 'absent', label: 'Afgemeld' },
] as const

function exportCsv() {
  const header = ['Naam', 'Leeftijd', 'Telefoon', 'Niveau', 'Uren/week', 'Aanwezig', 'Rondes', 'Toegevoegd', 'Ontvangen', 'Hobbys', 'Speelmomenten']
  const lines = crew.roster.map(row => [
    row.name,
    row.age ?? '',
    row.phone ?? '',
    LEVELS.find(l => l.value === row.level)?.label ?? row.level,
    row.hoursPerWeek,
    row.present ? 'ja' : 'nee',
    row.roundsPlayed,
    row.connectionsMade,
    row.connectionsReceived,
    row.hobbies.join(' / '),
    summariseAvailability(row.availability).join(' / '),
  ])
  download('padel-connect-spelers.csv', [header, ...lines])
}

function download(filename: string, rowsOut: (string | number)[][]) {
  const csv = rowsOut
    .map(cells => cells.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
    .join('\n')
  const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }))
  const link = Object.assign(document.createElement('a'), { href: url, download: filename })
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <section>
    <div class="mb-4 flex flex-wrap items-center gap-2">
      <div class="relative min-w-52 flex-1">
        <PcIcon name="search" :size="17" class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35" />
        <input
          v-model="search" placeholder="Zoek op naam, nummer of hobby…"
          class="w-full rounded-xl border border-ink/12 bg-white py-2.5 pl-10 pr-3 text-ink outline-none transition-colors placeholder:text-ink/35 focus:border-lime-500"
        >
      </div>
      <div class="flex gap-1 rounded-xl bg-ink/6 p-1">
        <button
          v-for="option in FILTERS" :key="option.key" type="button"
          class="rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors"
          :class="filter === option.key ? 'bg-white text-ink shadow-sm' : 'text-ink/50 hover:text-ink'"
          @click="filter = option.key"
        >
          {{ option.label }}
        </button>
      </div>
      <button type="button" class="flex items-center gap-1.5 rounded-xl border border-ink/12 bg-white px-3.5 py-2.5 text-sm font-semibold text-ink/70 transition-colors hover:border-ink/25" @click="exportCsv">
        <PcIcon name="download" :size="16" />CSV
      </button>
    </div>

    <p v-if="!crew.roster.length" class="rounded-2xl border border-dashed border-ink/20 bg-white/60 p-10 text-center text-ink/50">
      Nog geen inschrijvingen.
    </p>

    <div v-else class="overflow-hidden rounded-2xl border border-ink/10 bg-white">
      <div class="max-h-[36rem] overflow-y-auto">
        <table class="w-full border-collapse text-sm">
          <thead class="sticky top-0 z-10 bg-cream-200/90 backdrop-blur">
            <tr class="text-left font-display text-[0.68rem] uppercase tracking-wider text-ink/50">
              <th class="px-3 py-2.5">
                Speler
              </th>
              <th class="px-3 py-2.5">
                Telefoon
              </th>
              <th class="hidden px-3 py-2.5 sm:table-cell">
                Niveau
              </th>
              <th class="px-2 py-2.5 text-center" title="Rondes gespeeld">
                R
              </th>
              <th class="px-2 py-2.5 text-center" title="Connecties gemaakt / ontvangen">
                C
              </th>
              <th class="px-3 py-2.5 text-right">
                Aanwezig
              </th>
              <th class="w-10" />
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in rows" :key="row.id"
              class="border-t border-ink/8 transition-colors hover:bg-cream/70"
              :class="!row.present && 'opacity-55'"
            >
              <td class="px-3 py-2">
                <div class="flex items-center gap-2.5">
                  <PcAvatar :player="row" :size="34" />
                  <div class="min-w-0">
                    <p class="truncate font-semibold text-ink">
                      {{ row.name }}
                    </p>
                    <p class="truncate text-[0.72rem] text-ink/45">
                      {{ row.age ? `${row.age} jaar · ` : '' }}{{ row.hobbies.slice(0, 2).join(', ') || '—' }}
                    </p>
                  </div>
                </div>
              </td>
              <td class="px-3 py-2">
                <a v-if="row.phone" :href="`tel:${row.phone}`" class="tabular-nums text-ink/70 hover:text-ink hover:underline">{{ row.phone }}</a>
                <span v-else class="text-ink/30">—</span>
              </td>
              <td class="hidden px-3 py-2 text-ink/60 sm:table-cell">
                {{ LEVELS.find(l => l.value === row.level)?.label }}
              </td>
              <td class="px-2 py-2 text-center tabular-nums text-ink/60">
                {{ row.roundsPlayed }}
              </td>
              <td class="px-2 py-2 text-center tabular-nums">
                <span class="text-lime-700">{{ row.connectionsMade }}</span>
                <span class="text-ink/25">/</span>
                <span class="text-ink/60">{{ row.connectionsReceived }}</span>
              </td>
              <td class="px-3 py-2 text-right">
                <button
                  type="button"
                  class="relative h-6 w-11 rounded-full transition-colors"
                  :class="row.present ? 'bg-lime-500' : 'bg-ink/15'"
                  :aria-label="`${row.name} markeren als ${row.present ? 'afwezig' : 'aanwezig'}`"
                  @click="crew.setPresence(row.id, !row.present)"
                >
                  <span
                    class="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left] duration-300"
                    :class="row.present ? 'left-[1.4rem]' : 'left-0.5'"
                  />
                </button>
              </td>
              <td class="pr-2">
                <button
                  type="button" class="grid h-8 w-8 place-items-center rounded-lg text-ink/30 transition-colors hover:bg-[color:var(--color-flame)]/12 hover:text-[color:var(--color-flame)]"
                  :aria-label="`${row.name} verwijderen`" @click="confirmDelete = row.id"
                >
                  <PcIcon name="trash" :size="16" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="pop">
        <div v-if="confirmDelete" class="fixed inset-0 z-[80] grid place-items-center bg-navy-950/60 p-5 backdrop-blur-sm" @click.self="confirmDelete = null">
          <div class="w-full max-w-sm rounded-3xl bg-cream p-6 text-center shadow-2xl">
            <span class="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[color:var(--color-flame)]/12 text-[color:var(--color-flame)]">
              <PcIcon name="trash" :size="22" />
            </span>
            <h3 class="mt-3 font-display text-xl text-ink">
              {{ crew.byId.get(confirmDelete)?.name }} verwijderen?
            </h3>
            <p class="mt-1.5 text-sm text-ink/55">
              Profiel, telefoonnummer en alle connecties van deze speler verdwijnen definitief.
            </p>
            <div class="mt-5 flex gap-2">
              <button type="button" class="flex-1 rounded-xl bg-ink/8 py-3 font-semibold text-ink/70 hover:bg-ink/14" @click="confirmDelete = null">
                Annuleren
              </button>
              <button
                type="button" class="flex-1 rounded-xl bg-[color:var(--color-flame)] py-3 font-semibold text-white hover:brightness-110"
                @click="crew.removePlayer(confirmDelete!); confirmDelete = null"
              >
                Verwijderen
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>
