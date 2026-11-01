<script setup lang="ts">
import type { SlotKey } from '#shared/types'
import { HOBBY_OPTIONS, HOURS_OPTIONS, LEVELS } from '#shared/logic/availability'
import { isValidPhone, isValidPin, WEAK_PINS } from '#shared/logic/validation'

definePageMeta({ layout: 'app' })

const store = useRequirePlayer()
const toast = useToast()
const mode = useBackendMode()

const draft = reactive({
  name: '',
  age: null as number | null,
  photo: null as string | null,
  bio: '',
  level: 1,
  hoursPerWeek: 1,
  availability: [] as SlotKey[],
  hobbies: [] as string[],
  phone: '',
  pin: '',
})

const loaded = ref(false)
const saving = ref(false)
const showDanger = ref(false)

watch(() => store.me, (me) => {
  if (!me || loaded.value) return
  Object.assign(draft, {
    name: me.name,
    age: me.age,
    photo: me.photo,
    bio: me.bio,
    level: me.level,
    hoursPerWeek: me.hoursPerWeek,
    availability: [...me.availability],
    hobbies: [...me.hobbies],
    phone: '',
    pin: '',
  })
  loaded.value = true
}, { immediate: true })

const dirty = computed(() => {
  const me = store.me
  if (!me) return false
  return draft.name !== me.name
    || draft.age !== me.age
    || draft.photo !== me.photo
    || draft.bio !== me.bio
    || draft.level !== me.level
    || draft.hoursPerWeek !== me.hoursPerWeek
    || draft.hobbies.join() !== me.hobbies.join()
    || [...draft.availability].sort().join() !== [...me.availability].sort().join()
    || draft.phone !== ''
    || draft.pin !== ''
})

const pinProblem = computed(() => {
  if (!draft.pin) return ''
  if (!isValidPin(draft.pin)) return 'Een pincode heeft 4 cijfers.'
  if (WEAK_PINS.has(draft.pin)) return 'Kies iets minder voorspelbaars.'
  return ''
})

const phoneProblem = computed(() =>
  draft.phone && !isValidPhone(draft.phone) ? 'Dat lijkt geen geldig nummer.' : '')

async function save() {
  if (!dirty.value || pinProblem.value || phoneProblem.value) return
  saving.value = true
  await store.updateProfile({
    name: draft.name,
    age: draft.age,
    photo: draft.photo,
    bio: draft.bio,
    level: draft.level,
    hoursPerWeek: draft.hoursPerWeek,
    availability: draft.availability,
    hobbies: draft.hobbies,
    ...(draft.phone ? { phone: draft.phone } : {}),
    ...(draft.pin ? { pin: draft.pin } : {}),
  })
  draft.phone = ''
  draft.pin = ''
  saving.value = false
}

function toggleHobby(hobby: string) {
  draft.hobbies = draft.hobbies.includes(hobby)
    ? draft.hobbies.filter(h => h !== hobby)
    : [...draft.hobbies, hobby]
}

const deleteConfirm = ref('')
const deleting = ref(false)

async function deleteAccount() {
  if (deleteConfirm.value.trim().toUpperCase() !== 'VERWIJDER') return
  deleting.value = true
  try {
    await useBackendClient('player').call('player.deleteMe')
    toast.success('Je gegevens zijn gewist.')
    await store.logout()
  }
  catch {
    toast.error('Verwijderen lukte niet. Spreek iemand van de crew aan.')
  }
  finally {
    deleting.value = false
  }
}
</script>

