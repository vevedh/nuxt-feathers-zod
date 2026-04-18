<script setup lang="ts">
const props = defineProps<{
  plans: Array<Record<string, any>>
  currentPlan?: string
}>()
</script>

<template>
  <QCard flat bordered class="dash-panel p-4 md:p-5">
    <QCardSection class="p-0">
      <div class="dash-kicker">Editions</div>
      <div class="mt-1 text-lg font-semibold nfz-title">Comparer les plans</div>
    </QCardSection>

    <QSeparator class="my-4" />

    <div class="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
      <div v-for="plan in plans" :key="plan.key" class="builder-soft-card px-4 py-4 min-w-0" :class="plan.key === currentPlan ? 'ring-2 ring-[var(--nfz-primary)]' : ''">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="font-semibold nfz-title">{{ plan.title }}</div>
          <QChip v-if="plan.key === currentPlan" dense color="primary" text-color="white">actif</QChip>
        </div>
        <div class="mt-2 text-sm nfz-subtitle">{{ plan.copy }}</div>
        <div class="mt-3 flex flex-wrap gap-1 text-xs">
          <QChip dense square size="sm" color="grey-8">{{ plan.features.length }} options</QChip>
        </div>
        <div class="mt-3 flex flex-wrap gap-1">
          <QChip v-for="feature in plan.features" :key="feature" dense square size="sm" color="grey-8">{{ feature }}</QChip>
        </div>
      </div>
    </div>
  </QCard>
</template>
