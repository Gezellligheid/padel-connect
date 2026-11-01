/** A single shared ticking clock — one interval for the whole app. */
const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | undefined
let subscribers = 0

export function useClock() {
  if (import.meta.client) {
    onMounted(() => {
      subscribers++
      if (!timer) timer = setInterval(() => (now.value = Date.now()), 1000)
    })
    onBeforeUnmount(() => {
      subscribers--
      if (subscribers <= 0 && timer) {
        clearInterval(timer)
        timer = undefined
      }
    })
  }
  return now
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })
}
