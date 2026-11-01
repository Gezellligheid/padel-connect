<script setup lang="ts">
definePageMeta({ layout: 'app' })

const store = useRequirePlayer()
const now = useClock()
const { burst, buzz } = useCelebrate()

/* ── live scoreboard (optimistic, synced through the backend) ───────────── */

const localScore = ref<[number, number] | null>(null)
const score = computed<[number, number]>(() => localScore.value ?? store.myMatch?.score ?? [0, 0])
let pushTimer: ReturnType<typeof setTimeout> | undefined

watch(() => store.myMatch?.score, (incoming) => {
  // Someone else on the court changed it — take theirs unless we're mid-tap.
  if (!pushTimer && incoming) localScore.value = null
})

function bump(team: 0 | 1, delta: number) {
  const next: [number, number] = [...score.value] as [number, number]
  next[team] = Math.max(0, Math.min(99, next[team] + delta))
  localScore.value = next
  buzz(10)
  clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    pushTimer = undefined
    void store.setScore(next)
  }, 320)
}

onBeforeUnmount(() => clearTimeout(pushTimer))

/* ── finishing ──────────────────────────────────────────────────────────── */

const iFinished = computed(() =>
  Boolean(store.playerId && store.myMatch?.finishedBy.includes(store.playerId)))

const finishedCount = computed(() => store.myMatch?.finishedBy.length ?? 0)
const busy = ref(false)

async function toggleFinish() {
  if (busy.value) return
  busy.value = true
  const result = await store.setFinished(!iFinished.value)
  if (result && !iFinished.value) buzz(16)
  busy.value = false
}

watch(() => store.myMatch?.status, (status, previous) => {
  if (status === 'finished' && previous === 'playing') {
    void burst({ particles: 120, spread: 100 })
    buzz([20, 50, 20])
  }
})

const elapsed = computed(() => {
  if (!store.myMatch) return ''
  const end = store.myMatch.endedAt ?? now.value
  return formatDuration(end - store.myMatch.startedAt)
})

const target = computed(() => store.event.settings.gamesToWin)

/* ── connecting ─────────────────────────────────────────────────────────── */

const canConnect = computed(() =>
  store.phase === 'connecting' || store.phase === 'match-done' || store.phase === 'ended')

const connectBusy = ref<string | null>(null)

async function toggleConnect(id: string) {
  connectBusy.value = id
  if (store.friendIds.has(id)) await store.disconnect(id)
  else await store.connect(id)
  connectBusy.value = null
}
</script>

