<script setup lang="ts">
defineProps<{ message: string }>()
</script>

<template>
  <div class="sticky top-0 z-40 flex items-center gap-2 bg-[color:var(--color-flame)]/15 px-4 py-2 text-xs font-semibold text-[color:var(--color-flame)] backdrop-blur">
    <PcIcon name="info" :size="15" />
    <span class="truncate">Verbindingsprobleem — {{ message }}</span>
  </div>
</template>
