<script setup lang="ts">
import type { BlockKey, DayKey, SlotKey } from '#shared/types'
import { BLOCKS, DAYS } from '#shared/logic/availability'

const model = defineModel<SlotKey[]>({ default: () => [] })
const { buzz } = useCelebrate()

const selected = computed(() => new Set(model.value))
const has = (slot: string) => selected.value.has(slot as SlotKey)

function apply(slots: SlotKey[], force?: boolean) {
  const on = force ?? !slots.every(s => selected.value.has(s))
  model.value = on
    ? [...new Set([...model.value, ...slots])]
    : model.value.filter(s => !slots.includes(s))
  buzz(10)
}

const toggleRow = (block: BlockKey) => apply(DAYS.map(d => `${d.key}-${block}` as SlotKey))
const toggleColumn = (day: DayKey) => apply(BLOCKS.map(b => `${day}-${b.key}` as SlotKey))

/* Drag across the grid to paint a whole stretch of the week at once. */
let painting: boolean | null = null

function startPaint(day: DayKey, block: BlockKey) {
  painting = !has(`${day}-${block}`)
  apply([`${day}-${block}` as SlotKey], painting)
}

function paintOver(day: DayKey, block: BlockKey, event: PointerEvent) {
  if (painting === null || event.buttons !== 1) return
  const slot = `${day}-${block}` as SlotKey
  if (has(slot) === painting) return
  apply([slot], painting)
}

const stopPaint = () => (painting = null)
onMounted(() => window.addEventListener('pointerup', stopPaint))
onBeforeUnmount(() => window.removeEventListener('pointerup', stopPaint))

const PRESETS = [
  { label: 'Elke avond', slots: DAYS.map(d => `${d.key}-avond` as SlotKey) },
  { label: 'Na het werk', slots: (['ma', 'di', 'wo', 'do'] as DayKey[]).map(d => `${d}-avond` as SlotKey) },
  { label: 'Weekend', slots: (['za', 'zo'] as DayKey[]).flatMap(d => BLOCKS.map(b => `${d}-${b.key}` as SlotKey)) },
]

const GRID = 'grid grid-cols-[4.25rem_repeat(7,minmax(0,1fr))] gap-1'
</script>

<template>
  <div class="space-y-3">
    <!-- ── snelkeuzes ──────────────────────────────────────────────────── -->
    <div class="flex flex-wrap items-center gap-1.5">
      <button
        v-for="preset in PRESETS" :key="preset.label" type="button"
        class="rounded-md border px-2.5 py-1.5 text-[0.76rem] font-semibold transition-colors duration-200"
        :class="preset.slots.every(s => selected.has(s))
          ? 'border-lime-400/60 bg-lime-400/15 text-lime-200'
          : 'border-cream/12 bg-cream/[0.04] text-cream/60 hover:border-cream/25 hover:text-cream'"
        @click="apply(preset.slots)"
      >
        {{ preset.label }}
      </button>
      <button
        v-if="model.length" type="button"
        class="ml-auto rounded-md px-2 py-1.5 text-[0.76rem] font-semibold text-cream/40 transition-colors hover:text-[color:var(--color-flame)]"
        @click="model = []"
      >
        Wissen
      </button>
    </div>

    <!-- ── raster ──────────────────────────────────────────────────────── -->
    <div class="select-none">
      <div :class="GRID">
        <span />
        <button
          v-for="day in DAYS" :key="day.key" type="button"
          class="pb-0.5 font-display text-[0.7rem] font-bold uppercase tracking-wider text-cream/40 transition-colors hover:text-lime-300"
          :title="`Hele ${day.long} aan- of uitzetten`"
          @click="toggleColumn(day.key)"
        >
          {{ day.short }}
        </button>
      </div>

      <div v-for="block in BLOCKS" :key="block.key" class="mt-1" :class="GRID">
        <button
          type="button"
          class="flex items-center gap-1.5 pr-1 text-left text-[0.74rem] font-semibold text-cream/50 transition-colors hover:text-lime-300"
          :title="`Elke ${block.label.toLowerCase()} aan- of uitzetten`"
          @click="toggleRow(block.key)"
        >
          <PcIcon :name="block.icon" :size="13" class="shrink-0 opacity-70" />
          <span class="whitespace-nowrap">{{ block.label }}</span>
        </button>

        <button
          v-for="day in DAYS" :key="`${day.key}-${block.key}`" type="button"
          class="grid h-10 place-items-center rounded-md border transition-[background-color,border-color,transform] duration-200 active:scale-95"
          :class="has(`${day.key}-${block.key}`)
            ? 'border-lime-400/70 bg-lime-400/85 text-navy-900'
            : 'border-cream/10 bg-cream/[0.035] text-transparent hover:border-cream/25 hover:bg-cream/[0.08]'"
          :aria-pressed="has(`${day.key}-${block.key}`)"
          :aria-label="`${day.long} ${block.label}`"
          @pointerdown.prevent="startPaint(day.key, block.key)"
          @pointerenter="paintOver(day.key, block.key, $event)"
        >
          <PcIcon name="check" :size="15" :stroke="3" />
        </button>
      </div>
    </div>

    <p class="text-[0.76rem] leading-snug text-cream/40">
      <span class="font-semibold text-cream/70">{{ model.length }}</span>
      {{ model.length === 1 ? 'moment' : 'momenten' }} aangeduid — hoe meer, hoe beter we matchen.
      Sleep over het raster om er meerdere tegelijk aan te zetten.
    </p>
  </div>
</template>
