<script setup lang="ts">
const { toasts, dismiss } = useToast()

const TONES = {
  info: 'border-cream/20 bg-navy-800/90 text-cream',
  success: 'border-lime-400/50 bg-lime-400/15 text-lime-100',
  error: 'border-[color:var(--color-flame)]/50 bg-[color:var(--color-flame)]/12 text-[color:var(--color-flame)]',
}

const ICONS = { info: 'info', success: 'check', error: 'x' }
</script>

<template>
  <Teleport to="body">
    <div class="pointer-events-none fixed inset-x-0 top-0 z-[90] flex flex-col items-center gap-2 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <TransitionGroup name="pop">
        <button
          v-for="toast in toasts" :key="toast.id"
          type="button"
          class="pointer-events-auto flex w-full max-w-sm items-center gap-2.5 rounded-2xl border px-4 py-3 text-left text-sm font-semibold backdrop-blur-xl shadow-[0_18px_40px_-18px_rgba(0,0,0,0.9)]"
          :class="TONES[toast.tone]"
          @click="dismiss(toast.id)"
        >
          <PcIcon :name="ICONS[toast.tone]" :size="18" />
          <span class="flex-1">{{ toast.message }}</span>
        </button>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
