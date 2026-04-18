<script setup lang="ts">
defineProps<{
  documentJson: string
  schema?: any
  indexes?: any[]
  dbStats?: any
  loading?: boolean
  schemaBadges?: Array<{ label: string, value: any }>
  indexBadges?: Array<{ label: string, value: any }>
}>()
const emit = defineEmits<{ 'update:documentJson': [value: string] }>()
</script>

<template>
  <section class="nfz-panel mongo-pane rounded-6 h-full p-4 md:p-5">
    <div class="mb-4 flex items-center justify-between gap-2">
      <div>
        <div class="text-xs uppercase tracking-[0.24em] text-[var(--nfz-primary)]">Inspector</div>
        <h2 class="text-lg font-semibold nfz-title">Document / Schema</h2>
      </div>
      <QSpinner v-if="loading" color="primary" size="22px" />
    </div>

    <QCard flat bordered class="mb-4 mongo-card-shell">
      <QCardSection>
        <div class="mb-2 text-sm font-medium nfz-title">Document JSON (édition)</div>
        <QInput
          :model-value="documentJson"
          type="textarea"
          autogrow
          outlined
          @update:model-value="emit('update:documentJson', String($event ?? '{}'))"
        />
      </QCardSection>
    </QCard>

    <div class="mb-4 grid gap-3 md:grid-cols-3">
      <div class="nfz-soft mongo-stat-card px-4 py-3">
        <div class="text-xs nfz-subtitle">Taille DB</div>
        <div class="mt-1 text-sm font-semibold nfz-title">{{ dbStats?.dataSize ?? dbStats?.data?.dataSize ?? '—' }}</div>
      </div>
      <div class="nfz-soft mongo-stat-card px-4 py-3">
        <div class="text-xs nfz-subtitle">Objets DB</div>
        <div class="mt-1 text-sm font-semibold nfz-title">{{ dbStats?.objects ?? dbStats?.data?.objects ?? '—' }}</div>
      </div>
      <div class="nfz-soft mongo-stat-card px-4 py-3">
        <div class="text-xs nfz-subtitle">Collections DB</div>
        <div class="mt-1 text-sm font-semibold nfz-title">{{ dbStats?.collections ?? dbStats?.data?.collections ?? '—' }}</div>
      </div>
    </div>

    <div class="mb-4 flex flex-wrap gap-2">
      <QChip v-for="badge in schemaBadges || []" :key="`s-${badge.label}`" class="mongo-chip-schema" dense>
        {{ badge.label }} · {{ badge.value }}
      </QChip>
      <QChip v-for="badge in indexBadges || []" :key="`i-${badge.label}`" class="mongo-chip-index" dense>
        {{ badge.label }} · {{ badge.value }}
      </QChip>
    </div>

    <div class="grid gap-4 xl:grid-cols-2">
      <QCard flat bordered class="mongo-card-shell">
        <QCardSection>
          <div class="mb-2 text-sm font-medium nfz-title">Schema</div>
          <pre class="max-h-[16rem] overflow-auto whitespace-pre-wrap break-all text-xs nfz-title">{{ JSON.stringify(schema ?? {}, null, 2) }}</pre>
        </QCardSection>
      </QCard>

      <QCard flat bordered class="mongo-card-shell">
        <QCardSection>
          <div class="mb-2 text-sm font-medium nfz-title">Indexes</div>
          <pre class="max-h-[16rem] overflow-auto whitespace-pre-wrap break-all text-xs nfz-title">{{ JSON.stringify(indexes ?? [], null, 2) }}</pre>
        </QCardSection>
      </QCard>
    </div>
  </section>
</template>
