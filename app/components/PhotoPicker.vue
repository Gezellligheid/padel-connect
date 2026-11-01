<script setup lang="ts">
const model = defineModel<string | null>({ default: null })
const props = withDefaults(defineProps<{ name?: string, size?: number }>(), { name: '', size: 150 })

const input = useTemplateRef<HTMLInputElement>('input')
const busy = ref(false)
const error = ref('')

/** Centre-crops to a square and downscales to 320px, so a profile picture
 *  costs ~25 KB instead of the 4 MB a phone camera hands us. */
async function processFile(file: File) {
  busy.value = true
  error.value = ''
  try {
    const bitmap = await createImageBitmap(file)
    const side = Math.min(bitmap.width, bitmap.height)
    const target = 320
    const canvas = document.createElement('canvas')
    canvas.width = target
    canvas.height = target
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas')
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(
      bitmap,
      (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side,
      0, 0, target, target,
    )
    bitmap.close?.()

    let quality = 0.82
    let data = canvas.toDataURL('image/jpeg', quality)
    while (data.length > 120_000 && quality > 0.4) {
      quality -= 0.12
      data = canvas.toDataURL('image/jpeg', quality)
    }
    model.value = data
  }
  catch {
    error.value = 'Die foto konden we niet verwerken. Probeer een andere.'
  }
  finally {
    busy.value = false
  }
}

function onChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) void processFile(file)
}
</script>

<template>
  <div class="flex flex-col items-center gap-4">
    <button
      type="button"
      class="group relative grid place-items-center rounded-full transition-transform duration-500 active:scale-95"
      :style="{ width: `${props.size}px`, height: `${props.size}px` }"
      @click="input?.click()"
    >
      <span
        class="absolute inset-0 rounded-full bg-linear-to-br from-lime-300/70 via-lime-500/30 to-transparent blur-md transition-opacity duration-500"
        :class="model ? 'opacity-90' : 'opacity-50 group-hover:opacity-80'"
      />
      <span class="absolute inset-[3px] overflow-hidden rounded-full bg-navy-900">
        <img v-if="model" :src="model" alt="" class="h-full w-full object-cover">
        <span v-else class="flex h-full w-full flex-col items-center justify-center gap-1.5 text-cream/50">
          <PcIcon name="camera" :size="28" />
          <span class="font-display text-[0.65rem] font-bold uppercase tracking-widest">Foto</span>
        </span>
      </span>
      <span
        v-if="busy"
        class="absolute inset-[3px] grid place-items-center rounded-full bg-navy-950/70 text-lime-300"
      >
        <PcIcon name="refresh" :size="24" class="animate-spin" />
      </span>
      <span
        class="absolute bottom-0.5 right-0.5 grid h-9 w-9 place-items-center rounded-full bg-linear-to-br from-lime-300 to-lime-500 text-navy-900 shadow-lg transition-transform duration-300 group-hover:scale-110"
      >
        <PcIcon :name="model ? 'refresh' : 'plus'" :size="17" />
      </span>
    </button>

    <input
      ref="input" type="file" accept="image/*" capture="user" class="sr-only"
      :aria-label="`Profielfoto van ${props.name || 'jou'}`" @change="onChange"
    >

    <div class="flex items-center gap-3 text-xs">
      <button v-if="model" type="button" class="text-cream/50 underline-offset-4 hover:text-cream hover:underline" @click="model = null">
        Verwijderen
      </button>
      <p v-else class="text-cream/45">
        Zodat je speelpartners je herkennen op het veld.
      </p>
    </div>

    <p v-if="error" class="text-xs font-semibold text-[color:var(--color-flame)]">
      {{ error }}
    </p>
  </div>
</template>
