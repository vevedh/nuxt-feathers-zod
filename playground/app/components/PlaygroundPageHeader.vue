<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  description?: string
  eyebrow?: string
}>(), {
  description: '',
  eyebrow: '',
})
</script>

<template>
  <header class="nfz-page-header">
    <div>
      <p v-if="eyebrow" class="nfz-page-header__eyebrow">{{ eyebrow }}</p>
      <h1>{{ title }}</h1>
      <p v-if="description" class="nfz-page-header__description">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="nfz-page-header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>
