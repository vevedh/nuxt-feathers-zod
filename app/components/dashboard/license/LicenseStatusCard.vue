<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  license: Record<string, any>
  runtime: Record<string, any>
}>()

type MetricItem = {
  label: string
  value: string
  breakLine?: boolean
}

const featureCount = computed(() => (props.license?.features || props.runtime?.features || []).length)
const seats = computed(() => props.license?.metadata?.seats || props.runtime?.seats || 'n/a')
const expiresAtLabel = computed(() => {
  const value = props.license?.expiresAt || props.runtime?.expiresAt
  if (!value) return 'illimitée'
  try {
    return new Date(value).toLocaleDateString()
  }
  catch {
    return value
  }
})
const issuedAtLabel = computed(() => {
  const value = props.license?.issuedAt || props.runtime?.issuedAt
  if (!value) return 'n/a'
  try {
    return new Date(value).toLocaleDateString()
  }
  catch {
    return value
  }
})
const metrics = computed<MetricItem[]>(() => {
  return [
    { label: 'Plan', value: props.license.plan || props.runtime.plan || 'community' },
    { label: 'Customer', value: props.license.customer || 'non renseigné', breakLine: true },
    { label: 'Features', value: String(featureCount.value) },
    { label: 'Source', value: props.license.source || props.runtime.licenseSource || 'default', breakLine: true },
    { label: 'Expiration', value: expiresAtLabel.value },
    { label: 'Seats', value: String(seats.value) },
  ]
})
</script>

<template>
  <QCard flat bordered class="dash-panel p-4 md:p-5">
    <QCardSection class="p-0">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div class="min-w-0 flex-1">
          <div class="dash-kicker">Licence active</div>
          <div class="mt-2 text-xl font-semibold nfz-title break-words md:text-2xl">{{ license.edition || runtime.edition || 'community' }}</div>
          <div class="mt-1 text-sm nfz-subtitle">{{ license.note || 'License scaffold only : env + fichier local, sans signature cryptographique forte pour le moment.' }}</div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <QChip dense color="primary" text-color="white" icon="mdi-key-chain-variant">{{ license.status || 'missing' }}</QChip>
          <QChip dense outline color="grey-7">émise {{ issuedAtLabel }}</QChip>
        </div>
      </div>
    </QCardSection>

    <QSeparator class="my-4" />

    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <div v-for="metric in metrics" :key="metric.label" class="builder-soft-card min-w-0 px-3 py-3 text-sm">
        <div class="nfz-subtitle text-xs">{{ metric.label }}</div>
        <div :class="metric.breakLine ? 'mt-1 break-all font-semibold nfz-title' : 'mt-1 break-words font-semibold nfz-title'">{{ metric.value }}</div>
      </div>
    </div>
  </QCard>
</template>
