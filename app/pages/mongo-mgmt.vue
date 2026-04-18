<script setup lang="ts">
import DashboardContextBar from '../components/dashboard/kit/DashboardContextBar.vue'
import DashboardWorkspaceTabs from '../components/dashboard/kit/DashboardWorkspaceTabs.vue'
import type { DashboardContextItem } from '../components/dashboard/kit/DashboardContextBar.vue'

const browser = useNfzMongoBrowser()
const protectedPage = useProtectedPage({ auth: 'required', reason: 'nfz-studio-mongo', stableUntilMounted: true })
const authDiagnostics = useAuthDiagnostics({ stableUntilMounted: true })
const authRuntime = useAuthRuntime()
const { info, success, error: traceError, warn } = useDashboardTrace()

const workspaceTab = useState<'workbench' | 'documents' | 'schema' | 'indexes' | 'stats' | 'json'>('mongo-workspace-tab', () => 'documents')
const splitterModel = useState<number>('mongo-splitter-left', () => 22)

const selectedTreeKey = computed(() => browser.selectedCollection
  ? `col:${browser.selectedDatabase}:${browser.selectedCollection}`
  : (browser.selectedDatabase ? `db:${browser.selectedDatabase}` : ''))

const mongoSummary = computed(() => ([
  { label: 'Bases', value: browser.databases.length, icon: 'dns' },
  { label: 'Collections', value: browser.collections.length, icon: 'folder_open' },
  { label: 'Documents chargés', value: browser.documents.length, icon: 'description' },
  { label: 'Sélection', value: browser.selectedDocumentKeys.length, icon: 'checklist' },
]))

const tabOptions = [
  { name: 'workbench', label: 'Workbench', icon: 'dashboard_customize', caption: 'Vue synthèse et actions rapides' },
  { name: 'documents', label: 'Documents', icon: 'table_rows', caption: 'Exploration et édition des documents' },
  { name: 'schema', label: 'Schéma', icon: 'schema', caption: 'Schéma inféré' },
  { name: 'indexes', label: 'Indexes', icon: 'view_list', caption: 'Indexes de la collection' },
  { name: 'stats', label: 'Stats', icon: 'mdi-chart-box-outline', caption: 'Statistiques collection/base' },
  { name: 'json', label: 'JSON brut', icon: 'data_object', caption: 'Document brut' },
] as const

function readMaybeRef<T>(value: T | { value?: T } | undefined, fallback: T): T {
  const unwrapped = (value && typeof value === 'object' && 'value' in value)
    ? (value as { value?: T }).value
    : (value as T | undefined)
  return (unwrapped ?? fallback) as T
}

const treeNodes = computed<any[]>(() => readMaybeRef<any[]>((browser as any).treeNodes, []))
const filteredDocuments = computed<any[]>(() => readMaybeRef<any[]>((browser as any).filteredDocuments, []))
const documentColumns = computed<any[]>(() => readMaybeRef<any[]>((browser as any).documentColumns, []))
const allColumns = computed<any[]>(() => readMaybeRef<any[]>((browser as any).allColumns, []))
const statsCards = computed<any[]>(() => readMaybeRef<any[]>((browser as any).statsCards, []))
const totalPages = computed<number>(() => readMaybeRef<number>((browser as any).totalPages, 1))
const schemaBadges = computed<any[]>(() => readMaybeRef<any[]>((browser as any).schemaBadges, []))
const indexBadges = computed<any[]>(() => readMaybeRef<any[]>((browser as any).indexBadges, []))

const authStateLabel = computed(() => {
  if (!protectedPage.hydrated.value) return 'Hydratation auth'
  if (protectedPage.pending.value) return 'Authentification en cours'
  if (protectedPage.ready.value && protectedPage.authorized.value) return 'Session prête'
  if (protectedPage.ready.value && !protectedPage.authorized.value) return 'Accès protégé'
  return 'Auth idle'
})