<template>
  <main class="mx-auto max-w-xl px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
    <header class="flex items-start justify-between gap-3">
      <div>
        <p class="pc-label">
          Jouw profiel
        </p>
        <h1 class="mt-1 font-display text-4xl text-cream">
          {{ store.me?.name ?? '…' }}
        </h1>
      </div>
      <button
        type="button" class="flex items-center gap-1.5 rounded-lg border border-cream/14 px-3 py-2 text-[0.75rem] font-semibold text-cream/60 transition-colors hover:border-[color:var(--color-flame)]/50 hover:text-[color:var(--color-flame)]"
        @click="store.logout()"
      >
        <PcIcon name="logout" :size="15" />Uitloggen
      </button>
    </header>

    <div v-if="!store.me" class="mt-10 space-y-3">
      <div class="pc-shimmer h-32 rounded-3xl" />
      <div class="pc-shimmer h-24 rounded-3xl" />
    </div>

    <template v-else>
      <section class="mt-7 flex flex-col items-center">
        <PhotoPicker v-model="draft.photo" :name="draft.name" :size="130" />
      </section>

      <section class="mt-7 space-y-5">
        <div>
          <label class="pc-label mb-2 block" for="pf-name">Naam</label>
          <input id="pf-name" v-model="draft.name" class="pc-input" maxlength="32">
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="pc-label mb-2 block" for="pf-age">Leeftijd</label>
            <input id="pf-age" v-model.number="draft.age" type="number" inputmode="numeric" class="pc-input" min="16" max="99">
          </div>
          <div>
            <label class="pc-label mb-2 block" for="pf-phone">Nieuw gsm-nummer</label>
            <input id="pf-phone" v-model="draft.phone" type="tel" class="pc-input" placeholder="ongewijzigd">
          </div>
        </div>
        <p v-if="phoneProblem" class="-mt-3 text-xs font-semibold text-[color:var(--color-flame)]">
          {{ phoneProblem }}
        </p>

        <div>
          <label class="pc-label mb-2 block" for="pf-bio">Over jou</label>
          <textarea id="pf-bio" v-model="draft.bio" class="pc-input min-h-24 resize-none" maxlength="160" />
        </div>

        <div>
          <p class="pc-label mb-2">
            Niveau
          </p>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="option in LEVELS" :key="option.value" type="button" class="pc-chip justify-center py-3"
              :data-on="draft.level === option.value" @click="draft.level = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <div>
          <p class="pc-label mb-2">
            Tijd per week
          </p>
          <div class="grid grid-cols-4 gap-2">
            <button
              v-for="option in HOURS_OPTIONS" :key="option.value" type="button" class="pc-chip justify-center py-3"
              :data-on="draft.hoursPerWeek === option.value" @click="draft.hoursPerWeek = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <div>
          <p class="pc-label mb-2">
            Wanneer kan je padellen?
          </p>
          <AvailabilityGrid v-model="draft.availability" />
        </div>

        <div>
          <p class="pc-label mb-2">
            Hobby's
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="hobby in HOBBY_OPTIONS" :key="hobby" type="button" class="pc-chip"
              :data-on="draft.hobbies.includes(hobby)" @click="toggleHobby(hobby)"
            >
              {{ hobby }}
            </button>
          </div>
        </div>

        <div>
          <label class="pc-label mb-2 block" for="pf-pin">Nieuwe pincode</label>
          <input
            id="pf-pin" v-model="draft.pin" inputmode="numeric" maxlength="4"
            class="pc-input tracking-[0.5em]" placeholder="ongewijzigd"
          >
          <p v-if="pinProblem" class="mt-1.5 text-xs font-semibold text-[color:var(--color-flame)]">
            {{ pinProblem }}
          </p>
        </div>
      </section>

      <!-- ── privacy & account ───────────────────────────────────────────── -->
      <section class="mt-8 space-y-2.5">
        <NuxtLink to="/privacy" class="pc-card flex items-center gap-3 p-4 transition-colors hover:border-cream/25">
          <span class="grid h-10 w-10 place-items-center rounded-xl bg-lime-400/12 text-lime-300">
            <PcIcon name="shield" :size="18" />
          </span>
          <span class="flex-1">
            <span class="block font-display text-base text-cream">Privacyverklaring</span>
            <span class="block text-[0.78rem] text-cream/50">Wat we bijhouden en hoe lang</span>
          </span>
          <PcIcon name="arrowRight" :size="17" class="text-cream/35" />
        </NuxtLink>

        <button type="button" class="pc-card flex w-full items-center gap-3 p-4 text-left transition-colors hover:border-[color:var(--color-flame)]/40" @click="showDanger = !showDanger">
          <span class="grid h-10 w-10 place-items-center rounded-xl bg-[color:var(--color-flame)]/12 text-[color:var(--color-flame)]">
            <PcIcon name="trash" :size="18" />
          </span>
          <span class="flex-1">
            <span class="block font-display text-base text-cream">Mijn gegevens wissen</span>
            <span class="block text-[0.78rem] text-cream/50">Definitief, meteen</span>
          </span>
          <PcIcon name="chevronDown" :size="17" class="text-cream/35 transition-transform" :class="showDanger && 'rotate-180'" />
        </button>

        <Transition name="pop">
          <div v-if="showDanger" class="rounded-2xl border border-[color:var(--color-flame)]/30 bg-[color:var(--color-flame)]/8 p-4">
            <p class="text-[0.85rem] leading-snug text-cream/75">
              Dit wist je profiel, je telefoonnummer en al je connecties. Je kan dan niet meer meespelen vandaag.
              Typ <strong class="text-[color:var(--color-flame)]">VERWIJDER</strong> om te bevestigen.
            </p>
            <input v-model="deleteConfirm" class="pc-input mt-3" placeholder="VERWIJDER">
            <button
              type="button" class="pc-btn pc-btn-danger mt-3 w-full"
              :disabled="deleteConfirm.trim().toUpperCase() !== 'VERWIJDER' || deleting"
              @click="deleteAccount"
            >
              <PcIcon name="trash" :size="17" />Definitief verwijderen
            </button>
          </div>
        </Transition>

        <p v-if="mode === 'demo'" class="pt-2 text-center text-[0.7rem] text-cream/30">
          Demomodus — alles staat enkel op dit toestel.
        </p>
      </section>

      <!-- ── opslaan ─────────────────────────────────────────────────────── -->
      <Transition name="pop">
        <div v-if="dirty" class="sticky bottom-[calc(5.5rem+var(--bottom-safe))] z-30 mt-6">
          <button
            type="button" class="pc-btn pc-btn-primary w-full text-base"
            :disabled="saving || !!pinProblem || !!phoneProblem" @click="save"
          >
            <PcIcon :name="saving ? 'refresh' : 'check'" :size="18" :class="saving && 'animate-spin'" />
            {{ saving ? 'Bewaren…' : 'Wijzigingen bewaren' }}
          </button>
        </div>
      </Transition>
    </template>

    <div class="h-8" />
  </main>
</template>
