<script setup lang="ts">
const store = usePadelStore()
const mode = useBackendMode()

onMounted(() => {
  store.start()
  watch(() => [store.ready, store.playerId] as const, ([ready, playerId]) => {
    if (ready && playerId) navigateTo('/app')
  }, { immediate: true })
})

const HIGHLIGHTS = [
  { icon: 'users', title: 'Iedereen tegen iedereen', text: 'Elke ronde loten we nieuwe teams van 4.' },
  { icon: 'clock', title: 'Gematcht op jouw agenda', text: 'Je speelt met mensen die op dezelfde momenten vrij zijn.' },
  { icon: 'link', title: 'Connecteer na de match', text: 'Klik, en je hebt hun nummer én speeluren.' },
]
</script>

<template>
  <main class="relative mx-auto flex min-h-dvh max-w-xl flex-col px-5 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))] lg:max-w-6xl lg:px-10">
    <!-- floating padel balls -->
    <div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <span class="animate-float absolute -right-10 top-24 h-40 w-40 rounded-full bg-lime-400/20 blur-2xl" />
      <span class="animate-float absolute -left-16 top-[55%] h-52 w-52 rounded-full bg-[color:var(--color-sky)]/12 blur-3xl" style="animation-delay:-2.5s" />
      <span class="animate-float absolute right-8 bottom-24 h-24 w-24 rounded-full bg-lime-300/15 blur-xl" style="animation-delay:-4s" />
    </div>

    <header class="flex items-center justify-between">
      <BrandMark variant="word" size="sm" />
      <NuxtLink
        to="/privacy"
        class="flex items-center gap-1.5 rounded-lg border border-cream/14 px-3 py-1.5 text-[0.7rem] font-semibold text-cream/60 transition-colors hover:text-cream"
      >
        <PcIcon name="shield" :size="13" />Privacy
      </NuxtLink>
    </header>

    <SetupNotice class="mt-5" />

    <section class="flex flex-1 flex-col justify-center py-10 lg:grid lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-16 lg:py-16">
      <div class="lg:order-2 animate-pop">
        <BrandMark variant="badge" size="lg" class="mx-auto lg:w-full lg:max-w-sm" />
      </div>

      <div class="lg:order-1">
      <!-- Flex-wrap, not inline spans: Vue's compiler strips the whitespace
           between elements, which glued the three words into one unbreakable
           token that overflowed at phone width. -->
      <h1
        class="animate-rise mt-9 flex flex-wrap justify-center gap-x-3 font-display text-[clamp(2.4rem,11vw,3.75rem)] leading-[0.88] lg:mt-0 lg:justify-start lg:text-[4.25rem]"
        style="animation-delay:.08s"
      >
        <span class="text-cream">MEET.</span>
        <span class="text-lime-400">PLAY.</span>
        <span class="bg-linear-to-r from-[color:var(--color-berry)] to-[color:var(--color-flame)] bg-clip-text text-transparent">PARTY.</span>
      </h1>

      <p class="animate-rise mx-auto mt-5 max-w-sm text-center text-[0.98rem] leading-relaxed text-cream/70 lg:mx-0 lg:max-w-md lg:text-left lg:text-lg" style="animation-delay:.16s">
        Eén dag padel, acht velden en een pak nieuwe speelpartners.
        Maak je profiel, speel je rondes en hou de mensen bij die je leuk vindt.
      </p>

      <div class="animate-rise mt-9 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start" style="animation-delay:.24s">
        <NuxtLink to="/register" class="pc-btn pc-btn-primary w-full text-base sm:w-auto sm:px-8">
          <PcIcon name="sparkles" :size="18" />
          Maak je profiel
        </NuxtLink>
        <NuxtLink to="/login" class="pc-btn pc-btn-ghost w-full sm:w-auto sm:px-8">
          Ik heb al een pincode
          <PcIcon name="arrowRight" :size="17" />
        </NuxtLink>
      </div>
      </div>
    </section>

    <section class="pc-stagger space-y-2.5 lg:grid lg:grid-cols-3 lg:gap-4 lg:space-y-0">
      <div
        v-for="item in HIGHLIGHTS" :key="item.title"
        class="pc-card flex items-center gap-3.5 p-3.5 lg:flex-col lg:items-start lg:gap-3 lg:p-5"
      >
        <span class="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-lime-400/15 text-lime-300">
          <PcIcon :name="item.icon" :size="20" />
        </span>
        <div class="min-w-0">
          <p class="font-display text-[0.95rem] font-bold text-cream">
            {{ item.title }}
          </p>
          <p class="text-[0.82rem] leading-snug text-cream/60">
            {{ item.text }}
          </p>
        </div>
      </div>
    </section>

    <footer class="mt-8 flex flex-col items-center gap-2 text-center">
      <NuxtLink
        to="/manage"
        class="flex items-center gap-1.5 text-[0.72rem] font-semibold uppercase tracking-widest text-cream/35 transition-colors hover:text-lime-300"
      >
        <PcIcon name="settings" :size="13" />Crew
      </NuxtLink>
      <p v-if="mode === 'demo'" class="text-[0.68rem] text-cream/30">
        Demomodus — alle gegevens blijven op dit toestel.
      </p>
    </footer>
  </main>
</template>
