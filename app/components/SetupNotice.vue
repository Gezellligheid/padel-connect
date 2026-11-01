<script setup lang="ts">
/**
 * Firebase has two halves: the public web config (client) and a service
 * account (server). With only the first one set, every sign-in fails — so say
 * that out loud instead of letting the crew guess.
 *
 * Three states are worth distinguishing, because the fix differs per state:
 * the key is missing, the key is there but the Admin SDK will not start, or
 * the API itself is unreachable.
 */
interface Health {
  mode: 'demo' | 'firebase'
  adminReady: boolean
  reason: string | null
  detail?: string
}

const mode = useBackendMode()
const problem = ref<null | { title: string, body: string, detail?: string }>(null)

onMounted(async () => {
  if (mode.value !== 'firebase') return
  try {
    const health = await $fetch<Health>('/api/health')
    if (health.adminReady) return

    problem.value = health.reason === 'no_service_account'
      ? {
          title: 'Serverconfiguratie ontbreekt',
          body: 'De Firebase-webconfig staat ingesteld, maar de server heeft nog geen service account. Zet NUXT_FIREBASE_SERVICE_ACCOUNT in je omgeving (zie README).',
        }
      : {
          title: 'Firebase start niet op de server',
          body: 'De service account is ingesteld, maar de Admin SDK kon er niet mee opstarten. Controleer of de sleutel volledig is overgenomen en bij hetzelfde project hoort.',
          detail: health.detail,
        }
  }
  catch {
    problem.value = {
      title: 'Server niet bereikbaar',
      body: 'De API antwoordt niet. Bekijk de serverlogs van deze deployment.',
    }
  }
})
</script>

<template>
  <Transition name="pop">
    <div
      v-if="problem"
      class="mx-auto mb-4 flex max-w-xl items-start gap-3 rounded-2xl border border-[color:var(--color-flame)]/40 bg-[color:var(--color-flame)]/10 px-4 py-3"
    >
      <PcIcon name="info" :size="18" class="mt-0.5 shrink-0 text-[color:var(--color-flame)]" />
      <div class="min-w-0 text-[0.82rem] leading-snug text-cream/80">
        <p class="font-display text-[0.95rem] text-[color:var(--color-flame)]">
          {{ problem.title }}
        </p>
        <p class="mt-0.5">
          {{ problem.body }}
        </p>
        <p v-if="problem.detail" class="mt-1.5 truncate font-mono text-[0.72rem] text-cream/45" :title="problem.detail">
          {{ problem.detail }}
        </p>
        <p class="mt-1">
          Tot dan kan niemand inloggen of inschrijven.
        </p>
      </div>
    </div>
  </Transition>
</template>
