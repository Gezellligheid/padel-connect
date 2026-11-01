<script setup lang="ts">
const props = withDefaults(defineProps<{ text: string, sub?: string, delay?: number }>(), { delay: 420 })

const typing = ref(true)
let timer: ReturnType<typeof setTimeout> | undefined

function run() {
  typing.value = true
  clearTimeout(timer)
  timer = setTimeout(() => (typing.value = false), props.delay)
}

onMounted(run)
watch(() => props.text, run)
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div class="flex items-start gap-3">
    <span class="mt-0.5 grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-cream p-1.5">
      <img src="/logo-transparent.png" alt="" class="w-full" width="517" height="306">
    </span>

    <div class="min-w-0 flex-1">
      <Transition name="pop" mode="out-in">
        <div
          v-if="typing" key="typing"
          class="inline-flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-navy-800/80 px-4 py-4"
        >
          <span
            v-for="i in 3" :key="i"
            class="h-2 w-2 animate-bounce rounded-full bg-lime-300/80"
            :style="{ animationDelay: `${i * 0.12}s`, animationDuration: '0.9s' }"
          />
        </div>

        <div v-else key="text" class="rounded-2xl rounded-tl-sm bg-navy-800/80 px-4 py-3.5 backdrop-blur-sm">
          <p class="font-display text-[1.35rem] leading-tight text-cream">
            {{ text }}
          </p>
          <p v-if="sub" class="mt-1.5 text-[0.85rem] leading-snug text-cream/55">
            {{ sub }}
          </p>
        </div>
      </Transition>
    </div>
  </div>
</template>
