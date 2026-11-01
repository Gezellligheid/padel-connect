<script setup lang="ts">
import type { SlotKey } from '#shared/types'
import { HOBBY_OPTIONS, HOURS_OPTIONS, LEVELS } from '#shared/logic/availability'
import { isValidPhone, isValidPin, WEAK_PINS } from '#shared/logic/validation'
import { BackendError } from '~/lib/backend'

const store = usePadelStore()
const { rain, buzz } = useCelebrate()

const form = reactive({
  name: '',
  age: null as number | null,
  photo: null as string | null,
  level: 0,
  hoursPerWeek: 0,
  availability: [] as SlotKey[],
  hobbies: [] as string[],
  bio: '',
  phone: '',
  pin: '',
  pinConfirm: '',
  consent: false,
})

const STEPS = [
  'name', 'age', 'photo', 'level', 'hours',
  'availability', 'hobbies', 'bio', 'phone', 'pin', 'confirm', 'consent',
] as const
type Step = typeof STEPS[number]

const index = ref(0)
const direction = ref<'step' | 'step-back'>('step')
const submitting = ref(false)
const done = ref(false)
const error = ref('')

const step = computed<Step>(() => STEPS[index.value]!)
const progress = computed(() => (index.value / STEPS.length) * 100)
const firstName = computed(() => form.name.trim().split(/\s+/)[0] ?? '')

const valid = computed(() => {
  switch (step.value) {
    case 'name': return form.name.trim().length >= 2 && form.name.trim().length <= 32
    case 'age': return form.age === null || (form.age >= 16 && form.age <= 99)
    case 'photo': return true
    case 'level': return form.level > 0
    case 'hours': return form.hoursPerWeek > 0
    case 'availability': return form.availability.length > 0
    case 'hobbies': return true
    case 'bio': return form.bio.length <= 160
    case 'phone': return isValidPhone(form.phone)
    case 'pin': return isValidPin(form.pin) && !WEAK_PINS.has(form.pin)
    case 'confirm': return form.pinConfirm === form.pin
    case 'consent': return form.consent
  }
})

const pinHint = computed(() => {
  if (!form.pin) return ''
  if (!isValidPin(form.pin)) return ''
  if (WEAK_PINS.has(form.pin)) return 'Kies iets dat niet iedereen raadt.'
  return ''
})

function next() {
  if (!valid.value) return
  buzz(12)
  if (index.value === STEPS.length - 1) return submit()
  direction.value = 'step'
  index.value++
}

function back() {
  if (index.value === 0) return navigateTo('/')
  direction.value = 'step-back'
  index.value--
}

function toggleHobby(hobby: string) {
  form.hobbies = form.hobbies.includes(hobby)
    ? form.hobbies.filter(h => h !== hobby)
    : form.hobbies.length >= 12 ? form.hobbies : [...form.hobbies, hobby]
  buzz(8)
}

async function submit() {
  if (submitting.value) return
  submitting.value = true
  error.value = ''
  try {
    await store.register({
      name: form.name,
      age: form.age,
      phone: form.phone,
      pin: form.pin,
      photo: form.photo,
      hobbies: form.hobbies,
      bio: form.bio,
      level: form.level,
      hoursPerWeek: form.hoursPerWeek,
      availability: form.availability,
      consent: form.consent,
    })
    done.value = true
    void rain(2200)
    buzz([18, 40, 18, 40, 60])
    setTimeout(() => navigateTo('/app'), 2600)
  }
  catch (caught) {
    error.value = caught instanceof BackendError ? caught.message : 'Inschrijven mislukte. Probeer opnieuw.'
    // Jump back to the step that owns the problem.
    const code = caught instanceof BackendError ? caught.code : ''
    if (code === 'pin_taken' || code.includes('pin')) index.value = STEPS.indexOf('pin')
    else if (code.includes('name')) index.value = STEPS.indexOf('name')
    else if (code.includes('phone')) index.value = STEPS.indexOf('phone')
  }
  finally {
    submitting.value = false
  }
}

function onEnter(event: KeyboardEvent) {
  if (event.key === 'Enter' && valid.value) {
    event.preventDefault()
    next()
  }
}

/** Put the cursor in the step's field as soon as it slides in — the chat
 *  bubble grows while it "types", so an autofocus attribute alone drifts. */
