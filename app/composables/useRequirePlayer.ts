/**
 * Guards the player area. Auth resolves asynchronously (Firebase restores the
 * session from storage), so we wait for `ready` instead of bouncing on mount.
 */
export function useRequirePlayer() {
  const store = usePadelStore()

  onMounted(() => {
    store.start()
    watch(
      () => [store.ready, store.playerId] as const,
      ([ready, playerId]) => {
        if (ready && !playerId) navigateTo('/login')
      },
      { immediate: true },
    )
  })

  return store
}
