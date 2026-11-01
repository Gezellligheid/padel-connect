<script setup lang="ts">
import { LEVELS, summariseAvailability } from '#shared/logic/availability'

definePageMeta({ layout: 'app' })

const store = useRequirePlayer()
const open = ref<string | null>(null)

const admirers = computed(() =>
  [...store.admirerIds]
    .filter(id => !store.friendIds.has(id))
    .map(id => store.byId.get(id))
    .filter(Boolean))

function waLink(phone: string, name: string) {
  const text = encodeURIComponent(`Hey ${name.split(' ')[0]}! We speelden samen op Padel Connect — zin om nog eens af te spreken?`)
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${text}`
}

const levelLabel = (level: number) => LEVELS.find(l => l.value === level)?.label ?? ''
</script>

<template>
  <main class="mx-auto max-w-xl px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
    <header>
      <p class="pc-label">
        Je netwerk
      </p>
      <h1 class="mt-1 font-display text-4xl text-cream">
        Connecties
      </h1>
      <p class="mt-2 text-sm text-cream/55">
        De mensen die je toevoegde. Hun nummer en speelmomenten staan erbij.
      </p>
    </header>

    <!-- ── leeg ─────────────────────────────────────────────────────────── -->
    <section v-if="!store.friends.length" class="mt-14 flex flex-col items-center gap-4 text-center">
      <span class="grid h-20 w-20 place-items-center rounded-full bg-cream/6 text-cream/35">
        <PcIcon name="users" :size="34" />
      </span>
      <h2 class="font-display text-2xl text-cream">
        Nog niemand toegevoegd
      </h2>
      <p class="max-w-xs text-sm text-cream/55">
        Na elke match kan je de mensen van jouw veld toevoegen. Ze verschijnen dan hier.
      </p>
      <NuxtLink to="/app/match" class="pc-btn pc-btn-ghost mt-1">
        Naar je match<PcIcon name="arrowRight" :size="17" />
      </NuxtLink>
    </section>

    <!-- ── lijst ────────────────────────────────────────────────────────── -->
    <section v-else class="pc-stagger mt-6 space-y-3">
      <article
        v-for="entry in store.friends" :key="entry.connection.id"
        class="pc-card overflow-hidden"
      >
        <button
          type="button"
          class="flex w-full items-center gap-3.5 p-4 text-left"
          @click="open = open === entry.player!.id ? null : entry.player!.id"
        >
          <PcAvatar :player="entry.player" :size="54" ring="lime" />
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <p class="truncate font-display text-lg text-cream">
                {{ entry.player!.name }}
              </p>
              <span
                v-if="entry.mutual"
                class="shrink-0 rounded-md bg-[color:var(--color-berry)]/20 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-[color:var(--color-berry)]"
              >Wederzijds</span>
            </div>
            <p class="truncate text-[0.82rem] text-cream/55">
              {{ entry.phone ?? 'Nummer laadt…' }}
            </p>
          </div>
          <PcIcon
            name="chevronDown" :size="19"
            class="shrink-0 text-cream/40 transition-transform duration-300"
            :class="open === entry.player!.id && 'rotate-180'"
          />
        </button>

        <Transition name="pop">
          <div v-if="open === entry.player!.id" class="space-y-4 border-t border-cream/8 px-4 pb-4 pt-4">
            <p v-if="entry.player!.bio" class="text-[0.88rem] italic text-cream/70">
              “{{ entry.player!.bio }}”
            </p>

            <div>
              <p class="pc-label mb-1.5">
                Kan padellen
              </p>
              <div class="flex flex-wrap gap-1.5">
                <span
                  v-for="line in summariseAvailability(entry.player!.availability)" :key="line"
                  class="rounded-md bg-lime-400/12 px-2.5 py-1 text-[0.72rem] font-semibold text-lime-200"
                >{{ line }}</span>
              </div>
            </div>

            <div v-if="entry.player!.hobbies.length">
              <p class="pc-label mb-1.5">
                Hobby's
              </p>
              <div class="flex flex-wrap gap-1.5">
                <span
                  v-for="hobby in entry.player!.hobbies" :key="hobby"
                  class="rounded-md bg-cream/8 px-2.5 py-1 text-[0.72rem] font-semibold text-cream/65"
                >{{ hobby }}</span>
              </div>
            </div>

            <div class="flex flex-wrap gap-3 text-[0.78rem] text-cream/55">
              <span class="flex items-center gap-1.5"><PcIcon name="medal" :size="14" />{{ levelLabel(entry.player!.level) }}</span>
              <span class="flex items-center gap-1.5"><PcIcon name="clock" :size="14" />± {{ entry.player!.hoursPerWeek }}u / week</span>
            </div>

            <div class="flex gap-2">
              <a v-if="entry.phone" :href="`tel:${entry.phone}`" class="pc-btn pc-btn-ghost flex-1 py-3 text-sm">
                <PcIcon name="phone" :size="16" />Bellen
              </a>
              <a
                v-if="entry.phone" :href="waLink(entry.phone, entry.player!.name)"
                target="_blank" rel="noopener" class="pc-btn pc-btn-primary flex-1 py-3 text-sm"
              >
                <PcIcon name="sparkles" :size="16" />WhatsApp
              </a>
            </div>

            <button
              type="button"
              class="w-full text-center text-[0.78rem] text-cream/40 underline-offset-4 transition-colors hover:text-[color:var(--color-flame)] hover:underline"
              @click="store.disconnect(entry.player!.id)"
            >
              Connectie verwijderen
            </button>
          </div>
        </Transition>
      </article>
    </section>

    <!-- ── zij voegden jou toe ──────────────────────────────────────────── -->
    <section v-if="admirers.length" class="mt-9">
      <div class="mb-3 flex items-center gap-2">
        <PcIcon name="heart" :size="17" class="text-[color:var(--color-berry)]" />
        <h2 class="font-display text-xl text-cream">
          Zij voegden jou toe
        </h2>
      </div>
      <p class="mb-3 text-[0.82rem] text-cream/50">
        Voeg ze terug toe en jullie hebben allebei elkaars gegevens.
      </p>
      <div class="space-y-2.5">
        <ConnectButton
          v-for="player in admirers" :key="player!.id"
          :player="player!" :me="store.me" :connected="false" :mutual="true"
          @toggle="store.connect(player!.id)"
        />
      </div>
    </section>

    <div class="h-8" />
  </main>
</template>
