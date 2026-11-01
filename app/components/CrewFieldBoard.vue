<script setup lang="ts">
import type { Match } from '#shared/types'

const crew = useCrewStore()
const now = useClock()

const swapTarget = ref<{ match: Match, playerId: string } | null>(null)

const benchOptions = computed(() => crew.bench)

async function doSwap(inId: string) {
  if (!swapTarget.value) return
  await crew.substitute(swapTarget.value.match.id, swapTarget.value.playerId, inId)
  swapTarget.value = null
}

const elapsed = (match: Match) =>
  formatDuration((match.endedAt ?? now.value) - match.startedAt)
</script>

<template>
  <section>
    <div class="mb-3 flex flex-wrap items-end justify-between gap-2">
      <h2 class="font-display text-2xl text-ink">
        Velden
        <span v-if="crew.round" class="text-ink/40">· ronde {{ crew.round.index }}</span>
      </h2>
      <div v-if="crew.matches.length" class="flex items-center gap-2 text-sm text-ink/55">
        <div class="h-1.5 w-28 overflow-hidden rounded-full bg-ink/10">
          <div
            class="h-full rounded-full bg-lime-500 transition-[width] duration-700"
            :style="{ width: `${crew.roundProgress * 100}%` }"
          />
        </div>
        {{ crew.matchesFinished }}/{{ crew.matches.length }} klaar
      </div>
    </div>

    <div v-if="!crew.matches.length" class="rounded-2xl border border-dashed border-ink/20 bg-white/60 p-10 text-center">
      <p class="font-display text-xl text-ink/70">
        Nog geen ronde geloot
      </p>
      <p class="mt-1.5 text-sm text-ink/50">
        Duw op “Start ronde” om {{ crew.seated }} spelers over {{ crew.event.settings.fieldCount }} velden te verdelen.
      </p>
    </div>

    <div v-else class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="match in crew.matches" :key="match.id"
        class="rounded-2xl border bg-white p-4 transition-shadow"
        :class="match.status === 'finished'
          ? 'border-lime-500/50 bg-lime-50'
          : 'border-ink/10 shadow-[0_12px_30px_-24px_rgba(0,31,66,0.6)]'"
      >
        <header class="flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <span
              class="grid h-10 w-10 place-items-center rounded-xl font-display text-lg font-extrabold"
              :class="match.status === 'finished' ? 'bg-lime-500 text-navy-900' : 'bg-navy-900 text-lime-400'"
            >{{ match.field }}</span>
            <div>
              <p class="font-display text-base leading-tight text-ink">
                {{ match.fieldName }}
              </p>
              <p class="text-[0.72rem] text-ink/45">
                {{ elapsed(match) }} · {{ match.finishedBy.length }}/4 klaar
              </p>
            </div>
          </div>
          <div class="text-right">
            <p class="font-display text-2xl tabular-nums leading-none text-ink">
              {{ match.score[0] }}–{{ match.score[1] }}
            </p>
            <p
              class="mt-0.5 text-[0.65rem] font-bold uppercase tracking-wider"
              :class="match.status === 'finished' ? 'text-lime-600' : 'text-ink/40'"
            >
              {{ match.status === 'finished' ? 'Klaar' : 'Bezig' }}
            </p>
          </div>
        </header>

        <div class="mt-3.5 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div v-for="(team, side) in match.teams" :key="side" :class="side === 1 && 'order-3'">
            <p class="mb-1.5 text-center text-[0.6rem] font-bold uppercase tracking-[0.18em] text-ink/35">
              Team {{ side === 0 ? 'A' : 'B' }}
            </p>
            <div class="flex justify-center gap-1.5">
              <button
                v-for="id in team" :key="id" type="button"
                class="group flex w-16 flex-col items-center gap-1 rounded-xl p-1 transition-colors hover:bg-ink/5"
                :title="`${crew.byId.get(id)?.name ?? '?'} — klik om te wisselen`"
                @click="swapTarget = { match, playerId: id }"
              >
                <span class="relative">
                  <PcAvatar :player="crew.byId.get(id)" :size="34" />
                  <span
                    v-if="match.finishedBy.includes(id)"
                    class="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-lime-500 text-navy-900"
                  ><PcIcon name="check" :size="10" :stroke="3.4" /></span>
                </span>
                <span class="w-full truncate text-center text-[0.66rem] font-semibold text-ink/70">
                  {{ crew.byId.get(id)?.name.split(' ')[0] ?? '?' }}
                </span>
              </button>
            </div>
          </div>
          <span class="order-2 font-display text-sm text-ink/20">vs</span>
        </div>
      </article>
    </div>

    <!-- bank -->
    <div v-if="crew.bench.length" class="mt-5 rounded-2xl border border-ink/10 bg-white p-4">
      <div class="flex items-center gap-2">
        <PcIcon name="clock" :size="17" class="text-ink/40" />
        <h3 class="font-display text-base text-ink">
          Op de bank ({{ crew.bench.length }})
        </h3>
        <span class="text-[0.75rem] text-ink/45">— krijgen volgende ronde voorrang</span>
      </div>
      <div class="mt-3 flex flex-wrap gap-2">
        <span
          v-for="player in crew.bench" :key="player.id"
          class="flex items-center gap-2 rounded-lg bg-ink/5 py-1 pl-1 pr-3"
        >
          <PcAvatar :player="player" :size="26" />
          <span class="text-[0.8rem] font-semibold text-ink/75">{{ player.name }}</span>
        </span>
      </div>
    </div>

    <!-- wisseldialoog -->
    <Teleport to="body">
      <Transition name="pop">
        <div
          v-if="swapTarget"
          class="fixed inset-0 z-[80] grid place-items-center bg-navy-950/60 p-5 backdrop-blur-sm"
          @click.self="swapTarget = null"
        >
          <div class="w-full max-w-sm rounded-3xl bg-cream p-6 shadow-2xl">
            <h3 class="font-display text-xl text-ink">
              {{ crew.byId.get(swapTarget.playerId)?.name }} vervangen
            </h3>
            <p class="mt-1.5 text-sm text-ink/55">
              Kies wie er op veld {{ swapTarget.match.field }} komt. De vervangen speler gaat naar de bank.
            </p>

            <div v-if="!benchOptions.length" class="mt-4 rounded-xl bg-ink/5 p-4 text-center text-sm text-ink/55">
              Niemand op de bank om mee te wisselen.
            </div>
            <div v-else class="mt-4 max-h-64 space-y-1.5 overflow-y-auto">
              <button
                v-for="player in benchOptions" :key="player.id" type="button"
                class="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-ink/5"
                @click="doSwap(player.id)"
              >
                <PcAvatar :player="player" :size="34" />
                <span class="flex-1 font-semibold text-ink">{{ player.name }}</span>
                <PcIcon name="arrowRight" :size="17" class="text-ink/35" />
              </button>
            </div>

            <button type="button" class="mt-4 w-full rounded-xl bg-ink/8 py-3 font-semibold text-ink/70 transition-colors hover:bg-ink/14" @click="swapTarget = null">
              Annuleren
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>