const authBanner = computed(() => {
  if (!protectedPage.hydrated.value || protectedPage.pending.value) {
    return { tone: 'info', message: 'Initialisation sécurisée de la session NFZ avant chargement du cockpit Mongo.' }
  }
  if (protectedPage.ready.value && !protectedPage.authorized.value) {
    return { tone: 'error', message: browser.error || 'Authentification requise pour les routes MongoDB management.' }
  }
  if (browser.error) {
    return { tone: 'error', message: browser.error }
  }
  return null
})


const compactStatsCards = computed(() => statsCards.value.map((card: any) => ({
  ...card,
  compactValue: typeof card?.value === 'string' && card.value.length > 12 ? `${card.value.slice(0, 12)}…` : card?.value,
})))

const quickContextChips = computed<DashboardContextItem[]>(() => [
  { label: 'Base', value: browser.selectedDatabase || '—', icon: 'storage', tone: 'primary' },
  { label: 'Collection', value: browser.selectedCollection || '—', icon: 'table_view', tone: 'info' },
  { label: 'Tri', value: `${browser.sortField || '_id'} · ${browser.sortDir === -1 ? 'desc' : 'asc'}`, icon: 'sort', tone: 'default' },
  { label: 'Page size', value: String(browser.pageSize || 25), icon: 'pin', tone: 'default' },
])

const queryInsightChips = computed(() => [
  { label: 'Recherche', value: browser.quickSearch || 'Aucune', tone: browser.quickSearch ? 'primary' : 'muted' },
  { label: 'Filtre JSON', value: browser.queryText?.trim() ? 'Actif' : 'Vide', tone: browser.queryText?.trim() ? 'secondary' : 'muted' },
  { label: 'Sélection', value: `${browser.selectedDocumentKeys.length} doc(s)`, tone: browser.selectedDocumentKeys.length ? 'positive' : 'muted' },
])

const previewDocuments = computed(() => filteredDocuments.value.slice(0, 5))

function openPreviewDocument(doc: any) {
  browser.selectedDocument = doc
  workspaceTab.value = 'json'
}

const workspaceHint = computed(() => {
  switch (workspaceTab.value) {
    case 'documents': return 'Vue documents plein écran pour les recherches, tris et actions de masse.'
    case 'schema': return 'Lecture focalisée du schéma inféré et des badges de structure.'
    case 'indexes': return 'Audit rapide des indexes de la collection active.'
    case 'stats': return 'Statistiques base et collection dans un panneau dédié.'
    case 'json': return 'Édition brute du document actif au format JSON.'
    default: return 'Vue cockpit synthétique : contexte, actions rapides, aperçu de documents et inspecteur compact.'
  }
})

const mongoBootstrapped = ref(false)
const mongoBootstrapPending = ref(false)
const mongoBootstrapAttempts = ref(0)

