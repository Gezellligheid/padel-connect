<script setup lang="ts">
import { BackendError } from '~/lib/backend'

const crew = useCrewStore()
const pin = ref('')
const error = ref('')
const shake = ref(false)
const busy = ref(false)

async function submit(value: string) {
  busy.value = true
  error.value = ''
  try {
    await crew.login(value)
  }
  catch (caught) {
    error.value = caught instanceof BackendError ? caught.message : 'Inloggen mislukt.'
    shake.value = true
    setTimeout(() => {
      shake.value = false
      pin.value = ''
    }, 450)
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="flex min-h-dvh flex-col items-center justify-center gap-9 px-5 py-10">
    <div class="flex flex-col items-center gap-4 text-center">
      <img src="/logo.png" alt="Padel Connect" class="w-44" width="517" height="306">
      <div>
        <p class="font-display text-xs font-bold uppercase tracking-[0.2em] text-ink/40">
          Crew
        </p>
        <h1 class="mt-1 font-display text-3xl text-ink">
          Management
        </h1>
      </div>
    </div>

    <PinPad v-model="pin" tone="cream" :shake="shake" @complete="submit" />

    <div class="min-h-10 text-center">
      <p v-if="error" class="text-sm font-semibold text-[color:var(--color-flame)]">
        {{ error }}
      </p>
      <p v-else-if="busy" class="text-sm text-ink/50">
        Even kijken…
      </p>
      <p v-else class="max-w-xs text-sm text-ink/45">
        Geef de crew-pincode in om het event te beheren.
      </p>
    </div>

    <NuxtLink to="/" class="text-sm font-semibold text-ink/45 underline-offset-4 hover:text-ink hover:underline">
      Terug naar de spelersapp
    </NuxtLink>
  </div>
</template>
