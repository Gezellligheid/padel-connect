<script setup lang="ts">
definePageMeta({ layout: 'crew' })
useHead({ title: 'Crew — Padel Connect' })

const crew = useCrewStore()
const now = useClock()
const { rain } = useCelebrate()

onMounted(() => crew.start())
onBeforeUnmount(() => crew.dispose())

const TABS = [
  { key: 'live', label: 'Live', icon: 'grid' },
  { key: 'players', label: 'Spelers', icon: 'users' },
  { key: 'network', label: 'Connecties', icon: 'link' },
  { key: 'settings', label: 'Instellingen', icon: 'settings' },
] as const

const tab = ref<typeof TABS[number]['key']>('live')

const roundState = computed(() => crew.round?.status ?? 'none')

const eventClock = computed(() => {
  if (!crew.event.startedAt) return null
  const end = crew.event.endedAt ?? now.value
  const minutes = Math.floor((end - crew.event.startedAt) / 60000)
  return `${Math.floor(minutes / 60)}u ${String(minutes % 60).padStart(2, '0')}m`
})

const canStartRound = computed(() =>
  crew.event.status === 'live'
  && crew.present.length >= 4
  && roundState.value !== 'playing')

async function startRound() {
  const result = await crew.startRound()
  if (result) void rain(1200)
}

async function endEvent() {
  await crew.endEvent()
}
</script>

