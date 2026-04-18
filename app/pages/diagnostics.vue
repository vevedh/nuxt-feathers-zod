<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDashboardTraceStore } from '~/stores/dashboardTrace'

const traceStore = useDashboardTraceStore()
const search = ref('')
const sourceFilter = ref<'all' | 'client' | 'server'>('all')
const levelFilter = ref<'all' | 'info' | 'success' | 'warn' | 'error'>('all')
const eventFilter = ref('')

const { data, refresh, pending } = await useFetch('/api/diagnostics/traces', { default: () => ({ items: [] as Array<Record<string, any>> }) })
const { data: runtimeData, refresh: refreshRuntime } = await useFetch('/api/diagnostics/runtime', {
  default: () => ({
    mode: 'embedded',
    authProvider: 'local',
    servicesDirs: ['services'],
    restPath: '/feathers',
    websocketPath: '/socket.io',
    serverFramework: 'express',
    mongoManagementBasePath: '/mongo-admin',
  }),
})

const merged = computed(() => {
  const client = traceStore.items.map((item: any) => ({ ...item, side: 'client' }))
  const server = ((data.value as any)?.items || []).map((item: any) => ({ ...item, side: 'server' }))
  return [...client, ...server].sort((a, b) => String(b.ts).localeCompare(String(a.ts)))
})

const eventOptions = computed(() => {
  return ['all', ...new Set(merged.value.map(item => String(item.event || '').trim()).filter(Boolean))]
})

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return merged.value.filter((item) => {
    if (sourceFilter.value !== 'all' && item.side !== sourceFilter.value) return false
    if (levelFilter.value !== 'all' && item.level !== levelFilter.value) return false
    if (eventFilter.value && eventFilter.value !== 'all' && item.event !== eventFilter.value) return false
    if (!q) return true
    const haystack = [
      item.message,
      item.event,
      item.source,
      item.side,
      item.level,
      JSON.stringify(item.meta || {}),
    ].join(' ').toLowerCase()
    return haystack.includes(q)
  })
})

const levelCounts = computed(() => {
  return filtered.value.reduce((acc, item) => {
    acc[item.level] = (acc[item.level] || 0) + 1
    return acc
  }, {} as Record<string, number>)
})

const serverCount = computed(() => ((data.value as any)?.items || []).length)
const runtimeSummary = computed(() => runtimeData.value as any || {})
const runtimeCards = computed(() => ([
  { label: 'Mode NFZ', value: runtimeSummary.value.mode || 'n/a' },
  { label: 'Auth', value: runtimeSummary.value.authProvider || 'n/a' },
  { label: 'REST', value: runtimeSummary.value.restPath || 'n/a' },
  { label: 'Socket', value: runtimeSummary.value.websocketPath || 'n/a' },
  { label: 'Framework', value: runtimeSummary.value.serverFramework || 'n/a' },
  { label: 'ServicesDirs', value: (runtimeSummary.value.servicesDirs || []).join(', ') || 'n/a' },
]))

async function refreshAll() {
  await Promise.all([refresh(), refreshRuntime()])
}

async function clearAll() {
  traceStore.clear()
  await $fetch('/api/diagnostics/traces', { method: 'DELETE' }).catch(() => {})
  await refresh()
}