<template>
  <main class="mx-auto max-w-xl px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
    <header class="flex items-center justify-between gap-3">
      <NuxtLink to="/app" class="grid h-10 w-10 place-items-center rounded-full bg-cream/8 text-cream/70 transition-colors hover:bg-cream/14 hover:text-cream" aria-label="Terug">
        <PcIcon name="arrowLeft" :size="19" />
      </NuxtLink>
      <p class="font-display text-sm font-bold uppercase tracking-widest text-cream/50">
        {{ store.round ? `Ronde ${store.round.index}` : 'Match' }}
      </p>
      <span class="w-10" />
    </header>

    <!-- ══ geen ronde ═══════════════════════════════════════════════════ -->
    <section v-if="!store.round || store.phase === 'idle' || store.phase === 'waiting'" class="mt-16 flex flex-col items-center gap-5 text-center">
      <span class="grid h-20 w-20 place-items-center rounded-full bg-cream/6 text-cream/40">
        <PcIcon name="clock" :size="34" />
      </span>
      <h1 class="font-display text-3xl text-cream">
        Nog even geduld
      </h1>
      <p class="max-w-xs text-cream/60">
        Er loopt op dit moment geen ronde. Zodra de crew loot, verschijnt je veld hier automatisch.
      </p>
      <NuxtLink to="/app" class="pc-btn pc-btn-ghost mt-2">
        Terug naar start
      </NuxtLink>
    </section>

    <!-- ══ bank ═════════════════════════════════════════════════════════ -->
    <section v-else-if="store.phase === 'bench'" class="mt-8">
      <div class="pc-card relative overflow-hidden p-6 text-center">
        <span class="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[color:var(--color-sky)]/15 blur-2xl" />
        <span class="grid h-16 w-16 mx-auto place-items-center rounded-full bg-[color:var(--color-sky)]/15 text-[color:var(--color-sky)]">
          <PcIcon name="clock" :size="28" />
        </span>
        <h1 class="mt-4 font-display text-3xl text-cream">
          Rustronde
        </h1>
        <p class="mt-2.5 text-cream/65">
          Er zijn meer spelers dan plekken op de {{ store.event.settings.fieldCount }} velden.
          Jij staat volgende ronde vooraan in de rij — beloofd.
        </p>
        <div class="mt-5 flex flex-wrap justify-center gap-2">
          <span class="pc-chip cursor-default"><PcIcon name="fire" :size="14" />Blazepods challenge</span>
          <span class="pc-chip cursor-default"><PcIcon name="bolt" :size="14" />Snelheidsdoek</span>
          <span class="pc-chip cursor-default"><PcIcon name="users" :size="14" />Iets drinken</span>
        </div>
      </div>

      <h2 class="mt-7 mb-3 font-display text-xl text-cream">
        Wie staat er op het veld?
      </h2>
      <div class="space-y-2.5">
        <div v-for="match in store.matches" :key="match.id" class="pc-card flex items-center gap-3 p-3">
          <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-lime-400/12 font-display text-lg font-extrabold text-lime-300">
            {{ match.field }}
          </span>
          <div class="flex -space-x-2">
            <PcAvatar v-for="id in match.playerIds" :key="id" :player="store.byId.get(id)" :size="30" ring="cream" />
          </div>
          <span class="ml-auto text-[0.75rem] font-semibold" :class="match.status === 'finished' ? 'text-lime-400' : 'text-cream/45'">
            {{ match.status === 'finished' ? 'Klaar' : `${match.score[0]} – ${match.score[1]}` }}
          </span>
        </div>
      </div>
    </section>

    <!-- ══ spelen / klaar ═══════════════════════════════════════════════ -->
    <template v-else-if="store.myMatch">
      <!-- veldnummer -->
      <section class="mt-6 text-center">
        <p class="pc-label">
          Jouw veld
        </p>
        <div class="relative mx-auto mt-2 w-fit">
          <span
            v-if="store.myMatch.status === 'playing'"
            class="absolute inset-0 rounded-full bg-lime-400/25"
            style="animation: pc-pulse-ring 2.4s var(--ease-out-soft) infinite"
          />
          <p class="relative font-display text-[6rem] leading-none text-lime-400 drop-shadow-[0_0_30px_color-mix(in_oklab,var(--color-lime-400)_45%,transparent)]">
            {{ store.myMatch.field }}
          </p>
        </div>
        <p class="mt-1 font-display text-lg text-cream/80">
          {{ store.myMatch.fieldName }}
        </p>
        <p class="mt-1 flex items-center justify-center gap-1.5 text-sm text-cream/45">
          <PcIcon name="clock" :size="14" />{{ elapsed }}
          <span class="mx-1 text-cream/20">·</span>
          <span>tot {{ target }} punten</span>
        </p>
      </section>

      <!-- court -->
      <section class="mt-6">
        <CourtVisual :match="store.myMatch" :resolve="id => store.byId.get(id)" :highlight-id="store.playerId" />
      </section>

      <!-- scorebord -->
      <section v-if="store.myMatch.status === 'playing'" class="mt-5">
        <div class="pc-card grid grid-cols-[1fr_auto_1fr] items-center gap-2 p-4">
          <div v-for="team in [0, 1] as const" :key="team" :class="team === 1 && 'order-3'">
            <p
              class="text-center font-display text-[0.6rem] font-bold uppercase tracking-[0.2em]"
              :class="store.myTeamIndex === team ? 'text-lime-300' : 'text-cream/40'"
            >
              {{ team === 0 ? 'Team A' : 'Team B' }}{{ store.myTeamIndex === team ? ' · jij' : '' }}
            </p>
            <p class="text-center font-display text-5xl tabular-nums text-cream">
              {{ score[team] }}
            </p>
            <div class="mt-2 flex justify-center gap-2">
              <button
                type="button" class="grid h-9 w-9 place-items-center rounded-xl bg-cream/8 text-cream/70 transition-transform active:scale-90 hover:bg-cream/14"
                :aria-label="`Punt eraf bij team ${team === 0 ? 'A' : 'B'}`" @click="bump(team, -1)"
              >
                <PcIcon name="x" :size="15" />
              </button>
              <button
                type="button" class="grid h-9 w-9 place-items-center rounded-xl bg-lime-400/85 text-navy-900 transition-transform active:scale-90 hover:bg-lime-400"
                :aria-label="`Punt erbij voor team ${team === 0 ? 'A' : 'B'}`" @click="bump(team, 1)"
              >
                <PcIcon name="plus" :size="16" :stroke="2.6" />
              </button>
            </div>
          </div>
          <span class="order-2 font-display text-2xl text-cream/25">–</span>
        </div>
        <p class="mt-2 text-center text-[0.75rem] text-cream/40">
          Iedereen op dit veld ziet dezelfde score, live.
        </p>
      </section>

      <!-- klaar-knop -->
      <section v-if="store.myMatch.status === 'playing'" class="mt-5">
        <button
          type="button" class="pc-btn w-full text-base" :disabled="busy"
          :class="iFinished ? 'pc-btn-ghost' : 'pc-btn-primary'"
          @click="toggleFinish"
        >
          <PcIcon :name="iFinished ? 'x' : 'flag'" :size="18" />
          {{ iFinished ? 'Toch nog even door' : 'Wij zijn klaar' }}
        </button>

        <div class="mt-3.5 flex items-center justify-center gap-2.5">
          <div v-for="id in store.myMatch.playerIds" :key="id" class="relative">
            <PcAvatar
              :player="store.byId.get(id)" :size="34"
              :ring="store.myMatch.finishedBy.includes(id) ? 'lime' : 'cream'"
            />
            <span
              v-if="store.myMatch.finishedBy.includes(id)"
              class="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-lime-400 text-navy-900"
            >
              <PcIcon name="check" :size="10" :stroke="3.4" />
            </span>
          </div>
        </div>
        <p class="mt-2 text-center text-[0.78rem] text-cream/45">
          {{ finishedCount }} van 4 spelers zijn klaar — de match stopt als iedereen bevestigt.
        </p>
      </section>

      <!-- ══ connecteren ═══════════════════════════════════════════════ -->
      <section v-if="canConnect" class="mt-8">
        <div class="mb-4 flex items-start gap-3 rounded-2xl border border-[color:var(--color-berry)]/30 bg-[color:var(--color-berry)]/10 p-4">
          <PcIcon name="heart" :size="19" class="mt-0.5 shrink-0 text-[color:var(--color-berry)]" />
          <div>
            <p class="font-display text-base text-cream">
              Met wie wil je nog eens spelen?
            </p>
            <p class="mt-0.5 text-[0.84rem] leading-snug text-cream/60">
              Voeg ze toe en je krijgt hun nummer en speelmomenten in je connecties.
            </p>
          </div>
        </div>

        <div class="space-y-3">
          <ConnectButton
            v-for="mate in store.myCourtMates" :key="mate.id"
            :player="mate" :me="store.me"
            :connected="store.friendIds.has(mate.id)"
            :mutual="store.admirerIds.has(mate.id)"
            :busy="connectBusy === mate.id"
            @toggle="toggleConnect(mate.id)"
          />
        </div>

        <div v-if="store.phase === 'match-done'" class="mt-5 flex items-center justify-center gap-2 text-sm text-cream/45">
          <PcIcon name="clock" :size="15" />
          <span>Nog {{ store.stillPlaying }} {{ store.stillPlaying === 1 ? 'veld' : 'velden' }} bezig</span>
        </div>
      </section>
    </template>

    <!-- ══ connect-fase zonder eigen match ══════════════════════════════ -->
    <section v-else class="mt-16 text-center">
      <h1 class="font-display text-3xl text-cream">
        Je speelde deze ronde niet mee
      </h1>
      <p class="mx-auto mt-2 max-w-xs text-cream/60">
        Volgende ronde sta je er zeker bij.
      </p>
    </section>

    <div class="h-8" />
  </main>
</template>
