<script setup lang="ts">
const store = usePadelStore()
const route = useRoute()

const items = computed(() => [
  { to: '/app', icon: 'home', label: 'Start', badge: 0 },
  {
    to: '/app/match',
    icon: 'racket',
    label: 'Match',
    badge: store.phase === 'playing' || store.phase === 'connecting' ? -1 : 0,
  },
  { to: '/app/friends', icon: 'users', label: 'Connecties', badge: store.friends.length },
  { to: '/app/profile', icon: 'user', label: 'Jij', badge: 0 },
])

const isActive = (to: string) => (to === '/app' ? route.path === '/app' : route.path.startsWith(to))
</script>

<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.6rem,var(--bottom-safe))] pt-2 lg:static lg:z-auto lg:shrink-0 lg:px-3 lg:pb-3"
    aria-label="Hoofdnavigatie"
  >
    <div
      class="mx-auto flex max-w-md items-stretch gap-1 rounded-2xl border border-cream/12 bg-navy-900/80 p-1.5 backdrop-blur-2xl shadow-[0_24px_50px_-20px_rgba(0,0,0,0.9)] lg:shadow-none"
    >
      <NuxtLink
        v-for="item in items" :key="item.to" :to="item.to"
        class="group relative flex flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2.5 transition-colors duration-300"
        :class="isActive(item.to) ? 'text-navy-900' : 'text-cream/55 hover:text-cream'"
      >
        <span
          v-if="isActive(item.to)"
          class="absolute inset-0 rounded-xl bg-linear-to-br from-lime-300 to-lime-500 shadow-[0_8px_22px_-8px_color-mix(in_oklab,var(--color-lime-400)_90%,transparent)]"
        />
        <span class="relative">
          <PcIcon :name="item.icon" :size="21" />
          <span
            v-if="item.badge > 0"
            class="absolute -right-2.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-[color:var(--color-berry)] px-1 text-[0.6rem] font-bold text-white"
          >{{ item.badge > 9 ? '9+' : item.badge }}</span>
          <span
            v-else-if="item.badge === -1"
            class="absolute -right-1.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[color:var(--color-flame)]"
          >
            <span class="absolute inset-0 animate-ping rounded-full bg-[color:var(--color-flame)]" />
          </span>
        </span>
        <span class="relative font-display text-[0.63rem] font-bold uppercase tracking-wider">{{ item.label }}</span>
      </NuxtLink>
    </div>
  </nav>
</template>
