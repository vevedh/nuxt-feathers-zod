<script setup lang="ts">
type PresetField = {
  key: string
  label: string
  type: 'string' | 'password' | 'select' | 'boolean'
  required?: boolean
  placeholder?: string
  help?: string
  default?: any
  options?: Array<{ label: string, value: any }>
}

type PresetDefinition = {
  id: string
  title: string
  description?: string
  fields: PresetField[]
}

type PreviewResponse = {
  ok: boolean
  preset: string
  command: string[]
  plan: Array<{ title: string, details?: string[] }>
}

const presets = ref<PresetDefinition[]>([])
const selectedPresetId = ref<string>('mongo+local-auth+users+seed')
const form = reactive<Record<string, any>>({})
const preview = ref<PreviewResponse | null>(null)
const busy = ref(false)
const error = ref<string | null>(null)

async function loadPresets () {
  error.value = null
  const res = await $fetch<{ presets: PresetDefinition[] }>('/api/nfz/presets')
  presets.value = res.presets
  const preset = presets.value.find(p => p.id === selectedPresetId.value) || presets.value[0]
  if (preset) {
    selectedPresetId.value = preset.id
    // init defaults
    preset.fields.forEach(f => {
      if (form[f.key] === undefined) form[f.key] = f.default ?? (f.type === 'boolean' ? false : '')
    })
  }
}

watch(selectedPresetId, () => {
  const preset = presets.value.find(p => p.id === selectedPresetId.value)
  if (!preset) return
  preset.fields.forEach(f => {
    if (form[f.key] === undefined) form[f.key] = f.default ?? (f.type === 'boolean' ? false : '')
  })
  preview.value = null
})

onMounted(loadPresets)

const selectedPreset = computed(() => presets.value.find(p => p.id === selectedPresetId.value))

async function doPreview () {
  busy.value = true
  error.value = null
  try {
    preview.value = await $fetch<PreviewResponse>('/api/nfz/presets/preview', {
      method: 'POST',
      body: { preset: selectedPresetId.value, params: { ...form } }
    })
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || String(e)
  } finally {
    busy.value = false
  }
}

async function doApply () {
  busy.value = true
  error.value = null
  try {
    await $fetch('/api/nfz/presets/apply', {
      method: 'POST',
      body: { preset: selectedPresetId.value, params: { ...form } }
    })
    await doPreview()
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || String(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-5xl p-4 space-y-6">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold">Preset Init</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Initialiser rapidement un projet Nuxt 4 (MongoDB + auth locale + users + seed).
        </p>
      </div>
      <div class="text-xs text-gray-400">
        API: <code>/api/nfz/presets</code>
      </div>
    </div>

    <UAlert v-if="error" icon="i-heroicons-exclamation-triangle" color="red" variant="soft" :title="error" />

    <UCard>
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="font-medium">Choisir un preset</div>
          <USelect
            v-model="selectedPresetId"
            :options="presets.map(p => ({ label: p.title, value: p.id }))"
            placeholder="Preset"
            class="min-w-72"
          />
        </div>
      </template>

      <div v-if="selectedPreset" class="space-y-4">
        <p v-if="selectedPreset.description" class="text-sm text-gray-600 dark:text-gray-300">
          {{ selectedPreset.description }}
        </p>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div v-for="f in selectedPreset.fields" :key="f.key" class="space-y-1">
            <div class="flex items-center justify-between gap-2">
              <label class="text-sm font-medium">{{ f.label }}</label>
              <span v-if="f.required" class="text-xs text-red-500">requis</span>
            </div>

            <UInput
              v-if="f.type === 'string'"
              v-model="form[f.key]"
              :placeholder="f.placeholder"
            />
            <UInput
              v-else-if="f.type === 'password'"
              v-model="form[f.key]"
              type="password"
              :placeholder="f.placeholder"
            />
            <USelect
              v-else-if="f.type === 'select'"
              v-model="form[f.key]"
              :options="(f.options || []).map(o => ({ label: o.label, value: o.value }))"
            />
            <USwitch
              v-else-if="f.type === 'boolean'"
              v-model="form[f.key]"
            />

            <p v-if="f.help" class="text-xs text-gray-500">{{ f.help }}</p>
          </div>
        </div>

        <div class="flex flex-wrap gap-2 pt-2">
          <UButton :loading="busy" color="gray" variant="soft" @click="doPreview">
            Preview
          </UButton>
          <UButton :loading="busy" color="primary" @click="doApply">
            Apply
          </UButton>
        </div>
      </div>
    </UCard>

    <UCard v-if="preview">
      <template #header>
        <div class="flex items-center justify-between">
          <div class="font-medium">Plan</div>
          <div class="text-xs text-gray-500">
            <span class="mr-2">Commande:</span>
            <code class="text-xs">{{ preview.command.join(' ') }}</code>
          </div>
        </div>
      </template>

      <div class="space-y-4">
        <div v-for="(step, i) in preview.plan" :key="i" class="space-y-1">
          <div class="font-medium">{{ step.title }}</div>
          <ul v-if="step.details?.length" class="list-disc pl-6 text-sm text-gray-600 dark:text-gray-300">
            <li v-for="(d, j) in step.details" :key="j">{{ d }}</li>
          </ul>
        </div>
      </div>
    </UCard>
  </div>
</template>
