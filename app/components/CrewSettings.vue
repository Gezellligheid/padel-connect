<script setup lang="ts">
import { defaultFieldNames } from '#shared/logic/defaults'
import { seedDemoPlayers, wipeDemo } from '~/lib/demo/seed'

const crew = useCrewStore()
const toast = useToast()
const mode = useBackendMode()

function seed() {
  const total = seedDemoPlayers(50)
  toast.success(`Demoveld gevuld — ${total} spelers staan klaar.`)
}

const draft = reactive({
  fieldCount: 8,
  gamesToWin: 8,
  fieldNames: defaultFieldNames(8),
  registrationOpen: true,
  announcement: '',
})

const loaded = ref(false)
const resetText = ref('')

watch(() => crew.event.settings, (settings) => {
  if (loaded.value) return
  Object.assign(draft, { ...settings, fieldNames: [...settings.fieldNames] })
  loaded.value = true
}, { immediate: true, deep: true })

watch(() => draft.fieldCount, (count) => {
  const next = Array.from({ length: count }, (_, i) => draft.fieldNames[i] || `Veld ${i + 1}`)
  draft.fieldNames = next
})

const dirty = computed(() => {
  const current = crew.event.settings
  return draft.fieldCount !== current.fieldCount
    || draft.gamesToWin !== current.gamesToWin
    || draft.registrationOpen !== current.registrationOpen
    || draft.announcement !== current.announcement
    || draft.fieldNames.join('|') !== current.fieldNames.join('|')
})
</script>

