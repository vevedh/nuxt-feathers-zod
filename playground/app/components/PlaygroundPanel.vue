<script setup lang="ts">
withDefaults(defineProps<{
  title?: string
  description?: string
  padded?: boolean
}>(), {
  title: '',
  description: '',
  padded: true,
})
</script>

<template>
  <section class="nfz-panel" :class="{ 'nfz-panel--flush': !padded }">
    <header v-if="title || description || $slots.actions" class="nfz-panel__header">
      <div>
        <h2 v-if="title">{{ title }}</h2>
        <p v-if="description">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="nfz-panel__actions">
        <slot name="actions" />
      </div>
    </header>
    <div class="nfz-panel__body">
      <slot />
    </div>
  </section>
</template>
