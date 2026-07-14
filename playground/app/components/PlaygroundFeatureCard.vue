<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  description: string
  to: string
  icon: string
  meta?: string
}>(), {
  meta: '',
})
</script>

<template>
  <NuxtLink :to="to" class="nfz-feature-card">
    <span class="nfz-feature-card__icon" aria-hidden="true">{{ icon }}</span>
    <span class="nfz-feature-card__content">
      <span class="nfz-feature-card__title">{{ title }}</span>
      <span class="nfz-feature-card__description">{{ description }}</span>
      <span v-if="meta" class="nfz-feature-card__meta">{{ meta }}</span>
    </span>
    <span class="nfz-feature-card__arrow" aria-hidden="true">→</span>
  </NuxtLink>
</template>
