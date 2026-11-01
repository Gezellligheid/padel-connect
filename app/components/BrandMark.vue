<script setup lang="ts">
/**
 * `badge`  — the real logo on its cream card, the way it appears in the deck.
 * `word`   — a typographic lockup for tight spots on dark backgrounds.
 */
withDefaults(defineProps<{ variant?: 'badge' | 'word', size?: 'sm' | 'md' | 'lg' }>(), {
  variant: 'word',
  size: 'md',
})

const WORD_SIZES = { sm: 'text-lg', md: 'text-2xl', lg: 'text-4xl sm:text-5xl' }
const BADGE_SIZES = { sm: 'w-28', md: 'w-40', lg: 'w-64' }
</script>

<template>
  <div v-if="variant === 'badge'" :class="BADGE_SIZES[size]" class="rounded-2xl bg-cream p-2.5 shadow-[0_18px_44px_-20px_rgba(0,0,0,0.8)]">
    <img src="/logo.png" alt="Padel Connect" class="w-full" width="517" height="306">
  </div>

  <div v-else class="inline-flex flex-col items-start leading-none">
    <span class="font-display font-black tracking-tight" :class="WORD_SIZES[size]">
      <span class="text-cream">PADEL</span><span class="text-lime-400">CONNECT</span>
    </span>
    <span
      class="mt-1 flex items-center gap-1.5 font-display text-[0.5em] font-bold uppercase tracking-[0.3em] text-lime-300/70"
    >
      Meet<span class="text-lime-400">•</span>Play<span class="text-lime-400">•</span>Party
    </span>
  </div>
</template>
