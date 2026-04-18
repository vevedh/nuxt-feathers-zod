<script setup lang="ts">
withDefaults(defineProps<{
  kicker?: string
  title?: string
  copy?: string
  pathLabel?: string
  stickyControls?: boolean
}>(), {
  kicker: 'Test preview',
  title: 'Méthodes du service',
  copy: 'Prévisualise la forme des requêtes et réponses sans exécuter encore l’appel réel.',
  pathLabel: '',
  stickyControls: true,
})
</script>

<template>
  <QCard flat bordered class="builder-card">
    <QCardSection class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="min-w-0">
        <div class="builder-kicker">{{ kicker }}</div>
        <h2 class="mt-1 builder-heading">{{ title }}</h2>
        <div class="builder-copy">{{ copy }}</div>
      </div>
      <QBadge v-if="pathLabel" outline color="primary" class="self-start break-all">{{ pathLabel }}</QBadge>
    </QCardSection>
    <QSeparator />
    <QCardSection class="grid items-start gap-4 2xl:grid-cols-[340px,minmax(0,1fr)]">
      <div :class="stickyControls ? 'grid gap-3 2xl:sticky 2xl:top-4 self-start min-w-0' : 'grid gap-3 self-start min-w-0'">
        <slot name="controls" />
      </div>
      <div class="min-w-0">
        <slot name="preview" />
      </div>
    </QCardSection>
  </QCard>
</template>
