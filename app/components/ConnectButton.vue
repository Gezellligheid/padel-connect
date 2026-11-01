<script setup lang="ts">
import type { PlayerProfile } from '#shared/types'
import { sharedHobbies, sharedSlots, slotLabel } from '#shared/logic/availability'

const props = defineProps<{
  player: PlayerProfile
  me: PlayerProfile | null
  connected: boolean
  mutual: boolean
  busy?: boolean
}>()

const emit = defineEmits<{ toggle: [] }>()
const { burst, buzz } = useCelebrate()
const root = useTemplateRef<HTMLElement>('root')

const common = computed(() => {
  if (!props.me) return { slots: [] as string[], hobbies: [] as string[] }
  return {
    slots: sharedSlots(props.me, props.player).slice(0, 3).map(slotLabel),
    hobbies: sharedHobbies(props.me, props.player).slice(0, 3),
  }
})

function onClick() {
  if (!props.connected && root.value) {
    const box = root.value.getBoundingClientRect()
    void burst({
      particles: 45,
      spread: 55,
      origin: {
        x: (box.left + box.width - 44) / window.innerWidth,
        y: (box.top + box.height / 2) / window.innerHeight,
      },
    })
    buzz([14, 30, 14])
  }
  emit('toggle')
}
</script>

<template>
  <div
    ref="root"
    class="pc-card relative overflow-hidden p-4 transition-all duration-500"
    :class="connected && 'border-lime-400/50 bg-lime-400/[0.08]'"
  >
    <div class="flex items-center gap-3.5">
      <PcAvatar :player="player" :size="54" :ring="connected ? 'lime' : 'cream'" />

      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-1.5">
          <p class="truncate font-display text-lg text-cream">
            {{ player.name }}
          </p>
          <span
            v-if="mutual && connected"
            class="shrink-0 rounded-md bg-[color:var(--color-berry)]/20 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-[color:var(--color-berry)]"
          >Match!</span>
        </div>
        <p v-if="player.bio" class="truncate text-[0.8rem] text-cream/55">
          {{ player.bio }}
        </p>
        <p v-else-if="player.age" class="text-[0.8rem] text-cream/55">
          {{ player.age }} jaar
        </p>
      </div>

      <button
        type="button" :disabled="busy"
        class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl transition-all duration-400 active:scale-90 disabled:opacity-50"
        :class="connected
          ? 'bg-linear-to-br from-lime-300 to-lime-500 text-navy-900 shadow-[0_8px_22px_-8px_color-mix(in_oklab,var(--color-lime-400)_90%,transparent)]'
          : 'border border-cream/20 bg-cream/8 text-cream hover:border-lime-400/60 hover:text-lime-300'"
        :aria-label="connected ? `${player.name} verwijderen uit je connecties` : `Connecteer met ${player.name}`"
        @click="onClick"
      >
        <PcIcon :name="connected ? 'check' : 'plus'" :size="22" :stroke="2.6" />
      </button>
    </div>

    <div v-if="common.slots.length || common.hobbies.length" class="mt-3 flex flex-wrap gap-1.5 border-t border-cream/8 pt-3">
      <span
        v-for="slot in common.slots" :key="slot"
        class="rounded-md bg-lime-400/12 px-2.5 py-1 text-[0.68rem] font-semibold text-lime-200"
      >
        <PcIcon name="clock" :size="11" class="mr-1 inline align-[-1px]" />{{ slot }}
      </span>
      <span
        v-for="hobby in common.hobbies" :key="hobby"
        class="rounded-md bg-cream/8 px-2.5 py-1 text-[0.68rem] font-semibold text-cream/65"
      >{{ hobby }}</span>
    </div>
  </div>
</template>
