<script setup lang="ts">
import LicenseGuardBadge from './LicenseGuardBadge.vue'

const props = withDefaults(defineProps<{
  title: string
  copy?: string
  allowed: boolean
  reason?: string
  ctaLabel?: string
  ctaTo?: string
  ctaIcon?: string
}>(), {
  copy: '',
  reason: '',
  ctaLabel: '',
  ctaTo: '',
  ctaIcon: 'open_in_new',
})
</script>

<template>
  <QCard flat bordered class="dash-panel p-4 md:p-5">
    <QCardSection class="p-0 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="min-w-0 flex-1">
        <div class="builder-panel-title">{{ title }}</div>
        <div v-if="copy" class="mt-1 text-sm nfz-subtitle">{{ copy }}</div>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <slot name="header-actions" />
        <LicenseGuardBadge :state="allowed ? 'enabled' : 'locked'" :hint="reason" />
      </div>
    </QCardSection>

    <QSeparator class="my-4" />

    <div v-if="allowed" class="grid gap-3">
      <slot />
      <div v-if="ctaLabel && ctaTo" class="flex flex-wrap gap-2">
        <QBtn flat color="primary" :icon="ctaIcon" :label="ctaLabel" :to="ctaTo" />
      </div>
    </div>
    <div v-else class="builder-soft-card px-4 py-4 text-sm">
      <div class="font-medium nfz-title">Fonction verrouillée</div>
      <div class="mt-1 nfz-subtitle">{{ reason || 'Cette fonctionnalité nécessitera une licence ou une édition supérieure.' }}</div>
      <div v-if="ctaLabel && ctaTo" class="mt-3">
        <QBtn flat color="primary" :icon="ctaIcon" :label="ctaLabel" :to="ctaTo" />
      </div>
      <slot name="locked" />
    </div>
  </QCard>
</template>
