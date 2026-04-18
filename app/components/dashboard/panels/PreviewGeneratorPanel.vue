<script setup lang="ts">
const props = withDefaults(defineProps<{
  kicker?: string
  title?: string
  copy?: string
  subtitle?: string
  loading?: boolean
  scrollableContent?: boolean
  contentMaxHeightClass?: string
}>(), {
  kicker: 'Preview génération',
  title: 'Dry-run, diff et apply',
  copy: '',
  subtitle: '',
  loading: false,
  scrollableContent: true,
  contentMaxHeightClass: 'max-h-[58vh]',
})

const contentClass = computed(() => {
  const base = 'grid gap-4 xl:grid-cols-[minmax(0,1fr),280px] 2xl:grid-cols-[minmax(0,1fr),300px]'
  if (!props.scrollableContent) return base
  return `${base} ${props.contentMaxHeightClass} overflow-auto`
})
</script>

<template>
  <QCard flat bordered class="relative builder-card">
    <QCardSection class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="min-w-0">
        <div class="builder-kicker">{{ kicker }}</div>
        <h2 class="mt-1 builder-heading">{{ title }}</h2>
        <div v-if="copy" class="builder-copy">{{ copy }}</div>
        <div v-if="subtitle" class="mt-1 text-xs nfz-subtitle">{{ subtitle }}</div>
      </div>
      <div v-if="$slots['header-actions']" class="flex flex-wrap gap-2 sm:justify-end">
        <slot name="header-actions" />
      </div>
    </QCardSection>
    <QSeparator />
    <slot name="tabs" />
    <QSeparator v-if="$slots.tabs" />
    <QCardSection :class="contentClass">
      <div class="grid min-w-0 gap-3">
        <slot name="main" />
      </div>
      <div class="grid min-w-0 gap-3 content-start">
        <slot name="aside" />
      </div>
    </QCardSection>
    <QInnerLoading :showing="loading">
      <QSpinnerBars size="42px" color="primary" />
    </QInnerLoading>
  </QCard>
</template>
