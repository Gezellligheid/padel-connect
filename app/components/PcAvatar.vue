<script setup lang="ts">
import type { PlayerProfile } from '#shared/types'
import { initials } from '#shared/logic/ids'

const props = withDefaults(defineProps<{
  player?: Pick<PlayerProfile, 'name' | 'photo'> | null
  name?: string
  photo?: string | null
  size?: number
  ring?: 'none' | 'lime' | 'cream' | 'flame'
  glow?: boolean
}>(), { size: 56, ring: 'none', glow: false })

const displayName = computed(() => props.player?.name ?? props.name ?? '?')
const src = computed(() => props.player?.photo ?? props.photo ?? null)

/** Stable pastel per person so avatarless players stay recognisable. */
const hue = computed(() => {
  let h = 0
  for (const char of displayName.value) h = (h * 31 + char.charCodeAt(0)) % 360
  return h
})

const RINGS = {
  none: 'ring-0',
  lime: 'ring-2 ring-lime-400',
  cream: 'ring-2 ring-cream/40',
  flame: 'ring-2 ring-[color:var(--color-flame)]',
}
</script>

<template>
  <div
    class="relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-navy-700"
    :class="[RINGS[ring], glow && 'shadow-[0_0_0_6px_color-mix(in_oklab,var(--color-lime-400)_18%,transparent)]']"
    :style="{ width: `${size}px`, height: `${size}px` }"
  >
    <img
      v-if="src" :src="src" :alt="displayName"
      class="h-full w-full object-cover" loading="lazy" decoding="async"
    >
    <template v-else>
      <div
        class="absolute inset-0"
        :style="{ background: `linear-gradient(140deg, hsl(${hue} 55% 38%), hsl(${(hue + 48) % 360} 60% 22%))` }"
      />
      <span
        class="relative font-display font-extrabold text-cream/90"
        :style="{ fontSize: `${Math.max(11, size * 0.36)}px` }"
      >{{ initials(displayName) }}</span>
    </template>
  </div>
</template>
