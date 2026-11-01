<script setup lang="ts">
import { BackendError } from '~/lib/backend'

const store = usePadelStore()
const { buzz, burst } = useCelebrate()

const pin = ref('')
const busy = ref(false)
const shake = ref(false)
const error = ref('')

onMounted(() => {
  store.start()
  watch(() => [store.ready, store.playerId] as const, ([ready, playerId]) => {
    if (ready && playerId) navigateTo('/app')
  }, { immediate: true })
})

async function submit(value: string) {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    await store.login(value)
    void burst({ particles: 60, origin: { x: 0.5, y: 0.5 } })
    await navigateTo('/app')
  }
  catch (caught) {
    error.value = caught instanceof BackendError ? caught.message : 'Inloggen mislukt.'
    shake.value = true
    buzz([24, 40, 24])
    setTimeout(() => {
      shake.value = false
      pin.value = ''
    }, 450)
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <main
    class="mx-auto flex min-h-dvh max-w-sm flex-col px-5 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))]
           lg:my-14 lg:min-h-[38rem] lg:rounded-3xl lg:border lg:border-cream/12 lg:bg-navy-900/35 lg:px-8 lg:py-8 lg:shadow-[0_40px_90px_-50px_rgba(0,0,0,0.95)] lg:backdrop-blur-2xl">
    <NuxtLink to="/" class="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-cream/55 transition-colors hover:text-cream">
      <PcIcon name="arrowLeft" :size="17" />Terug
    </NuxtLink>

    <SetupNotice class="mt-5" />

    <div class="flex flex-1 flex-col items-center justify-center gap-10 py-8">
      <div class="text-center">
        <span class="pc-label">Welkom terug</span>
        <h1 class="mt-2 font-display text-4xl text-cream">
          Je pincode
        </h1>
        <p class="mt-2.5 text-sm text-cream/55">
          De 4 cijfers die je bij je inschrijving koos.
        </p>
      </div>

      <PinPad v-model="pin" :shake="shake" @complete="submit" />

      <div class="min-h-[3.5rem] text-center">
        <Transition name="pop">
          <p v-if="error" class="text-sm font-semibold text-[color:var(--color-flame)]">
            {{ error }}
          </p>
        </Transition>
        <p v-if="busy" class="text-sm text-cream/50">
          Even kijken…
        </p>
      </div>
    </div>

    <NuxtLink to="/register" class="pc-btn pc-btn-ghost w-full">
      Nog geen profiel? Begin hier
      <PcIcon name="arrowRight" :size="17" />
    </NuxtLink>
  </main>
</template>