function exportJson() {
  const payload = {
    exportedAt: new Date().toISOString(),
    runtime: runtimeData.value,
    filters: {
      search: search.value,
      source: sourceFilter.value,
      level: levelFilter.value,
      event: eventFilter.value || 'all',
    },
    items: filtered.value,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
  const href = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = href
  link.download = 'nfz-diagnostics-export.json'
  link.click()
  URL.revokeObjectURL(href)
}
</script>

<template>
  <QPage class="dash-page">
    <AppHeroCard title="Diagnostics & lifecycle tracing" subtitle="Timeline du cycle de vie du dashboard : initialisation client, middleware, authentification, services Feathers et serveur embedded." />

    <section class="dash-panel">
      <div class="dash-section-head">
        <div>
          <div class="dash-kicker">Runtime</div>
          <h2 class="mt-2 dash-title">Résumé de l’exécution NFZ</h2>
        </div>
        <div class="dash-toolbar">
          <QBtn color="primary" unelevated icon="refresh" label="Rafraîchir" :loading="pending" @click="refreshAll" />
        </div>
      </div>
      <div class="dash-card-grid md:grid-cols-3 xl:grid-cols-3">
        <div v-for="card in runtimeCards" :key="card.label" class="dash-kpi-card">
          <div class="text-xs nfz-subtitle">{{ card.label }}</div>
          <div class="mt-2 text-lg font-black nfz-title break-words">{{ card.value }}</div>
        </div>
      </div>
    </section>

    <section class="dash-panel">
      <div class="dash-section-head">
        <div>
          <div class="dash-kicker">Observabilité</div>
          <h2 class="mt-2 dash-title">Timeline des traces</h2>
        </div>
        <div class="dash-toolbar">
          <QBtn color="primary" unelevated icon="download" label="Exporter JSON" @click="exportJson" />
          <QBtn color="negative" outline icon="delete_sweep" label="Vider" @click="clearAll" />
        </div>
      </div>

      <div class="dash-card-grid md:grid-cols-4 xl:grid-cols-4">
        <div class="dash-kpi-card">
          <div class="text-xs nfz-subtitle">Client</div><div class="mt-2 text-2xl font-black nfz-title">{{ traceStore.items.length }}</div>
        </div>
        <div class="dash-kpi-card">
          <div class="text-xs nfz-subtitle">Serveur</div><div class="mt-2 text-2xl font-black nfz-title">{{ serverCount }}</div>
        </div>
        <div class="dash-kpi-card">
          <div class="text-xs nfz-subtitle">Filtrées</div><div class="mt-2 text-2xl font-black nfz-title">{{ filtered.length }}</div>
        </div>
        <div class="dash-kpi-card">
          <div class="text-xs nfz-subtitle">Erreurs</div><div class="mt-2 text-2xl font-black nfz-title">{{ levelCounts.error || 0 }}</div>
        </div>
      </div>

      <div class="dash-soft-panel mt-5 grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_180px_180px_minmax(0,1fr)]">
        <QInput v-model="search" dense outlined label="Recherche" placeholder="message, event, meta…" clearable />
        <QSelect v-model="sourceFilter" dense outlined label="Origine" :options="['all', 'client', 'server']" />
        <QSelect v-model="levelFilter" dense outlined label="Niveau" :options="['all', 'info', 'success', 'warn', 'error']" />
        <QSelect v-model="eventFilter" dense outlined label="Event" :options="eventOptions" clearable />
      </div>

      <div class="dash-stack mt-5">
        <div v-for="item in filtered" :key="`${item.side}-${item.id}`" class="dash-log-card px-4 py-3">
          <div class="mb-2 flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <QBadge :color="item.side === 'server' ? 'secondary' : 'primary'">{{ item.side }}</QBadge>
              <QBadge outline color="grey-7">{{ item.source }}</QBadge>
              <QBadge :color="item.level === 'error' ? 'negative' : item.level === 'warn' ? 'warning' : item.level === 'success' ? 'positive' : 'info'">{{ item.level }}</QBadge>
            </div>
            <div class="text-xs nfz-subtitle">{{ new Date(item.ts).toLocaleString() }}</div>
          </div>
          <div class="font-semibold nfz-title">{{ item.message }}</div>
          <div class="text-xs nfz-subtitle">{{ item.event }}</div>
          <pre v-if="item.meta && Object.keys(item.meta).length" class="dash-code-block mt-2 max-h-48 text-[11px]">{{ JSON.stringify(item.meta, null, 2) }}</pre>
        </div>
        <div v-if="!filtered.length" class="dash-soft-panel px-4 py-4 text-sm nfz-subtitle">
          Aucune trace ne correspond aux filtres actifs.
        </div>
      </div>
    </section>
  </QPage>
</template>
