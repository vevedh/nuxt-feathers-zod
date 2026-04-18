<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useDashboardTraceStore } from '~/stores/dashboardTrace'

const model = defineModel<boolean>({ default: false })
const traceStore = useDashboardTraceStore()
const serverItems = ref<any[]>([])
const loading = ref(false)
const sourceFilter = ref<'all' | 'client' | 'server'>('all')
const levelFilter = ref<'all' | 'info' | 'success' | 'warn' | 'error'>('all')
const runtimeSummary = ref<any>({})

const clientItems = computed(() => traceStore.items.slice(0, 80))
const mergedItems = computed(() => {
  return [...clientItems.value.map((item: any) => ({ ...item, side: 'client' })), ...serverItems.value.map((item: any) => ({ ...item, side: 'server' }))]
    .sort((a, b) => String(b.ts).localeCompare(String(a.ts)))
    .filter((item) => {
      if (sourceFilter.value !== 'all' && item.side !== sourceFilter.value) return false
      if (levelFilter.value !== 'all' && item.level !== levelFilter.value) return false
      return true
    })
    .slice(0, 120)
})

async function refreshServerTraces() {
  loading.value = true
  try {
    const [result, runtime] = await Promise.all([
      $fetch<{ items: any[] }>('/api/diagnostics/traces'),
      $fetch('/api/diagnostics/runtime').catch(() => ({})),
    ])
    serverItems.value = result?.items || []
    runtimeSummary.value = runtime || {}
  }
  finally {
    loading.value = false
  }
}

async function clearAll() {
  traceStore.clear()
  await $fetch('/api/diagnostics/traces', { method: 'DELETE' }).catch(() => {})
  serverItems.value = []
}

watch(model, async (open: boolean) => {
  if (open) await refreshServerTraces()
})
</script>

<template>
  <QDrawer v-model="model" side="right" overlay bordered :width="460" class="bg-[var(--nfz-surface)] text-[var(--nfz-text)]">
    <div class="h-full flex flex-col">
      <div class="dash-drawer-head">
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="dash-kicker">Diagnostics</div>
            <div class="mt-2 text-xl font-bold nfz-title">Tracing dashboard lifecycle</div>
            <div class="mt-1 text-sm nfz-subtitle">Client, auth, routes, services Feathers et traces serveur embedded.</div>
          </div>
          <div class="flex items-center gap-2">
            <QBtn flat round dense icon="refresh" color="primary" :loading="loading" @click="refreshServerTraces" />
            <QBtn flat round dense icon="delete_sweep" color="negative" @click="clearAll" />
          </div>
        </div>
      </div>
      <div class="dash-drawer-metrics">
        <div class="dash-soft-panel px-3 py-3">
          <div class="text-xs nfz-subtitle">Mode</div>
          <div class="mt-1 text-lg font-semibold nfz-title">{{ runtimeSummary.mode || 'n/a' }}</div>
        </div>
        <div class="dash-soft-panel px-3 py-3">
          <div class="text-xs nfz-subtitle">Auth</div>
          <div class="mt-1 text-lg font-semibold nfz-title">{{ runtimeSummary.authProvider || 'n/a' }}</div>
        </div>
      </div>
      <div class="px-4 pb-3 grid gap-3 grid-cols-2">
        <QSelect v-model="sourceFilter" dense outlined label="Origine" :options="['all', 'client', 'server']" />
        <QSelect v-model="levelFilter" dense outlined label="Niveau" :options="['all', 'info', 'success', 'warn', 'error']" />
      </div>
      <div class="dash-drawer-body">
        <div class="dash-stack">
          <div v-for="item in mergedItems" :key="`${item.side}-${item.id}`" class="dash-log-card">
            <div class="mb-2 flex items-center justify-between gap-2">
              <div class="flex items-center gap-2 text-xs uppercase tracking-[0.12em]">
                <QBadge :color="item.side === 'server' ? 'secondary' : 'primary'">{{ item.side }}</QBadge>
                <QBadge outline color="grey-7">{{ item.source }}</QBadge>
                <QBadge :color="item.level === 'error' ? 'negative' : item.level === 'warn' ? 'warning' : item.level === 'success' ? 'positive' : 'info'">{{ item.level }}</QBadge>
              </div>
              <div class="text-[11px] nfz-subtitle">{{ new Date(item.ts).toLocaleString() }}</div>
            </div>
            <div class="text-sm font-semibold nfz-title">{{ item.message }}</div>
            <div class="mt-1 text-xs nfz-subtitle">{{ item.event }}</div>
            <pre v-if="item.meta && Object.keys(item.meta).length" class="dash-code-block mt-2 max-h-40 text-[11px] nfz-title">{{ JSON.stringify(item.meta, null, 2) }}</pre>
          </div>
          <div v-if="!mergedItems.length" class="dash-soft-panel px-4 py-4 text-sm nfz-subtitle">
            Aucune trace avec les filtres actifs.
          </div>
        </div>
      </div>
    </div>
  </QDrawer>
</template>
