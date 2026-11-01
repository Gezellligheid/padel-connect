const LIME = ['#c2d92e', '#dcee88', '#ffffff', '#46c8ff', '#001f42']

/** Confetti + a short haptic buzz. Both degrade to nothing where unsupported. */
export function useCelebrate() {
  async function burst(options: { spread?: number, particles?: number, origin?: { x: number, y: number } } = {}) {
    if (!import.meta.client) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const { default: confetti } = await import('canvas-confetti')
    confetti({
      particleCount: options.particles ?? 90,
      spread: options.spread ?? 78,
      startVelocity: 42,
      scalar: 0.95,
      ticks: 180,
      colors: LIME,
      origin: options.origin ?? { x: 0.5, y: 0.62 },
      disableForReducedMotion: true,
    })
  }

  async function rain(durationMs = 1800) {
    if (!import.meta.client) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const { default: confetti } = await import('canvas-confetti')
    const end = Date.now() + durationMs
    const frame = () => {
      confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors: LIME })
      confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors: LIME })
      if (Date.now() < end) requestAnimationFrame(frame)
    }
    frame()
  }

  function buzz(pattern: number | number[] = 12) {
    if (!import.meta.client) return
    try {
      navigator.vibrate?.(pattern)
    }
    catch {
      /* iOS Safari has no vibrate — fine. */
    }
  }

  return { burst, rain, buzz }
}