<template>
  <section class="grid gap-5 lg:grid-cols-2">
    <!-- velden -->
    <div class="rounded-2xl border border-ink/10 bg-white p-5">
      <h3 class="font-display text-xl text-ink">
        Velden
      </h3>
      <p class="mt-1 text-sm text-ink/50">
        Hoeveel terreinen staan er vandaag open? Dat bepaalt hoeveel spelers per ronde kunnen spelen
        (<strong class="text-ink/70">{{ draft.fieldCount * 4 }} plaatsen</strong>).
      </p>

      <div class="mt-4 flex items-center gap-4">
        <input
          v-model.number="draft.fieldCount" type="range" min="1" max="16" step="1"
          class="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-ink/10 accent-lime-500"
          aria-label="Aantal velden"
        >
        <span class="w-12 text-center font-display text-3xl text-ink">{{ draft.fieldCount }}</span>
      </div>

      <div class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div v-for="(_, i) in draft.fieldNames" :key="i" class="flex items-center gap-1.5">
          <span class="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-navy-900 font-display text-xs font-bold text-lime-400">{{ i + 1 }}</span>
          <input
            v-model="draft.fieldNames[i]" maxlength="24"
            class="min-w-0 flex-1 rounded-lg border border-ink/12 bg-cream px-2 py-1.5 text-sm text-ink outline-none focus:border-lime-500"
            :aria-label="`Naam van veld ${i + 1}`"
          >
        </div>
      </div>
    </div>

    <!-- match -->
    <div class="space-y-5">
      <div class="rounded-2xl border border-ink/10 bg-white p-5">
        <h3 class="font-display text-xl text-ink">
          Matchlengte
        </h3>
        <p class="mt-1 text-sm text-ink/50">
          Tot hoeveel punten spelen de groepjes? Spelers zien dit op hun matchscherm.
        </p>
        <div class="mt-4 flex items-center gap-4">
          <input
            v-model.number="draft.gamesToWin" type="range" min="1" max="24" step="1"
            class="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-ink/10 accent-lime-500"
            aria-label="Punten per match"
          >
          <span class="w-12 text-center font-display text-3xl text-ink">{{ draft.gamesToWin }}</span>
        </div>
      </div>

      <div class="rounded-2xl border border-ink/10 bg-white p-5">
        <h3 class="font-display text-xl text-ink">
          Mededeling
        </h3>
        <p class="mt-1 text-sm text-ink/50">
          Verschijnt bovenaan bij alle spelers. Leeg laten om te verbergen.
        </p>
        <textarea
          v-model="draft.announcement" maxlength="200" rows="2"
          placeholder="Bv. Om 16u start de demomatch op veld 1!"
          class="mt-3 w-full resize-none rounded-xl border border-ink/12 bg-cream px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink/35 focus:border-lime-500"
        />
      </div>

      <label class="flex cursor-pointer items-center gap-3 rounded-2xl border border-ink/10 bg-white p-5">
        <input v-model="draft.registrationOpen" type="checkbox" class="sr-only">
        <span
          class="relative h-6 w-11 shrink-0 rounded-full transition-colors"
          :class="draft.registrationOpen ? 'bg-lime-500' : 'bg-ink/15'"
        >
          <span class="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left] duration-300" :class="draft.registrationOpen ? 'left-[1.4rem]' : 'left-0.5'" />
        </span>
        <span>
          <span class="block font-display text-base text-ink">Inschrijvingen open</span>
          <span class="block text-sm text-ink/50">Zet uit zodra iedereen binnen is.</span>
        </span>
      </label>
    </div>

    <!-- opslaan -->
    <div class="lg:col-span-2">
      <button
        type="button" class="pc-btn w-full text-base"
        :class="dirty ? 'pc-btn-primary' : 'pc-btn-ghost !text-ink/40 !border-ink/15'"
        :disabled="!dirty || crew.busy" @click="crew.saveSettings({ ...draft, fieldNames: [...draft.fieldNames] })"
      >
        <PcIcon name="check" :size="18" />{{ dirty ? 'Instellingen bewaren' : 'Alles is bewaard' }}
      </button>
    </div>

    <!-- demogereedschap -->
    <div v-if="mode === 'demo'" class="rounded-2xl border border-[color:var(--color-sky)]/40 bg-[color:var(--color-sky)]/8 p-5 lg:col-span-2">
      <div class="flex items-center gap-2">
        <PcIcon name="sparkles" :size="18" class="text-[color:var(--color-sky)]" />
        <h3 class="font-display text-xl text-ink">
          Demomodus
        </h3>
      </div>
      <p class="mt-1.5 max-w-prose text-sm text-ink/60">
        Er is nog geen Firebase gekoppeld, dus alles staat op dit toestel. Ideaal om de volledige dag
        eens droog te draaien: vul het veld met 50 testspelers en start een ronde.
      </p>
      <div class="mt-3 flex flex-wrap gap-2">
        <button type="button" class="rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-bold text-lime-400 transition-[filter] hover:brightness-125" @click="seed">
          Vul met 50 testspelers
        </button>
        <button type="button" class="rounded-xl border border-ink/15 bg-white px-5 py-2.5 text-sm font-bold text-ink/60 transition-colors hover:border-ink/30" @click="wipeDemo()">
          Wis alle demodata
        </button>
      </div>
    </div>

    <!-- gevarenzone -->
    <div class="rounded-2xl border border-[color:var(--color-flame)]/35 bg-[color:var(--color-flame)]/6 p-5 lg:col-span-2">
      <div class="flex items-center gap-2">
        <PcIcon name="info" :size="18" class="text-[color:var(--color-flame)]" />
        <h3 class="font-display text-xl text-ink">
          Alles resetten
        </h3>
      </div>
      <p class="mt-1.5 max-w-prose text-sm text-ink/60">
        Wist alle rondes, matches, connecties en speelstatistieken. De spelers en hun profielen blijven staan.
        Handig om na een testronde met een schone lei te beginnen. Typ
        <strong class="text-[color:var(--color-flame)]">RESET</strong> om te bevestigen.
      </p>
      <div class="mt-3 flex flex-wrap gap-2">
        <input
          v-model="resetText" placeholder="RESET"
          class="w-36 rounded-xl border border-ink/15 bg-white px-3 py-2.5 text-sm text-ink outline-none focus:border-[color:var(--color-flame)]"
        >
        <button
          type="button"
          class="rounded-xl bg-[color:var(--color-flame)] px-5 py-2.5 text-sm font-bold text-white transition-[filter] hover:brightness-110 disabled:opacity-40"
          :disabled="resetText.trim().toUpperCase() !== 'RESET' || crew.busy"
          @click="crew.reset(); resetText = ''"
        >
          Event resetten
        </button>
      </div>
    </div>
  </section>
</template>
