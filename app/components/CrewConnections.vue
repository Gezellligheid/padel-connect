<script setup lang="ts">
const crew = useCrewStore()

const SIZE = 560
const CENTER = SIZE / 2
const RADIUS = SIZE * 0.4

const hovered = ref<string | null>(null)
const selected = ref<string | null>(null)
const focus = computed(() => selected.value ?? hovered.value)

/** Players sit on the circle in alphabetical order: a neutral arrangement
 *  spreads the chords evenly instead of bunching every hub in one corner. */
const nodes = computed(() => {
  const list = crew.leaderboard
    .filter(row => row.out + row.in > 0 || row.player.present)
    .slice()
    .sort((a, b) => a.player.name.localeCompare(b.player.name, 'nl'))
  const count = Math.max(list.length, 1)
  return list.map((row, i) => {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2
    return {
      ...row,
      id: row.player.id,
      x: CENTER + Math.cos(angle) * RADIUS,
      y: CENTER + Math.sin(angle) * RADIUS,
      angle,
      r: 7 + Math.min(row.in, 8) * 1.4,
    }
  })
})

const positions = computed(() => new Map(nodes.value.map(n => [n.id, n])))

const edges = computed(() => {
  const seen = new Set<string>()
  const out: { key: string, from: string, to: string, mutual: boolean, d: string }[] = []
  for (const connection of crew.connections) {
    const a = positions.value.get(connection.from)
    const b = positions.value.get(connection.to)
    if (!a || !b) continue
    const pair = connection.from < connection.to
      ? `${connection.from}|${connection.to}`
      : `${connection.to}|${connection.from}`
    const mutual = crew.connections.some(o => o.from === connection.to && o.to === connection.from)
    if (mutual && seen.has(pair)) continue
    if (mutual) seen.add(pair)
    // bundle the chord towards the middle so the circle stays readable
    const cx = CENTER + (a.x + b.x - 2 * CENTER) * 0.18
    const cy = CENTER + (a.y + b.y - 2 * CENTER) * 0.18
    out.push({
      key: `${connection.from}->${connection.to}`,
      from: connection.from,
      to: connection.to,
      mutual,
      d: `M${a.x.toFixed(1)} ${a.y.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`,
    })
  }
  return out
})

const isLit = (id: string) => !focus.value || focus.value === id
const edgeLit = (edge: { from: string, to: string }) =>
  !focus.value || edge.from === focus.value || edge.to === focus.value

const detail = computed(() => {
  if (!selected.value) return null
  const player = crew.byId.get(selected.value)
  const node = crew.connectionGraph.get(selected.value)
  if (!player || !node) return null
  return {
    player,
    added: [...node.out].map(id => crew.byId.get(id)).filter(Boolean),
    addedBy: [...node.in].map(id => crew.byId.get(id)).filter(Boolean),
    mutual: [...node.out].filter(id => node.in.has(id)).map(id => crew.byId.get(id)).filter(Boolean),
  }
})

const mutualList = computed(() =>
  crew.mutualPairs
    .map(([a, b]) => ({ a: crew.byId.get(a), b: crew.byId.get(b) }))
    .filter(pair => pair.a && pair.b))

