<script setup lang="ts">
import { summariseAvailability } from '#shared/logic/availability'

definePageMeta({ layout: 'app' })

const store = useRequirePlayer()
const now = useClock()

const firstName = computed(() => store.me?.name.split(/\s+/)[0] ?? '')

const greeting = computed(() => {
  const hour = new Date(now.value).getHours()
  if (hour < 6) return 'Nog wakker'
  if (hour < 12) return 'Goeiemorgen'
  if (hour < 18) return 'Hey'
  return 'Goeieavond'
})

const HERO: Record<string, { tag: string, title: string, body: string, icon: string, tone: string }> = {
  loading: { tag: 'Even laden', title: 'Moment…', body: 'We halen de stand van zaken op.', icon: 'refresh', tone: 'neutral' },
  idle: { tag: 'Binnenkort', title: 'Het event moet nog starten', body: 'Zodra de crew op start duwt, krijg je hier je eerste veld te zien.', icon: 'clock', tone: 'neutral' },
  waiting: { tag: 'Tussen twee rondes', title: 'Even op adem komen', body: 'De crew loot zo de volgende ronde. Blijf in de buurt van de velden.', icon: 'clock', tone: 'neutral' },
  playing: { tag: 'Nu bezig', title: 'Je staat op het veld!', body: 'Je team en je veldnummer staan klaar.', icon: 'racket', tone: 'live' },
  'match-done': { tag: 'Match gespeeld', title: 'Mooi gespeeld!', body: 'Wacht tot de andere velden klaar zijn — daarna kan je connecteren.', icon: 'check', tone: 'done' },
  connecting: { tag: 'Connecteer', title: 'Met wie wil je nog eens spelen?', body: 'Voeg je speelpartners toe voor de volgende ronde begint.', icon: 'heart', tone: 'connect' },
  bench: { tag: 'Rustronde', title: 'Deze ronde zit je erbuiten', body: 'Er zijn meer spelers dan plekken. Volgende ronde sta jij vooraan in de rij.', icon: 'clock', tone: 'bench' },
  ended: { tag: 'Dat was het', title: 'Bedankt voor vandaag!', body: 'Je connecties blijven bewaard — spreek snel af.', icon: 'trophy', tone: 'done' },
  anonymous: { tag: '', title: 'Log in', body: '', icon: 'user', tone: 'neutral' },
}

const hero = computed(() => HERO[store.phase] ?? HERO.waiting!)

const TONE_RING: Record<string, string> = {
  live: 'from-[color:var(--color-flame)]/35 via-lime-400/25',
  connect: 'from-[color:var(--color-berry)]/35 via-lime-400/20',
  done: 'from-lime-400/30 via-lime-400/10',
  bench: 'from-[color:var(--color-sky)]/25 via-navy-600/30',
  neutral: 'from-lime-400/18 via-navy-600/25',
}

const availability = computed(() => (store.me ? summariseAvailability(store.me.availability) : []))
const roundLabel = computed(() => (store.round ? `Ronde ${store.round.index}` : 'Nog geen ronde'))
</script>

