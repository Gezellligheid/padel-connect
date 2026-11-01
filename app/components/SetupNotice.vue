<script setup lang="ts">
/**
 * Firebase has two halves: the public web config (client) and a service
 * account (server). With only the first one set, every sign-in fails with a
 * 503 — so say that out loud instead of letting the crew guess.
 */
const mode = useBackendMode()
const serverReady = ref(true)

onMounted(async () => {
  if (mode.value !== 'firebase') return
  try {
    const health = await $fetch<{ mode: string }>('/api/health')
    serverReady.value = health.mode === 'firebase'
  }
  catch {
    serverReady.value = false
  }
})
</script>

<template>
  <Transition name="pop">
    <div
      v-if="!serverReady"
      class="mx-auto mb-4 flex max-w-xl items-start gap-3 rounded-2xl border border-[color:var(--color-flame)]/40 bg-[color:var(--color-flame)]/10 px-4 py-3"
    >
      <PcIcon name="info" :size="18" class="mt-0.5 shrink-0 text-[color:var(--color-flame)]" />
      <div class="text-[0.82rem] leading-snug text-cream/80">
        <p class="font-display text-[0.95rem] text-[color:var(--color-flame)]">
          Serverconfiguratie ontbreekt
        </p>
        <p class="mt-0.5">
          De Firebase-webconfig staat ingesteld, maar de server heeft nog geen service account.
          Zet <code class="rounded bg-cream/10 px-1 py-0.5 text-[0.78rem]">NUXT_FIREBASE_SERVICE_ACCOUNT</code>
          in je omgeving (zie README). Tot dan kan niemand inloggen of inschrijven.
        </p>
      </div>
    </div>
  </Transition>
</template>
