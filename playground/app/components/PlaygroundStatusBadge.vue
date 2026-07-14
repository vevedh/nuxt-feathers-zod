<script setup lang="ts">
withDefaults(defineProps<{
  label: string
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger'
}>(), {
  tone: 'neutral',
})
</script>

<template>
  <span class="nfz-status-badge" :data-tone="tone">
    <span class="nfz-status-badge__dot" aria-hidden="true" />
    {{ label }}
  </span>
</template>