<template>
  <main class="mx-auto max-w-xl px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
    <!-- ── header ───────────────────────────────────────────────────────── -->
    <header class="flex items-center justify-between gap-3">
      <div class="min-w-0">
        <p class="text-[0.78rem] font-semibold text-cream/45">
          {{ greeting }},
        </p>
        <h1 class="truncate font-display text-3xl text-cream">
          {{ firstName || '…' }}
        </h1>
      </div>
      <NuxtLink to="/app/profile">
        <PcAvatar :player="store.me" :size="48" ring="lime" />
      </NuxtLink>
    </header>

    <!-- ── announcement ─────────────────────────────────────────────────── -->
    <Transition name="pop">
      <div
        v-if="store.event.settings.announcement"
        class="mt-5 flex items-start gap-2.5 rounded-2xl border border-lime-400/30 bg-lime-400/10 px-4 py-3 text-sm text-lime-100"
      >
        <PcIcon name="sparkles" :size="17" class="mt-0.5 shrink-0 text-lime-300" />
        <p>{{ store.event.settings.announcement }}</p>
      </div>
    </Transition>

    <!-- ── status hero ──────────────────────────────────────────────────── -->
    <section class="relative mt-5">
      <div
        class="absolute -inset-3 -z-10 rounded-3xl bg-linear-to-br to-transparent blur-2xl transition-all duration-700"
        :class="TONE_RING[hero.tone]"
      />
      <Transition name="pop" mode="out-in">
        <div :key="store.phase" class="pc-card overflow-hidden p-6">
          <div class="flex items-center gap-2.5">
            <span
              class="grid h-9 w-9 place-items-center rounded-xl"
              :class="store.phase === 'playing' ? 'bg-[color:var(--color-flame)]/20 text-[color:var(--color-flame)]' : 'bg-lime-400/15 text-lime-300'"
            >
              <PcIcon :name="hero.icon" :size="18" :class="store.phase === 'loading' && 'animate-spin'" />
            </span>
            <span class="pc-label">{{ hero.tag }}</span>
            <span v-if="store.phase === 'playing'" class="ml-auto flex items-center gap-1.5">
              <span class="relative flex h-2 w-2">
                <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--color-flame)]" />
                <span class="relative inline-flex h-2 w-2 rounded-full bg-[color:var(--color-flame)]" />
              </span>
              <span class="font-display text-[0.65rem] font-bold uppercase tracking-widest text-[color:var(--color-flame)]">Live</span>
            </span>
          </div>

          <h2 class="mt-4 font-display text-[1.8rem] leading-[1.02] text-cream">
            {{ hero.title }}
          </h2>
          <p class="mt-2.5 text-[0.92rem] leading-relaxed text-cream/65">
            {{ hero.body }}
          </p>

          <!-- the one thing you need to see when you're on court -->
          <div v-if="store.myMatch && (store.phase === 'playing' || store.phase === 'match-done')" class="mt-5 flex items-center gap-4 rounded-2xl bg-navy-950/50 p-4">
            <div class="text-center">
              <p class="font-display text-[0.6rem] font-bold uppercase tracking-[0.2em] text-cream/45">
                Veld
              </p>
              <p class="font-display text-5xl leading-none text-lime-400">
                {{ store.myMatch.field }}
              </p>
            </div>
            <div class="min-w-0 flex-1 border-l border-cream/10 pl-4">
              <p class="truncate text-[0.72rem] font-semibold uppercase tracking-wider text-cream/45">
                Samen met
              </p>
              <p class="truncate font-display text-lg text-cream">
                {{ store.myPartner?.name ?? '—' }}
              </p>
              <p class="truncate text-[0.8rem] text-cream/55">
                tegen {{ store.myOpponents.map(p => p.name.split(' ')[0]).join(' & ') }}
              </p>
            </div>
          </div>

          <NuxtLink
            v-if="['playing', 'match-done', 'connecting', 'bench'].includes(store.phase)"
            to="/app/match" class="pc-btn pc-btn-primary mt-5 w-full"
          >
            {{ store.phase === 'connecting' ? 'Naar de connecties' : store.phase === 'bench' ? 'Bekijk de velden' : 'Open je match' }}
            <PcIcon name="arrowRight" :size="18" />
          </NuxtLink>
        </div>
      </Transition>
    </section>

    <!-- ── stats ────────────────────────────────────────────────────────── -->
    <section class="pc-stagger mt-5 grid grid-cols-3 gap-2.5">
      <div class="pc-card p-3.5 text-center">
        <p class="font-display text-3xl text-lime-400">
          {{ store.me?.roundsPlayed ?? 0 }}
        </p>
        <p class="mt-0.5 text-[0.68rem] font-semibold uppercase tracking-wider text-cream/45">
          Rondes
        </p>
      </div>
      <div class="pc-card p-3.5 text-center">
        <p class="font-display text-3xl text-lime-400">
          {{ store.friends.length }}
        </p>
        <p class="mt-0.5 text-[0.68rem] font-semibold uppercase tracking-wider text-cream/45">
          Connecties
        </p>
      </div>
      <div class="pc-card p-3.5 text-center">
        <p class="font-display text-3xl text-lime-400">
          {{ store.players.filter(p => p.present).length }}
        </p>
        <p class="mt-0.5 text-[0.68rem] font-semibold uppercase tracking-wider text-cream/45">
          Spelers
        </p>
      </div>
    </section>

    <!-- ── live veldoverzicht ───────────────────────────────────────────── -->
    <section v-if="store.matches.length" class="mt-7">
      <div class="mb-3 flex items-end justify-between">
        <h3 class="font-display text-xl text-cream">
          {{ roundLabel }}
        </h3>
        <span class="text-[0.78rem] text-cream/45">
          {{ store.matches.filter(m => m.status === 'finished').length }}/{{ store.matches.length }} klaar
        </span>
      </div>
      <div class="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <div
          v-for="match in store.matches" :key="match.id"
          class="rounded-2xl border p-3 transition-colors"
          :class="match.playerIds.includes(store.playerId ?? '')
            ? 'border-lime-400/60 bg-lime-400/10'
            : match.status === 'finished'
              ? 'border-cream/8 bg-cream/[0.02] opacity-55'
              : 'border-cream/12 bg-cream/[0.04]'"
        >
          <div class="flex items-center justify-between">
            <span class="font-display text-sm font-bold text-cream">{{ match.fieldName }}</span>
            <PcIcon v-if="match.status === 'finished'" name="check" :size="15" class="text-lime-400" />
          </div>
          <div class="mt-2 flex -space-x-2">
            <PcAvatar
              v-for="id in match.playerIds" :key="id"
              :player="store.byId.get(id)" :size="26" ring="cream"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- ── je profiel in het kort ───────────────────────────────────────── -->
    <section v-if="store.me" class="mt-7">
      <h3 class="mb-3 font-display text-xl text-cream">
        Jouw speelmomenten
      </h3>
      <div class="pc-card flex flex-wrap gap-2 p-4">
        <span v-for="line in availability" :key="line" class="pc-chip cursor-default">
          {{ line }}
        </span>
        <NuxtLink to="/app/profile" class="pc-chip border-dashed">
          <PcIcon name="settings" :size="14" />Aanpassen
        </NuxtLink>
      </div>
    </section>

    <div class="h-6" />
  </main>
</template>
