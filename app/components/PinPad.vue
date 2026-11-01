<script setup lang="ts">
const model = defineModel<string>({ default: '' })
const props = withDefaults(defineProps<{
  length?: number
  shake?: boolean
  tone?: 'lime' | 'cream'
  autoSubmit?: boolean
}>(), { length: 4, shake: false, tone: 'lime', autoSubmit: true })

const emit = defineEmits<{ complete: [value: string] }>()
const { buzz } = useCelebrate()

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del']

function press(key: string) {
  if (key === '') return
  if (key === 'del') {
    model.value = model.value.slice(0, -1)
    buzz(6)
    return
  }
  if (model.value.length >= props.length) return
  // `defineModel` reads back through the prop, which only updates after the
  // parent re-renders — so work from `next`, not from `model.value`.
  const next = model.value + key
  model.value = next
  buzz(10)
  if (props.autoSubmit && next.length === props.length) emit('complete', next)
}

function onKeydown(event: KeyboardEvent) {
  if (/^\d$/.test(event.key)) press(event.key)
  else if (event.key === 'Backspace') press('del')
  else if (event.key === 'Enter' && model.value.length === props.length) emit('complete', model.value)
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

const dots = computed(() => Array.from({ length: props.length }, (_, i) => i < model.value.length))
</script>

<template>
  <div class="flex w-full flex-col items-center gap-8">
    <div
      class="flex gap-4" :class="shake && 'animate-[pc-shake_0.45s_ease]'"
      role="status" :aria-label="`${model.length} van ${length} cijfers ingevuld`"
    >
      <span
        v-for="(filled, i) in dots" :key="i"
        class="h-4 w-4 rounded-full transition-all duration-300"
        :class="filled
          ? (tone === 'lime'
            ? 'scale-110 bg-lime-400 shadow-[0_0_16px_color-mix(in_oklab,var(--color-lime-400)_80%,transparent)]'
            : 'scale-110 bg-ink')
          : 'bg-current opacity-20'"
      />
    </div>

    <div class="grid w-full max-w-[16rem] grid-cols-3 gap-3">
      <button
        v-for="(key, i) in KEYS" :key="i" type="button"
        :disabled="key === ''"
        :aria-label="key === 'del' ? 'Wissen' : key"
        class="relative grid aspect-square place-items-center rounded-full font-display text-2xl font-extrabold transition-all duration-200 active:scale-90 disabled:pointer-events-none disabled:opacity-0"
        :class="tone === 'lime'
          ? 'border border-cream/12 bg-cream/[0.06] text-cream hover:border-lime-400/50 hover:bg-cream/12'
          : 'border border-ink/12 bg-ink/[0.04] text-ink hover:bg-ink/10'"
        @click="press(key)"
      >
        <PcIcon v-if="key === 'del'" name="arrowLeft" :size="22" />
        <span v-else>{{ key }}</span>
      </button>
    </div>
  </div>
</template>

<style>
@keyframes pc-shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-9px); }
  40% { transform: translateX(8px); }
  60% { transform: translateX(-5px); }
  80% { transform: translateX(3px); }
}
</style>