<template>
  <div v-if="!crew.authed">
    <CrewLogin />
  </div>

  <div v-else class="mx-auto max-w-7xl px-4 pb-16 pt-5 sm:px-6">
    <!-- ── header ───────────────────────────────────────────────────────── -->
    <header class="flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <img src="/logo.png" alt="Padel Connect" class="w-28" width="517" height="306">
        <div class="border-l border-ink/12 pl-3">
          <p class="font-display text-[0.65rem] font-bold uppercase tracking-[0.18em] text-ink/40">
            Crew dashboard
          </p>
          <p class="font-display text-lg leading-tight text-ink">
            {{ crew.event.status === 'live' ? 'Event loopt' : crew.event.status === 'ended' ? 'Event afgelopen' : 'Nog niet gestart' }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <span
          class="flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-bold"
          :class="crew.event.status === 'live' ? 'bg-lime-500/18 text-lime-700' : 'bg-ink/8 text-ink/50'"
        >
          <span v-if="crew.event.status === 'live'" class="relative flex h-2 w-2">
            <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-600" />
            <span class="relative inline-flex h-2 w-2 rounded-full bg-lime-600" />
          </span>
          {{ eventClock ?? 'Klaar om te starten' }}
        </span>
        <button
          type="button" class="flex items-center gap-1.5 rounded-lg border border-ink/14 px-3.5 py-2 text-sm font-semibold text-ink/60 transition-colors hover:border-ink/30 hover:text-ink"
          @click="crew.logout()"
        >
          <PcIcon name="logout" :size="15" />Afmelden
        </button>
      </div>
    </header>

    <!-- ── commandobalk ─────────────────────────────────────────────────── -->
    <section class="mt-5 rounded-3xl border border-ink/10 bg-navy-900 p-5 text-cream shadow-[0_24px_60px_-40px_rgba(0,31,66,0.9)]">
      <div class="grid gap-5 lg:grid-cols-[1fr_auto]">
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p class="font-display text-4xl text-lime-400">
              {{ crew.present.length }}
            </p>
            <p class="text-[0.68rem] font-bold uppercase tracking-wider text-cream/45">
              Aanwezig <span class="text-cream/25">/ {{ crew.players.length }}</span>
            </p>
          </div>
          <div>
            <p class="font-display text-4xl text-lime-400">
              {{ crew.event.roundCount }}
            </p>
            <p class="text-[0.68rem] font-bold uppercase tracking-wider text-cream/45">
              Rondes
            </p>
          </div>
          <div>
            <p class="font-display text-4xl text-lime-400">
              {{ crew.stats.courtsBusy }}<span class="text-cream/25">/{{ crew.event.settings.fieldCount }}</span>
            </p>
            <p class="text-[0.68rem] font-bold uppercase tracking-wider text-cream/45">
              Velden bezig
            </p>
          </div>
          <div>
            <p class="font-display text-4xl text-[color:var(--color-berry)]">
              {{ crew.stats.connections }}
            </p>
            <p class="text-[0.68rem] font-bold uppercase tracking-wider text-cream/45">
              Connecties
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 lg:justify-end">
          <button
            v-if="crew.event.status === 'idle'" type="button" class="pc-btn pc-btn-primary"
            :disabled="crew.busy" @click="crew.startEvent()"
          >
            <PcIcon name="play" :size="18" />Start event
          </button>

          <template v-else-if="crew.event.status === 'live'">
            <button
              v-if="roundState !== 'playing'" type="button" class="pc-btn pc-btn-primary"
              :disabled="!canStartRound || crew.busy" @click="startRound"
            >
              <PcIcon name="refresh" :size="18" />
              {{ crew.event.roundCount ? 'Volgende ronde' : 'Start ronde 1' }}
            </button>
            <button
              v-else type="button" class="pc-btn pc-btn-ghost !border-cream/25"
              :disabled="crew.busy" @click="crew.endRound()"
            >
              <PcIcon name="flag" :size="18" />Stop ronde
            </button>

            <button
              v-if="roundState === 'connecting'" type="button" class="pc-btn pc-btn-ghost !border-cream/25"
              :disabled="crew.busy" @click="crew.closeRound()"
            >
              <PcIcon name="check" :size="17" />Sluit connectfase
            </button>

            <button type="button" class="pc-btn pc-btn-danger" :disabled="crew.busy" @click="endEvent">
              <PcIcon name="pause" :size="17" />Stop event
            </button>
          </template>

          <button
            v-else type="button" class="pc-btn pc-btn-ghost !border-cream/25"
            :disabled="crew.busy" @click="crew.reopenEvent()"
          >
            <PcIcon name="play" :size="17" />Heropen event
          </button>
        </div>
      </div>

      <!-- hints -->
      <p
        v-if="crew.event.status === 'live' && crew.present.length < 4"
        class="mt-4 flex items-center gap-2 rounded-xl bg-[color:var(--color-flame)]/15 px-3.5 py-2.5 text-sm text-[color:var(--color-flame)]"
      >
        <PcIcon name="info" :size="16" />Je hebt minstens 4 aanwezige spelers nodig om te loten.
      </p>
      <p
        v-else-if="crew.event.status === 'live' && roundState !== 'playing' && crew.benchPreview > 0"
        class="mt-4 flex items-center gap-2 rounded-xl bg-cream/8 px-3.5 py-2.5 text-sm text-cream/70"
      >
        <PcIcon name="info" :size="16" />
        Volgende loting: {{ crew.seated }} spelers op {{ Math.ceil(crew.seated / 4) }} velden,
        {{ crew.benchPreview }} op de bank. Wie nu rust, krijgt straks voorrang.
      </p>
      <p
        v-else-if="roundState === 'connecting'"
        class="mt-4 flex items-center gap-2 rounded-xl bg-[color:var(--color-berry)]/18 px-3.5 py-2.5 text-sm text-[color:var(--color-berry)]"
      >
        <PcIcon name="heart" :size="16" />
        Alle velden zijn klaar — spelers kunnen nu connecteren. Start de volgende ronde wanneer je wil.
      </p>
    </section>

    <!-- ── tabs ─────────────────────────────────────────────────────────── -->
    <nav class="mt-6 flex gap-1 overflow-x-auto rounded-2xl bg-ink/6 p-1">
      <button
        v-for="item in TABS" :key="item.key" type="button"
        class="flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-300"
        :class="tab === item.key ? 'bg-white text-ink shadow-sm' : 'text-ink/50 hover:text-ink'"
        @click="tab = item.key"
      >
        <PcIcon :name="item.icon" :size="16" />{{ item.label }}
        <span
          v-if="item.key === 'network' && crew.stats.mutual"
          class="rounded-md bg-[color:var(--color-berry)]/15 px-1.5 text-[0.65rem] text-[color:var(--color-berry)]"
        >{{ crew.stats.mutual }}</span>
      </button>
    </nav>

    <!-- ── inhoud ───────────────────────────────────────────────────────── -->
    <div class="mt-6">
      <Transition name="pop" mode="out-in">
        <CrewFieldBoard v-if="tab === 'live'" key="live" />
        <CrewRoster v-else-if="tab === 'players'" key="players" />
        <CrewConnections v-else-if="tab === 'network'" key="network" />
        <CrewSettings v-else key="settings" />
      </Transition>
    </div>

    <footer class="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-5 text-[0.75rem] text-ink/40">
      <span>Padel Connect · crew dashboard</span>
      <span v-if="crew.backendMode === 'demo'" class="rounded-md bg-ink/6 px-2.5 py-1">Demomodus — data staat op dit toestel</span>
      <NuxtLink to="/privacy" class="underline-offset-4 hover:text-ink hover:underline">
        Privacyverklaring
      </NuxtLink>
    </footer>
  </div>
</template>