function exportCsv() {
  const rows = [
    ['Van', 'Naar', 'Wederzijds', 'Ronde', 'Tijdstip'],
    ...crew.connections.map(c => [
      crew.byId.get(c.from)?.name ?? c.from,
      crew.byId.get(c.to)?.name ?? c.to,
      crew.connections.some(o => o.from === c.to && o.to === c.from) ? 'ja' : 'nee',
      crew.rounds.find(r => r.id === c.roundId)?.index ?? '',
      new Date(c.createdAt).toLocaleString('nl-BE'),
    ]),
  ]
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n')
  const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }))
  Object.assign(document.createElement('a'), { href: url, download: 'padel-connect-connecties.csv' }).click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <section class="space-y-5">
    <!-- kerncijfers -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div class="rounded-2xl border border-ink/10 bg-white p-4">
        <p class="font-display text-3xl text-ink">
          {{ crew.stats.connections }}
        </p>
        <p class="text-[0.7rem] font-bold uppercase tracking-wider text-ink/45">
          Connecties
        </p>
      </div>
      <div class="rounded-2xl border border-lime-500/40 bg-lime-50 p-4">
        <p class="font-display text-3xl text-lime-700">
          {{ crew.stats.mutual }}
        </p>
        <p class="text-[0.7rem] font-bold uppercase tracking-wider text-lime-700/70">
          Wederzijds
        </p>
      </div>
      <div class="rounded-2xl border border-ink/10 bg-white p-4">
        <p class="font-display text-3xl text-ink">
          {{ crew.stats.averagePerPlayer }}
        </p>
        <p class="text-[0.7rem] font-bold uppercase tracking-wider text-ink/45">
          Gemiddeld p.p.
        </p>
      </div>
      <div
        class="rounded-2xl border p-4"
        :class="crew.lonely.length ? 'border-[color:var(--color-flame)]/40 bg-[color:var(--color-flame)]/8' : 'border-ink/10 bg-white'"
      >
        <p class="font-display text-3xl" :class="crew.lonely.length ? 'text-[color:var(--color-flame)]' : 'text-ink'">
          {{ crew.lonely.length }}
        </p>
        <p class="text-[0.7rem] font-bold uppercase tracking-wider" :class="crew.lonely.length ? 'text-[color:var(--color-flame)]/75' : 'text-ink/45'">
          Nog niemand
        </p>
      </div>
    </div>

    <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <!-- netwerk -->
      <div class="rounded-2xl border border-ink/10 bg-white p-4">
        <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 class="font-display text-xl text-ink">
            Het netwerk
          </h3>
          <div class="flex items-center gap-3 text-[0.72rem] text-ink/50">
            <span class="flex items-center gap-1.5"><span class="h-0.5 w-5 rounded bg-[color:var(--color-berry)]" />wederzijds</span>
            <span class="flex items-center gap-1.5"><span class="h-0.5 w-5 rounded bg-navy-600/40" />eenrichting</span>
          </div>
        </div>

        <p v-if="!crew.connections.length" class="py-16 text-center text-ink/45">
          Nog geen connecties gelegd. Die verschijnen zodra spelers elkaar toevoegen na een match.
        </p>

        <svg
          v-else :viewBox="`0 0 ${SIZE} ${SIZE}`" class="mx-auto block w-full max-w-[34rem]"
          role="img" aria-label="Netwerk van connecties tussen de spelers"
          @pointerleave="hovered = null"
        >
          <g>
            <path
              v-for="edge in edges" :key="edge.key" :d="edge.d" fill="none"
              :stroke="edge.mutual ? 'var(--color-berry)' : 'var(--color-navy-600)'"
              :stroke-width="edge.mutual ? 2.1 : 1.2"
              :opacity="edgeLit(edge) ? (edge.mutual ? 0.75 : 0.3) : 0.05"
              class="transition-opacity duration-300"
            />
          </g>
          <g>
            <g
              v-for="node in nodes" :key="node.id"
              class="cursor-pointer transition-opacity duration-300"
              :opacity="isLit(node.id) || edges.some(e => edgeLit(e) && (e.from === node.id || e.to === node.id)) ? 1 : 0.2"
              @pointerenter="hovered = node.id"
              @click="selected = selected === node.id ? null : node.id"
            >
              <circle
                :cx="node.x" :cy="node.y" :r="node.r"
                :fill="node.mutual ? 'var(--color-berry)' : node.in ? 'var(--color-lime-500)' : 'var(--color-navy-600)'"
                :stroke="selected === node.id ? 'var(--color-ink)' : 'white'"
                :stroke-width="selected === node.id ? 3 : 1.5"
              />
              <text
                :x="CENTER + Math.cos(node.angle) * (RADIUS + node.r + 9)"
                :y="CENTER + Math.sin(node.angle) * (RADIUS + node.r + 9)"
                :text-anchor="Math.cos(node.angle) > 0.08 ? 'start' : Math.cos(node.angle) < -0.08 ? 'end' : 'middle'"
                dominant-baseline="middle"
                class="pointer-events-none select-none"
                font-size="10" font-weight="700" fill="var(--color-ink)"
                :opacity="focus === node.id ? 1 : nodes.length > 26 ? 0 : 0.55"
              >{{ node.player.name.split(' ')[0] }}</text>
            </g>
          </g>
        </svg>

        <!-- detail -->
        <Transition name="pop">
          <div v-if="detail" class="mt-3 rounded-xl bg-cream p-4">
            <div class="flex items-center gap-3">
              <PcAvatar :player="detail.player" :size="40" />
              <div class="flex-1">
                <p class="font-display text-lg text-ink">
                  {{ detail.player.name }}
                </p>
                <p class="text-[0.75rem] text-ink/50">
                  {{ detail.added.length }} toegevoegd · {{ detail.addedBy.length }} keer toegevoegd · {{ detail.mutual.length }} wederzijds
                </p>
              </div>
              <button type="button" class="grid h-8 w-8 place-items-center rounded-lg text-ink/35 hover:bg-ink/8" aria-label="Sluiten" @click="selected = null">
                <PcIcon name="x" :size="16" />
              </button>
            </div>
            <div v-if="detail.added.length" class="mt-3">
              <p class="text-[0.65rem] font-bold uppercase tracking-wider text-ink/40">
                Voegde toe
              </p>
              <div class="mt-1.5 flex flex-wrap gap-1.5">
                <span v-for="other in detail.added" :key="other!.id" class="rounded-md bg-lime-500/15 px-2.5 py-1 text-[0.72rem] font-semibold text-lime-700">{{ other!.name }}</span>
              </div>
            </div>
            <div v-if="detail.addedBy.length" class="mt-3">
              <p class="text-[0.65rem] font-bold uppercase tracking-wider text-ink/40">
                Werd toegevoegd door
              </p>
              <div class="mt-1.5 flex flex-wrap gap-1.5">
                <span v-for="other in detail.addedBy" :key="other!.id" class="rounded-md bg-ink/8 px-2.5 py-1 text-[0.72rem] font-semibold text-ink/65">{{ other!.name }}</span>
              </div>
            </div>
          </div>
        </Transition>
      </div>

      <!-- zijkolom -->
      <div class="space-y-5">
        <div class="rounded-2xl border border-ink/10 bg-white p-4">
          <div class="flex items-center justify-between">
            <h3 class="font-display text-lg text-ink">
              Populairste spelers
            </h3>
            <button type="button" class="flex items-center gap-1.5 text-[0.72rem] font-semibold text-ink/50 hover:text-ink" @click="exportCsv">
              <PcIcon name="download" :size="14" />CSV
            </button>
          </div>
          <ol class="mt-3 space-y-1.5">
            <li
              v-for="(row, i) in crew.leaderboard.slice(0, 8)" :key="row.player.id"
              class="flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-cream"
              @pointerenter="hovered = row.player.id" @pointerleave="hovered = null"
            >
              <span class="w-4 text-center font-display text-sm font-bold text-ink/30">{{ i + 1 }}</span>
              <PcAvatar :player="row.player" :size="30" />
              <span class="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{{ row.player.name }}</span>
              <span class="shrink-0 rounded-md bg-[color:var(--color-berry)]/12 px-2 py-0.5 text-[0.68rem] font-bold text-[color:var(--color-berry)]">{{ row.mutual }}×</span>
              <span class="shrink-0 text-[0.72rem] tabular-nums text-ink/45">{{ row.in }} in</span>
            </li>
          </ol>
        </div>

        <div v-if="mutualList.length" class="rounded-2xl border border-[color:var(--color-berry)]/30 bg-[color:var(--color-berry)]/6 p-4">
          <h3 class="font-display text-lg text-ink">
            Echte matches
          </h3>
          <p class="text-[0.75rem] text-ink/50">
            Deze duo's voegden elkaar allebei toe.
          </p>
          <ul class="mt-3 space-y-2">
            <li v-for="pair in mutualList" :key="pair.a!.id + pair.b!.id" class="flex items-center gap-2">
              <PcAvatar :player="pair.a" :size="28" />
              <PcIcon name="heart" :size="14" class="text-[color:var(--color-berry)]" />
              <PcAvatar :player="pair.b" :size="28" />
              <span class="min-w-0 flex-1 truncate text-[0.8rem] font-semibold text-ink/75">
                {{ pair.a!.name.split(' ')[0] }} &amp; {{ pair.b!.name.split(' ')[0] }}
              </span>
            </li>
          </ul>
        </div>

        <div v-if="crew.lonely.length" class="rounded-2xl border border-[color:var(--color-flame)]/35 bg-[color:var(--color-flame)]/8 p-4">
          <div class="flex items-center gap-2">
            <PcIcon name="info" :size="17" class="text-[color:var(--color-flame)]" />
            <h3 class="font-display text-lg text-ink">
              Heeft een duwtje nodig
            </h3>
          </div>
          <p class="mt-1 text-[0.78rem] text-ink/55">
            Niemand voegde deze spelers nog toe. Stel ze eens voor aan iemand.
          </p>
          <div class="mt-3 flex flex-wrap gap-1.5">
            <span v-for="player in crew.lonely" :key="player.id" class="flex items-center gap-1.5 rounded-lg bg-white py-1 pl-1 pr-2.5">
              <PcAvatar :player="player" :size="22" />
              <span class="text-[0.75rem] font-semibold text-ink/75">{{ player.name }}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
