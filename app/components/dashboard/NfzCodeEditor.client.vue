<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue'

const props = withDefaults(defineProps<{
  modelValue?: string
  mode?: 'json' | 'ts' | 'diff' | 'bash'
  dark?: boolean
  disabled?: boolean
  minHeight?: string
  height?: string
}>(), {
  modelValue: '',
  mode: 'ts',
  dark: false,
  disabled: false,
  minHeight: '420px',
  height: undefined,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const editorComponent = shallowRef<any>(null)
const extensions = shallowRef<any[]>([])
const loadState = ref<'loading' | 'ready' | 'fallback'>('loading')
const loadError = ref('')
const jsonFactory = shallowRef<null | (() => any)>(null)
const tsFactory = shallowRef<null | (() => any)>(null)

const editorStyle = computed(() => ({
  minHeight: props.minHeight,
  height: props.height || undefined,
}))

function resolveExtensions() {
  if (!jsonFactory.value || !tsFactory.value) {
    extensions.value = []
    return
  }

  if (props.mode === 'json') {
    extensions.value = [jsonFactory.value()]
    return
  }

  if (props.mode === 'ts') {
    extensions.value = [tsFactory.value()]
    return
  }

  extensions.value = []
}

onMounted(async () => {
  try {
    const [{ default: codeMirror }, jsonMod, javascriptMod] = await Promise.all([
      import('vue-codemirror6'),
      import('@codemirror/lang-json'),
      import('@codemirror/lang-javascript'),
    ])

    editorComponent.value = codeMirror
    jsonFactory.value = () => jsonMod.json()
    tsFactory.value = () => javascriptMod.javascript({ typescript: true })
    resolveExtensions()
    loadState.value = 'ready'
  }
  catch (error: any) {
    console.error('[NFZ builder] CodeMirror unavailable, fallback textarea enabled', error)
    loadError.value = String(error?.message || error || 'CodeMirror unavailable')
    loadState.value = 'fallback'
  }
})

watch(() => props.mode, () => {
  if (loadState.value === 'ready') resolveExtensions()
})

function handleTextareaInput(event: Event) {
  emit('update:modelValue', String((event.target as HTMLTextAreaElement | null)?.value ?? ''))
}
</script>

<template>
  <component
    :is="editorComponent"
    v-if="loadState === 'ready' && editorComponent"
    :model-value="modelValue"
    :extensions="extensions"
    :dark="dark"
    :disabled="disabled"
    :style="editorStyle"
    @update:model-value="emit('update:modelValue', String($event ?? ''))"
  />

  <div v-else class="nfz-editor-fallback" :style="editorStyle">
    <div class="nfz-editor-fallback__head">
      <strong>{{ loadState === 'loading' ? 'Chargement de l’éditeur…' : 'Mode fallback' }}</strong>
      <span>{{ loadState === 'fallback' ? 'CodeMirror n’a pas pu être chargé, le builder reste utilisable.' : 'Initialisation client-only en cours.' }}</span>
    </div>

    <textarea
      v-if="!disabled"
      class="nfz-editor-fallback__textarea"
      :value="modelValue"
      :readonly="disabled"
      @input="handleTextareaInput"
    />

    <pre v-else class="nfz-editor-fallback__pre">{{ modelValue }}</pre>

    <div v-if="loadError" class="nfz-editor-fallback__error">{{ loadError }}</div>
  </div>
</template>

<style scoped>
.nfz-editor-fallback {
  display: grid;
  gap: 0.75rem;
  border: 1px solid color-mix(in srgb, var(--nfz-border, #94a3b8) 55%, transparent);
  border-radius: 1rem;
  background: color-mix(in srgb, var(--nfz-surface, #0f172a) 96%, transparent);
  padding: 0.9rem;
}
.nfz-editor-fallback__head {
  display: grid;
  gap: 0.2rem;
  font-size: 0.8rem;
  color: var(--nfz-muted, #94a3b8);
}
.nfz-editor-fallback__textarea,
.nfz-editor-fallback__pre {
  width: 100%;
  min-height: inherit;
  height: 100%;
  border: 0;
  border-radius: 0.8rem;
  padding: 0.9rem 1rem;
  background: color-mix(in srgb, var(--nfz-surface-soft, #111827) 94%, transparent);
  color: var(--nfz-text, #e5e7eb);
  font-family: ui-monospace, SFMono-Regular, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 0.8rem;
  line-height: 1.5;
  resize: vertical;
  white-space: pre-wrap;
  overflow: auto;
}
.nfz-editor-fallback__error {
  font-size: 0.78rem;
  color: #f87171;
}
</style>