async function bootstrapMongo(reason = 'mounted', forceRetry = false) {
  if (mongoBootstrapPending.value)
    return false
  if (mongoBootstrapped.value && !forceRetry)
    return true

  mongoBootstrapPending.value = true
  mongoBootstrapAttempts.value += 1

  info('mongo', 'mongo:init:start', 'Initialisation du workspace MongoDB', {
    provider: authDiagnostics.value.provider,
    status: authDiagnostics.value.status,
    reason,
    attempt: mongoBootstrapAttempts.value,
  })

  try {
    const authorized = await protectedPage.ensure()
    if (!authorized) {
      browser.clearError()
      browser.error = 'Authentification requise pour les routes MongoDB management.'
      mongoBootstrapped.value = false
      warn('mongo', 'mongo:init:blocked', 'Cockpit Mongo bloqué tant que la session NFZ n’est pas prête', {
        provider: authDiagnostics.value.provider,
        status: authDiagnostics.value.status,
        reason,
      })
      return false
    }

    await authRuntime.ensureReady(`nfz-studio-mongo:${reason}`)
    browser.clearError()
    await browser.init()

    if (browser.error && /Authentication is required for Mongo administration routes/i.test(browser.error) && mongoBootstrapAttempts.value < 3) {
      warn('mongo', 'mongo:init:retry-auth', 'Réessai Mongo après resynchronisation explicite de session', {
        reason,
        attempt: mongoBootstrapAttempts.value,
      })
      await authRuntime.reAuthenticate().catch(() => null)
      browser.clearError()
      await nextTick()
      await browser.init()
    }

    mongoBootstrapped.value = !browser.error

    if (browser.error) {
      traceError('mongo', 'mongo:init:error', 'Initialisation MongoDB en échec', {
        error: browser.error,
        reason,
        authenticated: authRuntime.authenticated.value,
        tokenSource: authDiagnostics.value.tokenSource,
      })
      return false
    }

    success('mongo', 'mongo:init:success', 'Workspace MongoDB initialisé', {
      databases: browser.databases.length,
      collections: browser.collections.length,
      provider: authDiagnostics.value.provider,
      status: authDiagnostics.value.status,
      reason,
    })
    return true
  }
  catch (e: any) {
    browser.error = e?.message || String(e)
    mongoBootstrapped.value = false
    traceError('mongo', 'mongo:init:error', 'Initialisation MongoDB en échec', { error: browser.error, reason })
    return false
  }
  finally {
    mongoBootstrapPending.value = false
  }
}

onMounted(async () => {
  if (import.meta.client) {
    const savedTab = localStorage.getItem('nfz-mongo-workspace-tab')
    if (savedTab && tabOptions.some(tab => tab.name === savedTab)) {
      workspaceTab.value = savedTab as typeof workspaceTab.value
    }
    const savedSplit = Number(localStorage.getItem('nfz-mongo-splitter-left') || '')
    if (!Number.isNaN(savedSplit) && savedSplit >= 18 && savedSplit <= 42) {
      splitterModel.value = savedSplit
    }
  }

  await bootstrapMongo('mounted')
})

watch([
  () => authRuntime.ready.value,
  () => authRuntime.authenticated.value,
  () => authRuntime.accessToken.value,
], async ([ready, authenticated, accessToken]) => {
  if (!import.meta.client)
    return
  if (!ready || !authenticated || !accessToken)
    return
  if (mongoBootstrapPending.value)
    return
  if (mongoBootstrapped.value && !/Authentication is required for Mongo administration routes/i.test(browser.error || ''))
    return

  await bootstrapMongo('auth-watch', true)
}, { flush: 'post' })

watch(workspaceTab, (value) => {
  if (import.meta.client) localStorage.setItem('nfz-mongo-workspace-tab', value)
})

watch(splitterModel, (value) => {
  if (import.meta.client) localStorage.setItem('nfz-mongo-splitter-left', String(value))
})
</script>

