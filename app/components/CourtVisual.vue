<script setup lang="ts">
import type { Match, PlayerProfile } from '#shared/types'

const props = defineProps<{
  match: Match
  resolve: (id: string) => PlayerProfile | undefined
  highlightId?: string | null
  compact?: boolean
}>()

const teams = computed(() => props.match.teams.map(team => team.map(id => ({
  id,
  player: props.resolve(id),
  me: id === props.highlightId,
}))))
</script>

<template>
  <div class="pc-court grid grid-cols-2">
    <div
      v-for="(team, side) in teams" :key="side"
      class="relative flex flex-col items-center justify-center gap-2 p-2"
    >
      <span
        class="absolute top-1.5 font-display text-[0.55rem] font-bold uppercase tracking-[0.2em]"
        :class="side === 0 ? 'left-2 text-lime-300/70' : 'right-2 text-[color:var(--color-flame)]/70'"
      >{{ side === 0 ? 'Team A' : 'Team B' }}</span>

      <div class="flex items-center gap-2" :class="compact ? 'gap-1.5' : 'gap-3'">
        <div v-for="slot in team" :key="slot.id" class="flex flex-col items-center gap-1">
          <PcAvatar
            :player="slot.player" :size="compact ? 30 : 46"
            :ring="slot.me ? 'lime' : 'cream'" :glow="slot.me"
          />
          <span
            v-if="!compact"
            class="max-w-[4.6rem] truncate text-center text-[0.68rem] font-semibold"
            :class="slot.me ? 'text-lime-300' : 'text-cream/75'"
          >{{ slot.me ? 'Jij' : slot.player?.name.split(' ')[0] ?? '?' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