const stepBody = useTemplateRef<HTMLElement>('stepBody')

function focusField() {
  stepBody.value?.querySelector<HTMLElement>('input:not([type=file]), textarea')?.focus()
}

onMounted(() => nextTick(focusField))

const CTA: Partial<Record<Step, string>> = {
  photo: 'Volgende',
  consent: 'Ik ga akkoord — klaar!',
}
</script>

<template>
  <main
    class="relative mx-auto flex min-h-dvh max-w-xl flex-col overflow-hidden px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]
           lg:my-10 lg:min-h-[min(48rem,86dvh)] lg:rounded-3xl lg:border lg:border-cream/12 lg:bg-navy-900/35 lg:px-8 lg:pt-7 lg:shadow-[0_40px_90px_-50px_rgba(0,0,0,0.95)] lg:backdrop-blur-2xl">
    <!-- ── done ─────────────────────────────────────────────────────────── -->
    <Transition name="pop">
      <div v-if="done" class="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-navy-950/95 px-6 text-center backdrop-blur-xl">
        <div class="animate-pop">
          <BrandMark variant="badge" size="md" />
        </div>
        <h2 class="animate-rise font-display text-4xl text-lime-400">
          Je staat erop!
        </h2>
        <p class="animate-rise max-w-xs text-cream/70" style="animation-delay:.1s">
          Welkom {{ firstName }}. Hou je telefoon bij de hand — zodra de crew een ronde start, zie je hier je veld.
        </p>
      </div>
    </Transition>

    <!-- ── progress ─────────────────────────────────────────────────────── -->
    <header class="flex items-center gap-4">
      <button type="button" class="grid h-10 w-10 place-items-center rounded-full bg-cream/8 text-cream/70 transition-colors hover:bg-cream/14 hover:text-cream" aria-label="Terug" @click="back">
        <PcIcon name="arrowLeft" :size="19" />
      </button>
      <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-cream/10">
        <div
          class="h-full rounded-full bg-linear-to-r from-lime-300 to-lime-500 transition-[width] duration-500 ease-[var(--ease-out-soft)]"
          :style="{ width: `${Math.max(6, progress)}%` }"
        />
      </div>
      <span class="font-display text-xs font-bold tabular-nums text-cream/45">
        {{ index + 1 }}/{{ STEPS.length }}
      </span>
    </header>

    <SetupNotice class="mt-5" />

    <!-- ── steps ────────────────────────────────────────────────────────── -->
    <div ref="stepBody" class="relative flex-1 pt-8">
      <Transition :name="direction" mode="out-in" @after-enter="focusField">
        <section :key="step" class="flex flex-col gap-7">
          <!-- name -->
          <template v-if="step === 'name'">
            <OnboardBubble text="Hey! Hoe mogen mensen je noemen?" sub="Dit staat op je kaartje op het veld." />
            <input
              v-model="form.name" class="pc-input text-xl font-semibold" placeholder="Bv. Lotte V."
              autocomplete="given-name" maxlength="32" @keydown="onEnter"
            >
          </template>

          <!-- age -->
          <template v-else-if="step === 'age'">
            <OnboardBubble :text="`Leuk je te leren kennen, ${firstName}. Hoe oud ben je?`" sub="Mag je overslaan als je dat liever hebt." />
            <input
              v-model.number="form.age" type="number" inputmode="numeric" min="16" max="99"
              class="pc-input text-xl font-semibold" placeholder="27" @keydown="onEnter"
            >
            <button type="button" class="w-fit text-sm text-cream/50 underline-offset-4 hover:text-cream hover:underline" @click="form.age = null; next()">
              Liever niet zeggen
            </button>
          </template>

          <!-- photo -->
          <template v-else-if="step === 'photo'">
            <OnboardBubble text="Zet er een gezicht bij." sub="Zo vinden je speelpartners je terug tussen de 50 anderen." />
            <PhotoPicker v-model="form.photo" :name="firstName" />
          </template>

          <!-- level -->
          <template v-else-if="step === 'level'">
            <OnboardBubble text="Hoe goed ken je padel al?" sub="Geen verkeerd antwoord — we matchen je met mensen op jouw niveau." />
            <div class="grid gap-2.5">
              <button
                v-for="option in LEVELS" :key="option.value" type="button"
                class="flex items-center gap-3.5 rounded-2xl border p-4 text-left transition-all duration-300 active:scale-[0.98]"
                :class="form.level === option.value
                  ? 'border-lime-400 bg-lime-400/12 shadow-[0_10px_30px_-16px_color-mix(in_oklab,var(--color-lime-400)_90%,transparent)]'
                  : 'border-cream/12 bg-cream/[0.04] hover:border-cream/25'"
                @click="form.level = option.value; buzz(10)"
              >
                <span
                  class="grid h-10 w-10 shrink-0 place-items-center rounded-xl font-display text-sm font-extrabold"
                  :class="form.level === option.value ? 'bg-lime-400 text-navy-900' : 'bg-cream/10 text-cream/60'"
                >{{ option.value }}</span>
                <span class="min-w-0">
                  <span class="block font-display text-base font-bold text-cream">{{ option.label }}</span>
                  <span class="block text-[0.82rem] text-cream/55">{{ option.blurb }}</span>
                </span>
              </button>
            </div>
          </template>

          <!-- hours -->
          <template v-else-if="step === 'hours'">
            <OnboardBubble text="Hoeveel tijd wil je per week aan padel geven?" sub="Dit bepaalt met wie je gematcht wordt — mensen met hetzelfde ritme." />
            <div class="grid grid-cols-2 gap-2.5">
              <button
                v-for="option in HOURS_OPTIONS" :key="option.value" type="button"
                class="rounded-2xl border p-4 text-left transition-all duration-300 active:scale-[0.97]"
                :class="form.hoursPerWeek === option.value
                  ? 'border-lime-400 bg-lime-400/12'
                  : 'border-cream/12 bg-cream/[0.04] hover:border-cream/25'"
                @click="form.hoursPerWeek = option.value; buzz(10)"
              >
                <span class="block font-display text-lg font-extrabold text-cream">{{ option.label }}</span>
                <span class="mt-0.5 block text-[0.78rem] leading-snug text-cream/55">{{ option.blurb }}</span>
              </button>
            </div>
          </template>

          <!-- availability -->
          <template v-else-if="step === 'availability'">
            <OnboardBubble text="Wanneer kan jij meestal padellen?" sub="Dit is het belangrijkste stukje: we zetten je bij mensen die op dezelfde momenten vrij zijn." />
            <AvailabilityGrid v-model="form.availability" />
          </template>

          <!-- hobbies -->
          <template v-else-if="step === 'hobbies'">
            <OnboardBubble text="Waar krijg jij nog energie van?" sub="Leuke gespreksstof tussen twee games door." />
            <div class="flex flex-wrap gap-2">
              <button
                v-for="hobby in HOBBY_OPTIONS" :key="hobby" type="button" class="pc-chip"
                :data-on="form.hobbies.includes(hobby)" @click="toggleHobby(hobby)"
              >
                {{ hobby }}
              </button>
            </div>
          </template>

          <!-- bio -->
          <template v-else-if="step === 'bio'">
            <OnboardBubble text="Nog iets dat we moeten weten?" sub="Eén zin volstaat. Of sla over." />
            <div>
              <textarea
                v-model="form.bio" class="pc-input min-h-28 resize-none" maxlength="160"
                placeholder="Ik ben er vooral voor de afterparty, maar ik sla hard."
              />
              <p class="mt-1.5 text-right text-xs text-cream/40">
                {{ form.bio.length }}/160
              </p>
            </div>
          </template>

          <!-- phone -->
          <template v-else-if="step === 'phone'">
            <OnboardBubble text="Op welk nummer kunnen nieuwe speelpartners je bereiken?" sub="Enkel zichtbaar voor mensen die jij na een match toevoegt. Nooit voor de rest." />
            <input
              v-model="form.phone" type="tel" inputmode="tel" autocomplete="tel"
              class="pc-input text-xl font-semibold" placeholder="0470 12 34 56" @keydown="onEnter"
            >
            <NuxtLink to="/privacy" target="_blank" class="flex w-fit items-center gap-1.5 text-sm text-lime-300 underline-offset-4 hover:underline">
              <PcIcon name="shield" :size="15" />Wat doen we met je gegevens?
            </NuxtLink>
          </template>

          <!-- pin -->
          <template v-else-if="step === 'pin'">
            <OnboardBubble text="Kies een pincode van 4 cijfers." sub="Daarmee log je straks in. Onthoud 'm — hij is je enige sleutel." />
            <PinPad v-model="form.pin" :auto-submit="false" />
            <p v-if="pinHint" class="text-center text-sm font-semibold text-[color:var(--color-flame)]">
              {{ pinHint }}
            </p>
          </template>

          <!-- confirm pin -->
          <template v-else-if="step === 'confirm'">
            <OnboardBubble text="Nog eens, om zeker te zijn." sub="Typ dezelfde pincode opnieuw." />
            <PinPad v-model="form.pinConfirm" :auto-submit="false" />
            <p v-if="form.pinConfirm.length === 4 && form.pinConfirm !== form.pin" class="text-center text-sm font-semibold text-[color:var(--color-flame)]">
              Die komt niet overeen.
            </p>
          </template>

          <!-- consent -->
          <template v-else-if="step === 'consent'">
            <OnboardBubble text="Laatste stap: jouw akkoord." sub="Kort samengevat, en de volledige versie staat op de privacypagina." />
            <div class="pc-card space-y-3 p-5 text-[0.86rem] leading-relaxed text-cream/75">
              <p class="flex gap-2.5">
                <PcIcon name="check" :size="17" class="mt-0.5 text-lime-400" />
                <span>Je naam, foto, niveau en speelmomenten zijn zichtbaar voor andere deelnemers.</span>
              </p>
              <p class="flex gap-2.5">
                <PcIcon name="lock" :size="17" class="mt-0.5 text-lime-400" />
                <span>Je <strong class="text-cream">telefoonnummer</strong> delen we alleen met de mensen die jij zelf toevoegt.</span>
              </p>
              <p class="flex gap-2.5">
                <PcIcon name="trash" :size="17" class="mt-0.5 text-lime-400" />
                <span>Alles wordt uiterlijk <strong class="text-cream">30 dagen</strong> na het event gewist. Eerder stoppen kan altijd.</span>
              </p>
            </div>

            <label class="flex cursor-pointer items-start gap-3 rounded-2xl border border-cream/12 bg-cream/[0.04] p-4">
              <input v-model="form.consent" type="checkbox" class="peer sr-only">
              <span
                class="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 transition-all duration-300"
                :class="form.consent ? 'border-lime-400 bg-lime-400 text-navy-900' : 'border-cream/30 text-transparent'"
              >
                <PcIcon name="check" :size="15" :stroke="3" />
              </span>
              <span class="text-[0.88rem] leading-snug text-cream/80">
                Ik ga akkoord met de
                <NuxtLink to="/privacy" target="_blank" class="text-lime-300 underline underline-offset-4" @click.stop>privacyverklaring</NuxtLink>
                van Padel Connect.
              </span>
            </label>
          </template>
        </section>
      </Transition>
    </div>

    <!-- ── footer ───────────────────────────────────────────────────────── -->
    <!-- A blurred bar with a soft fade above it: an opaque gradient would cut
         a visible band across the aurora behind the page. -->
    <footer
      class="sticky bottom-0 -mx-5 space-y-3 px-5 lg:-mx-8 lg:px-8 pb-2 pt-4 backdrop-blur-xl
             before:pointer-events-none before:absolute before:inset-x-0 before:bottom-full before:h-12
             before:bg-linear-to-t before:from-navy-950/70 before:to-transparent
             after:pointer-events-none after:absolute after:inset-0 after:-z-10 after:bg-navy-950/70"
    >
      <p v-if="error" class="text-center text-sm font-semibold text-[color:var(--color-flame)]">
        {{ error }}
      </p>
      <button type="button" class="pc-btn pc-btn-primary w-full text-base" :disabled="!valid || submitting" @click="next">
        <template v-if="submitting">
          <PcIcon name="refresh" :size="18" class="animate-spin" />Bezig…
        </template>
        <template v-else>
          {{ CTA[step] ?? 'Volgende' }}
          <PcIcon v-if="step !== 'consent'" name="arrowRight" :size="18" />
        </template>
      </button>
    </footer>
  </main>
</template>