<template>
  <QPage class="dash-page">
    <AppHeroCard
      title="MongoDB Workspace"
      subtitle="Cockpit MongoDB Compass-like pour NFZ embedded : navigation par bases et collections, explorer de documents éditable, recherche rapide, filtres JSON, stats, indexes et schéma dans une mise en page dashboard optimisée pour les modes light et dark."
    />

    <section class="dash-panel mongo-hero p-4 md:p-5">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div class="text-xs uppercase tracking-[0.24em] text-[var(--nfz-primary)]">Mongo cockpit</div>
          <h2 class="mt-2 text-2xl font-black nfz-title">{{ browser.selectedCollection || browser.selectedDatabase || 'Explorer MongoDB' }}</h2>
          <p class="mt-2 text-sm nfz-subtitle">
            {{ browser.selectedCollection
              ? `${browser.selectedDatabase} / ${browser.selectedCollection}`
              : (browser.selectedDatabase ? `Base active : ${browser.selectedDatabase}` : 'Sélectionne une base ou une collection dans l’arbre pour explorer les données.') }}
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <span class="context-chip rounded-full px-3 py-2 text-sm">{{ browser.loadingDocuments ? 'Chargement documents…' : 'Documents prêts' }}</span>
          <span class="context-chip rounded-full px-3 py-2 text-sm">{{ browser.loadingInspector ? 'Inspection…' : 'Inspecteur prêt' }}</span>
          <span class="context-chip rounded-full px-3 py-2 text-sm">NFZ-native / mongo-admin</span>
          <span class="context-chip rounded-full px-3 py-2 text-sm" :class="authBanner?.tone === 'error' ? 'text-red-700' : 'text-green-800'">{{ authStateLabel }}</span>
        </div>
      </div>

      <div class="dash-kpi-grid mt-4 gap-3">
        <div v-for="card in mongoSummary" :key="card.label" class="dash-kpi-card mongo-kpi px-4 py-3">
          <div class="flex items-center justify-between gap-3">
            <div>
              <div class="text-xs uppercase tracking-[0.14em] nfz-subtitle">{{ card.label }}</div>
              <div class="mt-2 text-2xl font-black nfz-title">{{ card.value }}</div>
            </div>
            <div class="dash-kpi-icon mongo-kpi-icon">
              <QIcon :name="card.icon" size="22px" />
            </div>
          </div>
        </div>
      </div>
    </section>

    <div
      v-if="authBanner"
      class="rounded-4 px-4 py-3 text-sm"
      :class="authBanner.tone === 'error'
        ? 'border border-red-300/30 bg-red-100 text-red-700'
        : 'border border-blue-300/30 bg-blue-50 text-blue-800'"
    >
      {{ authBanner.message }}
    </div>

    <div class="dash-panel overflow-hidden p-0">
      <QSplitter v-model="splitterModel" :limits="[18, 42]" unit="%" separator-class="bg-[var(--nfz-border)] opacity-70">
        <template #before>
          <div class="h-full min-h-[720px] border-r border-[var(--nfz-border)] bg-[var(--nfz-surface-soft)]/35 p-2.5">
            <NfzMongoTreePane
              :nodes="treeNodes"
              :selected-key="selectedTreeKey"
              :expanded="browser.expandedNodes"
              :filter-text="browser.treeFilter"
              :loading="browser.loadingDatabases || browser.loadingCollections"
              @select="browser.selectTreeNode"
              @update-expanded="browser.onTreeExpand"
              @update:filter-text="browser.treeFilter = $event"
              @refresh="browser.loadDatabases"
            />
          </div>
        </template>

        <template #after>
          <div class="h-full min-h-[780px] flex flex-col">
            <div class="border-b border-[var(--nfz-border)] px-4 py-3">
              <DashboardContextBar :items="quickContextChips" compact />
              <div class="mt-2 text-xs nfz-subtitle">{{ workspaceHint }}</div>
            </div>

            <div class="min-h-0 flex-1 p-3">
              <DashboardWorkspaceTabs v-model="workspaceTab" :tabs="tabOptions as any">
              <QTabPanel name="workbench" class="h-full p-4">
                <div class="grid h-full gap-4 2xl:grid-cols-[minmax(0,1.15fr)_340px]">
                  <div class="grid min-h-0 gap-4 content-start">
                    <section class="rounded-5 border border-[var(--nfz-border)] bg-[var(--nfz-surface-soft)]/50 p-4">
                      <div class="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div class="text-xs uppercase tracking-[0.22em] text-[var(--nfz-primary)]">Workbench</div>
                          <h3 class="mt-2 text-xl font-black nfz-title">Vue synthèse Mongo</h3>
                          <p class="mt-1 text-sm nfz-subtitle">Résumé rapide de la collection active, des filtres et des actions prioritaires sans quitter le cockpit.</p>
                        </div>
                        <QChip dense color="primary" text-color="white" icon="table_rows">{{ filteredDocuments.length }} document(s) visibles</QChip>
                      </div>

                      <div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div v-for="card in compactStatsCards" :key="card.label" class="rounded-4 border border-[var(--nfz-border)] bg-[var(--nfz-surface)] px-3 py-3">
                          <div class="text-[11px] uppercase tracking-[0.18em] nfz-subtitle">{{ card.label }}</div>
                          <div class="mt-2 text-lg font-bold nfz-title">{{ card.compactValue }}</div>
                        </div>
                      </div>
                    </section>

                    <div class="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_300px]">
                      <section class="rounded-5 border border-[var(--nfz-border)] bg-[var(--nfz-surface)] p-4">
                        <div class="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div class="text-xs uppercase tracking-[0.22em] text-[var(--nfz-primary)]">Contexte & requête</div>
                            <h4 class="mt-1 text-lg font-bold nfz-title">Lecture rapide</h4>
                          </div>
                          <div class="flex flex-wrap gap-2">
                            <QChip v-for="chip in queryInsightChips" :key="chip.label" dense :color="chip.tone === 'primary' ? 'primary' : chip.tone === 'secondary' ? 'secondary' : chip.tone === 'positive' ? 'positive' : 'grey-3'" :text-color="chip.tone === 'muted' ? 'dark' : 'white'">{{ chip.label }} : {{ chip.value }}</QChip>
                          </div>
                        </div>
                        <div class="mt-4 grid gap-3 md:grid-cols-2">
                          <div class="rounded-4 border border-[var(--nfz-border)] bg-[var(--nfz-surface-soft)]/40 p-3">
                            <div class="text-[11px] uppercase tracking-[0.18em] nfz-subtitle">Query JSON</div>
                            <pre class="mt-2 max-h-28 overflow-auto text-xs leading-5">{{ browser.queryText || '{}' }}</pre>
                          </div>
                          <div class="rounded-4 border border-[var(--nfz-border)] bg-[var(--nfz-surface-soft)]/40 p-3">
                            <div class="text-[11px] uppercase tracking-[0.18em] nfz-subtitle">Recherche rapide</div>
                            <div class="mt-2 text-sm font-medium nfz-title">{{ browser.quickSearch || 'Aucune recherche rapide' }}</div>
                            <div class="mt-3 text-[11px] uppercase tracking-[0.18em] nfz-subtitle">Colonnes visibles</div>
                            <div class="mt-2 flex flex-wrap gap-2">
                              <QChip v-for="name in browser.visibleColumnNames.slice(0, 8)" :key="name" dense size="sm" color="grey-2" text-color="dark">{{ name }}</QChip>
                              <QChip v-if="!browser.visibleColumnNames.length" dense size="sm" color="grey-3" text-color="dark">Auto</QChip>
                            </div>
                          </div>
                        </div>
                      </section>

                      <section class="rounded-5 border border-[var(--nfz-border)] bg-[var(--nfz-surface)] p-4">
                        <div class="text-xs uppercase tracking-[0.22em] text-[var(--nfz-primary)]">Actions rapides</div>
                        <h4 class="mt-1 text-lg font-bold nfz-title">Pilotage collection</h4>
                        <div class="mt-4 grid gap-3">
                          <div class="grid gap-2 sm:grid-cols-2">
                            <QBtn color="primary" unelevated icon="note_add" label="Créer doc" @click="browser.createDocument" />
                            <QBtn color="secondary" unelevated icon="save" label="Sauver doc" @click="browser.saveActiveDocument" />
                          </div>
                          <div class="grid gap-2 sm:grid-cols-2">
                            <QBtn color="grey-8" outline icon="refresh" label="Rafraîchir" @click="browser.loadDocuments" />
                            <QBtn color="grey-8" outline icon="filter_alt_off" label="Réinit query" @click="browser.resetQuery" />
                          </div>
                          <div class="grid gap-2 sm:grid-cols-2">
                            <QBtn color="amber-8" outline icon="download" label="Export JSON" @click="browser.exportCurrentPage('json')" />
                            <QBtn color="amber-8" outline icon="table_view" label="Export CSV" @click="browser.exportCurrentPage('csv')" />
                          </div>
                          <div class="grid gap-2 sm:grid-cols-2">
                            <QBtn color="negative" outline icon="delete" label="Supprimer doc" @click="browser.deleteSelectedDocument" />
                            <QBtn color="negative" outline icon="delete_sweep" label="Drop collection" @click="browser.dropSelectedCollection" />
                          </div>
                        </div>
                      </section>
                    </div>

                    <section class="rounded-5 border border-[var(--nfz-border)] bg-[var(--nfz-surface)] p-4 min-h-0">
                      <div class="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div class="text-xs uppercase tracking-[0.22em] text-[var(--nfz-primary)]">Aperçu documents</div>
                          <h4 class="mt-1 text-lg font-bold nfz-title">Premiers résultats</h4>
                        </div>
                        <QBtn dense flat color="primary" icon="table_rows" label="Ouvrir Documents" @click="workspaceTab = 'documents'" />
                      </div>
                      <div class="mt-4 grid gap-2">
                        <button
                          v-for="(doc, index) in previewDocuments"
                          :key="doc?._id || doc?.id || index"
                          type="button"
                          class="w-full rounded-4 border border-[var(--nfz-border)] bg-[var(--nfz-surface-soft)]/40 px-3 py-3 text-left transition hover:border-[var(--nfz-primary)]/40 hover:bg-[var(--nfz-surface-soft)]"
                          @click="openPreviewDocument(doc)"
                        >
                          <div class="flex items-start justify-between gap-3">
                            <div class="min-w-0 flex-1">
                              <div class="truncate text-sm font-semibold nfz-title">{{ doc?.title || doc?.name || doc?.username || doc?._id || doc?.id || `Document ${index + 1}` }}</div>
                              <div class="mt-1 truncate text-xs nfz-subtitle">{{ JSON.stringify(doc) }}</div>
                            </div>
                            <QChip dense size="sm" color="grey-2" text-color="dark">JSON</QChip>
                          </div>
                        </button>
                        <div v-if="!previewDocuments.length" class="rounded-4 border border-dashed border-[var(--nfz-border)] px-3 py-5 text-sm nfz-subtitle">Aucun document chargé pour l’aperçu rapide.</div>
                      </div>
                    </section>
                  </div>

                  <NfzMongoInspector
                    :document-json="browser.activeDocumentJson"
                    :schema="browser.schema"
                    :indexes="browser.indexes"
                    :db-stats="browser.dbStats"
                    :schema-badges="schemaBadges"
                    :index-badges="indexBadges"
                    :loading="browser.loadingInspector || browser.loadingDbStats"
                    @update:document-json="browser.activeDocumentJson = $event"
                  />
                </div>
              </QTabPanel>

              <QTabPanel name="documents" class="h-full p-4">
                <NfzMongoDocumentsPane
                  :items="filteredDocuments"
                  :columns="documentColumns"
                  :all-columns="allColumns"
                  :selected-document="browser.selectedDocument"
                  :selected-keys="browser.selectedDocumentKeys"
                  :column-widths="browser.columnWidths"
                  :table-density="browser.tableDensity"
                  :wrap-cells="browser.wrapCells"
                  :loading="browser.loadingDocuments"
                  :saving="browser.savingDocument"
                  :deleting="browser.deletingDocument"
                  :creating-collection="browser.creatingCollection"
                  :dropping-collection="browser.droppingCollection"
                  :query-text="browser.queryText"
                  :quick-search="browser.quickSearch"
                  :view-mode="browser.viewMode"
                  :stats-cards="statsCards"
                  :sort-field="browser.sortField"
                  :sort-dir="browser.sortDir"
                  :page="browser.page"
                  :total-pages="totalPages"
                  :page-size="browser.pageSize"
                  @select-document="browser.selectedDocument = $event"
                  @toggle-select="browser.toggleDocumentSelection"
                  @replace-selected-keys="browser.replaceSelectedKeys"
                  @select-all-current-page="browser.selectAllCurrentPage"
                  @clear-selection="browser.clearSelection"
                  @select-all-filtered="browser.selectAllFiltered"
                  @invert-selection="browser.invertSelection"
                  @update:query-text="browser.queryText = $event"
                  @update:quick-search="browser.quickSearch = $event"
                  @update:view-mode="browser.viewMode = $event"
                  @update:sort-field="browser.sortField = $event"
                  @update:sort-dir="browser.sortDir = ($event as 1 | -1)"
                  @update:page-size="browser.pageSize = $event"
                  @update:visible-columns="browser.setVisibleColumns($event)"
                  @update:column-width="browser.setColumnWidth($event.name, $event.width)"
                  @update:table-density="browser.setTableDensity($event)"
                  @update:wrap-cells="browser.wrapCells = $event"
                  @reset-column-widths="browser.resetColumnWidths"
                  @apply-options="browser.applyPagingAndSort"
                  @prev-page="browser.prevPage"
                  @next-page="browser.nextPage"
                  @create-document="browser.createDocument"
                  @save-document="browser.saveActiveDocument"
                  @delete-document="browser.deleteSelectedDocument"
                  @bulk-delete="browser.bulkDeleteSelected"
                  @bulk-export-selected-json="browser.bulkExportSelected('json')"
                  @bulk-export-selected-csv="browser.bulkExportSelected('csv')"
                  @bulk-patch-selected="browser.bulkPatchSelected"
                  @create-collection="browser.createCollection"
                  @drop-collection="browser.dropSelectedCollection"
                  @reset-query="browser.resetQuery"
                  @inline-edit="browser.inlinePatchField"
                  @apply-preset="browser.applyQuickPreset"
                  @export-json="browser.exportCurrentPage('json')"
                  @export-csv="browser.exportCurrentPage('csv')"
                  @refresh="browser.loadDocuments"
                />
              </QTabPanel>

              <QTabPanel name="schema" class="h-full p-4">
                <NfzMongoInspector
                  :document-json="browser.activeDocumentJson"
                  :schema="browser.schema"
                  :indexes="browser.indexes"
                  :db-stats="browser.dbStats"
                  :schema-badges="schemaBadges"
                  :index-badges="indexBadges"
                  :loading="browser.loadingInspector || browser.loadingDbStats"
                  @update:document-json="browser.activeDocumentJson = $event"
                />
              </QTabPanel>

              <QTabPanel name="indexes" class="h-full p-4">
                <NfzMongoInspector
                  :document-json="browser.activeDocumentJson"
                  :schema="browser.schema"
                  :indexes="browser.indexes"
                  :db-stats="browser.dbStats"
                  :schema-badges="schemaBadges"
                  :index-badges="indexBadges"
                  :loading="browser.loadingInspector || browser.loadingDbStats"
                  @update:document-json="browser.activeDocumentJson = $event"
                />
              </QTabPanel>

              <QTabPanel name="stats" class="h-full p-4">
                <NfzMongoInspector
                  :document-json="browser.activeDocumentJson"
                  :schema="browser.schema"
                  :indexes="browser.indexes"
                  :db-stats="browser.dbStats"
                  :schema-badges="schemaBadges"
                  :index-badges="indexBadges"
                  :loading="browser.loadingInspector || browser.loadingDbStats"
                  @update:document-json="browser.activeDocumentJson = $event"
                />
              </QTabPanel>

              <QTabPanel name="json" class="h-full p-4">
                <NfzMongoInspector
                  :document-json="browser.activeDocumentJson"
                  :schema="browser.schema"
                  :indexes="browser.indexes"
                  :db-stats="browser.dbStats"
                  :schema-badges="schemaBadges"
                  :index-badges="indexBadges"
                  :loading="browser.loadingInspector || browser.loadingDbStats"
                  @update:document-json="browser.activeDocumentJson = $event"
                />
              </QTabPanel>
              </DashboardWorkspaceTabs>
            </div>
          </div>
        </template>
      </QSplitter>
    </div>
  </QPage>
</template>
