<script setup lang="ts">
const props = withDefaults(defineProps<{
  title?: string
  value: unknown
  collapsed?: boolean
}>(), {
  title: 'Détails techniques',
  collapsed: true,
})

const copied = ref(false)
const text = computed(() => {
  try {
    return JSON.stringify(props.value, null, 2)
  }
  catch {
    return String(props.value ?? '')
  }
})

async function copy() {
  if (!import.meta.client) return
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text.value)
  }
  else {
    const textarea = document.createElement('textarea')
    textarea.value = text.value
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    textarea.remove()
  }
  copied.value = true
  window.setTimeout(() => { copied.value = false }, 1400)
}
</script>

<template>
  <details class="nfz-json-panel" :open="!collapsed">
    <summary>{{ title }}</summary>
    <div class="nfz-json-panel__toolbar">
      <button type="button" class="nfz-button nfz-button--ghost nfz-button--small" @click="copy">
        {{ copied ? 'Copié' : 'Copier le JSON' }}
      </button>
    </div>
    <pre>{{ text }}</pre>
  </details>
</template>
