<script setup lang="ts">
const store = usePadelStore()
const route = useRoute()
const { buzz } = useCelebrate()

onMounted(() => store.start())

/** A fresh draw is the moment that matters: take everyone straight to their
 *  court. Only on an actual change — never on the first load. */
watch(() => store.round?.id, (id, previous) => {
  if (!id || previous === undefined || id === previous) return
  if (store.round?.status !== 'playing') return
  buzz([20, 60, 20])
  if (route.path !== '/app/match') navigateTo('/app/match')
})

const STATUS: Record<string, string> = {
  idle: 'Het event moet nog starten',
  waiting: 'Tussen twee rondes',
  playing: 'Je staat op het veld',
  'match-done': 'Je match zit erop',
  connecting: 'Tijd om te connecteren',
  bench: 'Rustronde',
  ended: 'Het event is afgelopen',
}
</script>

<template>
  <div class="pc-shell">
    <div class="pc-aurora" />
    <div class="pc-grain" />

    <ConnectionBanner v-if="store.connectionError" :message="store.connectionError" />

    <!-- Phone-first, but on a laptop the column sits in a real frame next to
         the live status instead of floating in an empty void. -->
    <div class="lg:mx-auto lg:flex lg:min-h-dvh lg:max-w-5xl lg:items-center lg:gap-12 lg:px-8 lg:py-10">
      <aside class="hidden lg:flex lg:w-full lg:flex-col lg:gap-7">
        <BrandMark variant="badge" size="md" />

        <div>
          <p class="pc-label">
            {{ store.round ? `Ronde ${store.round.index}` : 'Padel Connect' }}
          </p>
          <h2 class="mt-2 max-w-sm font-display text-4xl leading-[0.95] text-cream">
            {{ STATUS[store.phase] ?? 'Meet. Play. Party.' }}
          </h2>
        </div>

        <dl class="flex gap-8">
          <div>
            <dt class="text-[0.7rem] font-semibold uppercase tracking-wider text-cream/40">
              Spelers
            </dt>
            <dd class="font-display text-3xl text-lime-400">
              {{ store.players.filter(p => p.present).length }}
            </dd>
          </div>
          <div>
            <dt class="text-[0.7rem] font-semibold uppercase tracking-wider text-cream/40">
              Jouw rondes
            </dt>
            <dd class="font-display text-3xl text-lime-400">
              {{ store.me?.roundsPlayed ?? 0 }}
            </dd>
          </div>
          <div>
            <dt class="text-[0.7rem] font-semibold uppercase tracking-wider text-cream/40">
              Connecties
            </dt>
            <dd class="font-display text-3xl text-lime-400">
              {{ store.friends.length }}
            </dd>
          </div>
        </dl>

        <NuxtLink to="/privacy" class="flex w-fit items-center gap-1.5 text-[0.78rem] font-semibold text-cream/40 transition-colors hover:text-lime-300">
          <PcIcon name="shield" :size="14" />Privacyverklaring
        </NuxtLink>
      </aside>

      <div
        class="pb-[calc(5.75rem+var(--bottom-safe))] lg:flex lg:h-[min(46rem,86dvh)] lg:w-[26rem] lg:shrink-0 lg:flex-col lg:overflow-hidden lg:rounded-3xl lg:border lg:border-cream/12 lg:bg-navy-900/35 lg:pb-0 lg:shadow-[0_40px_90px_-50px_rgba(0,0,0,0.95)] lg:backdrop-blur-2xl"
      >
        <div class="lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain">
          <slot />
        </div>
        <BottomNav />
      </div>
    </div>

    <ToastHost />
  </div>
</template>
