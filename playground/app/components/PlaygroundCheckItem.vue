<script setup lang="ts">
const props = withDefaults(defineProps<{
  title: string
  description: string
  status?: 'idle' | 'running' | 'success' | 'warning' | 'error' | 'skipped'
  detail?: string
}>(), {
  status: 'idle',
  detail: '',
})

const label = computed(() => ({
  idle: 'À lancer',
  running: 'En cours',
  success: 'Validé',
  warning: 'À vérifier',
  error: 'Échec',
  skipped: 'Non applicable',
}[props.status]))

const tone = computed(() => ({
  idle: 'neutral',
  running: 'info',
  success: 'success',
  warning: 'warning',
  error: 'danger',
  skipped: 'neutral',
}[props.status] as 'neutral' | 'info' | 'success' | 'warning' | 'danger'))
</script>

<template>
  <div class="nfz-check-item" :data-status="status">
    <div class="nfz-check-item__mark" aria-hidden="true">
      <span v-if="status === 'success'">✓</span>
      <span v-else-if="status === 'error'">×</span>
      <span v-else-if="status === 'warning'">!</span>
      <span v-else-if="status === 'running'" class="nfz-spinner" />
      <span v-else>·</span>
    </div>
    <div class="nfz-check-item__content">
      <div class="nfz-check-item__heading">
        <strong>{{ title }}</strong>
        <PlaygroundStatusBadge :label="label" :tone="tone" />
      </div>
      <p>{{ description }}</p>
      <small v-if="detail">{{ detail }}</small>
    </div>
  </div>
</template>
