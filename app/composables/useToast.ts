export interface Toast {
  id: number
  message: string
  tone: 'info' | 'success' | 'error'
}

const toasts = ref<Toast[]>([])
let counter = 0

export function useToast() {
  function push(message: string, tone: Toast['tone'] = 'info', ms = 3600) {
    const id = ++counter
    toasts.value = [...toasts.value, { id, message, tone }]
    if (import.meta.client) {
      setTimeout(() => dismiss(id), ms)
    }
    return id
  }

  function dismiss(id: number) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  return {
    toasts: readonly(toasts),
    push,
    dismiss,
    success: (message: string) => push(message, 'success'),
    error: (message: string) => push(message, 'error', 5000),
    info: (message: string) => push(message, 'info'),
  }
}
