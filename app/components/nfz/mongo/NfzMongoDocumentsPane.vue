<script setup lang="ts">
import { computed, ref } from 'vue'
import NfzQGrid from '../ui/NfzQGrid.vue'
const props = defineProps<{
  items: any[]
  columns: any[]
  allColumns: any[]
  columnWidths?: Record<string, number>
  tableDensity?: 'compact' | 'comfortable'
  wrapCells?: boolean
  selectedDocument: any | null
  selectedKeys: string[]
  loading?: boolean
  saving?: boolean
  deleting?: boolean
  queryText: string
  quickSearch: string
  viewMode: 'table' | 'list'
  statsCards: Array<{ label: string, value: any }>
  sortField: string
  sortDir: number
  page: number
  totalPages: number
  pageSize: number
  creatingCollection?: boolean
  droppingCollection?: boolean
}>()
const emit = defineEmits<{
  refresh: []
  selectDocument: [doc: any]
  toggleSelect: [doc: any]
  replaceSelectedKeys: [keys: string[]]
  selectAllCurrentPage: []
  clearSelection: []
  selectAllFiltered: []
  invertSelection: []
  'update:queryText': [value: string]
  'update:quickSearch': [value: string]
  'update:viewMode': [value: 'table' | 'list']
  'update:sortField': [value: string]
  'update:sortDir': [value: number]
  'update:pageSize': [value: number]
  'update:visibleColumns': [value: string[]]
  'update:columnWidth': [payload: { name: string, width: number }]
  'update:tableDensity': [value: 'compact' | 'comfortable']
  'update:wrapCells': [value: boolean]
  resetColumnWidths: []
  applyOptions: []
  prevPage: []
  nextPage: []
  createDocument: []
  saveDocument: []
  deleteDocument: []
  bulkDelete: []
  bulkExportSelectedJson: []
  bulkExportSelectedCsv: []
  bulkPatchSelected: []
  createCollection: []
  dropCollection: []
  resetQuery: []
  inlineEdit: [payload: { row: any, column: any, value: any }]
  applyPreset: [preset: 'all' | 'withId' | 'createdDesc']
  exportJson: []
  exportCsv: []
}>()

const visibleColumnNames = computed(() => props.columns.map(col => col.name))
const density = computed(() => props.tableDensity === 'compact' ? 'compact' : 'comfortable')
const columnOptions = computed(() => props.allColumns.map(col => ({ label: col.label, value: col.name })))

const filtersOpen = ref(false)

function rowKeyOf(doc: any) {
  return String(doc?._id || doc?.id || JSON.stringify(doc))
}
</script>

<template>
  <section class="nfz-panel mongo-pane rounded-6 h-full min-w-0 p-4 md:p-5 overflow-x-hidden overflow-y-auto">
    <div class="mb-4 flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div>
        <div class="text-xs uppercase tracking-[0.24em] text-[var(--nfz-primary)]">Documents</div>
        <h2 class="text-lg font-semibold nfz-title">Explorateur</h2>
      </div>
      <div class="mongo-top-actions w-full xl:w-auto">
        <div class="mongo-top-group">
          <QBtn flat color="primary" icon="library_add" round :loading="creatingCollection" @click="emit('createCollection')">
            <QTooltip>Créer une collection</QTooltip>
          </QBtn>
          <QBtn flat color="primary" icon="add" round @click="emit('createDocument')">
            <QTooltip>Créer un document</QTooltip>
          </QBtn>
          <QBtn flat color="primary" icon="save" round :loading="saving" @click="emit('saveDocument')">
            <QTooltip>Enregistrer le document</QTooltip>
          </QBtn>
        </div>
        <div class="mongo-top-group">
          <QBtn flat color="primary" icon="download" round @click="emit('exportJson')">
            <QTooltip>Exporter JSON</QTooltip>
          </QBtn>
          <QBtn flat color="primary" icon="table_view" round @click="emit('exportCsv')">
            <QTooltip>Exporter CSV</QTooltip>
          </QBtn>
          <QBtn flat color="primary" icon="refresh" round :loading="loading" @click="emit('refresh')">
            <QTooltip>Rafraîchir</QTooltip>
          </QBtn>
        </div>
        <div class="mongo-top-group mongo-top-group-danger">
          <QBtn flat color="negative" icon="folder_delete" round :loading="droppingCollection" @click="emit('dropCollection')">
            <QTooltip>Supprimer la collection</QTooltip>
          </QBtn>
          <QBtn flat color="negative" icon="delete" round :loading="deleting" @click="emit('deleteDocument')">
            <QTooltip>Supprimer le document</QTooltip>
          </QBtn>
        </div>
      </div>
    </div>

    <div class="mb-3 mongo-stats-grid min-w-0">
      <div v-for="card in statsCards" :key="card.label" class="rounded-4 border border-[var(--nfz-border)] bg-[var(--nfz-surface-soft)]/55 px-3 py-2 min-w-0">
        <div class="text-[11px] uppercase tracking-[0.18em] nfz-subtitle">{{ card.label }}</div>
        <div class="mt-1 truncate text-sm font-semibold nfz-title">{{ card.value }}</div>
      </div>
    </div>

    <div class="mb-3 rounded-4 mongo-actionbar px-3 py-3 md:px-4 min-w-0">
      <div class="mongo-actionbar-grid">
        <div class="mongo-action-segment">
          <span class="mongo-toolbar-inline-label">Preset</span>
          <QBtn dense unelevated color="primary" outline label="Tout" @click="emit('applyPreset', 'all')" />
          <QBtn dense flat class="mongo-soft-btn" label="Avec _id" @click="emit('applyPreset', 'withId')" />
          <QBtn dense flat class="mongo-soft-btn" label="createdAt desc" @click="emit('applyPreset', 'createdDesc')" />
          <QBtn dense flat class="mongo-soft-btn" label="Réinitialiser" @click="emit('resetQuery')" />
        </div>

        <div class="hidden"></div>

        <div class="mongo-action-segment">
          <span class="mongo-toolbar-inline-label">Sélection</span>
          <QBtn dense flat class="mongo-soft-btn" label="Page" @click="emit('selectAllCurrentPage')" />
          <QBtn dense flat class="mongo-soft-btn" label="Filtrés" @click="emit('selectAllFiltered')" />
          <QBtn dense flat class="mongo-soft-btn" label="Inverser" @click="emit('invertSelection')" />
          <QBtn dense flat class="mongo-soft-btn" label="Vider" @click="emit('clearSelection')" />
          <div class="mongo-selection-pill">{{ selectedKeys.length }} sélectionné(s)</div>
        </div>

        <div class="hidden"></div>

        <div class="mongo-action-segment mongo-action-segment-bulk">
          <span class="mongo-toolbar-inline-label">Bulk</span>
          <QBtn dense flat class="mongo-soft-btn" label="JSON sel." :disable="!selectedKeys.length" @click="emit('bulkExportSelectedJson')" />
          <QBtn dense flat class="mongo-soft-btn" label="CSV sel." :disable="!selectedKeys.length" @click="emit('bulkExportSelectedCsv')" />
          <QBtn dense flat color="warning" class="mongo-bulk-btn" label="Patch" :disable="!selectedKeys.length" @click="emit('bulkPatchSelected')" />
          <QBtn dense unelevated color="negative" label="Suppression groupée" :disable="!selectedKeys.length" @click="emit('bulkDelete')" />
        </div>
      </div>
    </div>

    <QExpansionItem
      v-model="filtersOpen"
      class="mb-3 overflow-hidden rounded-4 border border-[var(--nfz-border)] bg-[var(--nfz-surface)]"
      dense
      dense-toggle
      switch-toggle-side
      icon="tune"
      label="Filtres, tri et affichage"
      caption="Ouvre ce panneau seulement quand tu ajustes la requête ou la grille."
      header-class="px-3 py-2"
      content-class="border-t border-[var(--nfz-border)]"
    >
      <div class="mongo-query-shell p-3 md:p-4">
      <div class="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div class="mongo-toolbar-label">Query & affichage</div>
          <div class="text-sm nfz-subtitle">Affinez la requête, le tri, la pagination et les colonnes visibles.</div>
        </div>
        <div class="mongo-query-actions">
          <QBtn flat class="mongo-soft-btn" icon="restart_alt" label="Réinitialiser" @click="emit('resetQuery')" />
          <QBtn color="primary" unelevated icon="play_arrow" label="Appliquer" @click="emit('applyOptions')" />
        </div>
      </div>

      <div class="nfz-toolbar-grid mongo-query-grid">
      <QInput
        :model-value="queryText"
        type="textarea"
        autogrow
        outlined
        class="mongo-field col-span-2 lg:col-span-4"
        label="Filtre / query JSON"
        @update:model-value="emit('update:queryText', String($event ?? ''))"
      />
      <QInput
        :model-value="quickSearch"
        outlined
        class="mongo-field col-span-2 lg:col-span-4"
        label="Recherche rapide (page courante)"
        @update:model-value="emit('update:quickSearch', String($event ?? ''))"
      />
      <QInput
        :model-value="sortField"
        outlined
        class="mongo-field col-span-2 lg:col-span-4"
        label="Champ tri"
        @update:model-value="emit('update:sortField', String($event ?? ''))"
      />
      <QSelect
        :model-value="sortDir"
        outlined
        class="mongo-field col-span-2 lg:col-span-4"
        emit-value
        map-options
        :options="[
          { label: 'Desc', value: -1 },
          { label: 'Asc', value: 1 }
        ]"
        label="Ordre"
        @update:model-value="emit('update:sortDir', Number($event))"
      />
      <QSelect
        :model-value="pageSize"
        outlined
        class="mongo-field col-span-2 lg:col-span-4"
        emit-value
        map-options
        :options="[10,25,50,100].map(v => ({ label: String(v), value: v }))"
        label="Page size"
        @update:model-value="emit('update:pageSize', Number($event))"
      />
      <QSelect
        :model-value="visibleColumnNames"
        outlined
        class="mongo-field col-span-2 lg:col-span-4"
        multiple
        emit-value
        map-options
        :options="columnOptions"
        label="Colonnes visibles"
        @update:model-value="emit('update:visibleColumns', ($event as string[]) || [])"
      />
      <div class="col-span-2 lg:col-span-4 flex flex-wrap items-center justify-between gap-3 pt-1">
        <div class="text-xs nfz-subtitle flex items-center gap-2">
          <span>Filtres avancés</span>
          <QIcon name="help" size="16px" class="cursor-help text-[var(--nfz-primary)]">
            <QTooltip class="max-w-[520px] text-sm">Exemples: &gt;=10, &lt;=2025-01-01, true, false, empty, !empty, in:admin|editor, /mailbox/i</QTooltip>
          </QIcon>
        </div>
        <QBtn class="mongo-soft-btn" flat icon="view_column" label="Réinitialiser largeurs" @click="emit('resetColumnWidths')" />
      </div>
    </div>
      </div>
    </QExpansionItem>

    <QExpansionItem
      dense
      dense-toggle
      switch-toggle-side
      icon="tune"
      label="Affichage & préférences"
      header-class="rounded-4 mongo-expansion-head nfz-title mb-3"
      content-class="rounded-b-4 border border-[var(--nfz-border)] border-t-0 bg-[var(--nfz-surface-soft)] p-3"
    >
      <div class="grid gap-3 md:grid-cols-[180px_160px_1fr]">
        <QSelect
          :model-value="tableDensity || 'comfortable'"
          outlined
          class="mongo-field"
          emit-value
          map-options
          :options="[
            { label: 'Confortable', value: 'comfortable' },
            { label: 'Compact', value: 'compact' }
          ]"
          label="Densité"
          @update:model-value="emit('update:tableDensity', $event as 'compact' | 'comfortable')"
        />
        <QToggle
          :model-value="!!wrapCells"
          color="primary"
          label="Retour à la ligne"
          @update:model-value="emit('update:wrapCells', Boolean($event))"
        />
        <QBtn flat color="grey-4" label="Réinitialiser largeurs colonnes" @click="emit('resetColumnWidths')" />
      </div>

      <div class="mt-4 grid gap-3 md:grid-cols-2">
        <div
          v-for="col in allColumns"
          :key="`width-${col.name}`"
          class="surface-soft px-3 py-3"
        >
          <div class="mb-2 flex items-center justify-between gap-3 text-sm nfz-title/80">
            <span class="truncate">{{ col.label }}</span>
            <span>{{ (columnWidths?.[col.name] || 220) }} px</span>
          </div>
          <QSlider
            :model-value="columnWidths?.[col.name] || 220"
            :min="120"
            :max="640"
            :step="10"
            color="primary"
            @update:model-value="emit('update:columnWidth', { name: col.name, width: Number($event) })"
          />
        </div>
      </div>
    </QExpansionItem>

    <div class="mb-3 flex flex-wrap items-center justify-between gap-3 min-w-0 overflow-hidden">
      <QBtnToggle
        :model-value="viewMode"
        unelevated
        toggle-color="primary"
        color="grey-2"
        text-color="dark"
        :options="[
          { label: 'Table', value: 'table' },
          { label: 'Liste', value: 'list' }
        ]"
        @update:model-value="emit('update:viewMode', $event as 'table' | 'list')"
      />

      <div class="flex flex-wrap items-center justify-end gap-2 min-w-0">
        <div class="nfz-soft rounded-full px-3 py-2 text-sm nfz-title/80">{{ selectedKeys.length }} sélectionné(s)</div>
        <QBtn flat color="primary" icon="chevron_left" :disable="page <= 1" @click="emit('prevPage')" />
        <div class="nfz-soft rounded-full px-3 py-2 text-sm nfz-title/80">Page {{ page }} / {{ totalPages }}</div>
        <QBtn flat color="primary" icon="chevron_right" :disable="page >= totalPages" @click="emit('nextPage')" />
      </div>
    </div>

    <div v-if="viewMode === 'table'" class="mongo-grid-shell min-w-0 overflow-hidden rounded-4 border border-[var(--nfz-border)] bg-[var(--nfz-surface)]">
      <div class="mongo-grid-scroll">
      <NfzQGrid
        class="w-full min-w-0"
        :rows="items"
        :columns="columns"
        :loading="loading"
        row-key="_id"
        :pagination="{ rowsPerPage: pageSize }"
        :dense="density === 'compact'"
        :csv-download="false"
        :global-search="false"
        :fullscreen="false"
        :selected-keys="selectedKeys"
        :column-widths="columnWidths"
        :wrap-cells="wrapCells"
        :editable="true"
        :storage-key="'mongo-documents-grid'"
        @row-click="emit('selectDocument', $event)"
        @update:selected-keys="emit('replaceSelectedKeys', $event)"
        @update:column-width="emit('update:columnWidth', $event)"
        @cell-edit="emit('inlineEdit', $event)"
      />
      </div>
    </div>

    <div v-else class="max-h-[28rem] overflow-auto rounded-4 border border-[var(--nfz-border)] bg-[var(--nfz-surface-soft)] mongo-list-shell">
      <button
        v-for="(doc, index) in items"
        :key="doc._id || doc.id || index"
        class="w-full border-b border-white/6 px-4 py-3 text-left transition-colors duration-200 last:border-b-0"
        :class="selectedDocument && rowKeyOf(selectedDocument) === rowKeyOf(doc) ? 'bg-cyan-400/10' : 'hover:bg-[var(--nfz-primary-soft)]'"
        @click="emit('selectDocument', doc)"
      >
        <div class="flex items-start gap-3">
          <QCheckbox
            :model-value="selectedKeys.includes(rowKeyOf(doc))"
            dense
            color="primary"
            @update:model-value.stop="emit('toggleSelect', doc)"
          />
          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-medium nfz-title">{{ doc._id || doc.id || `document-${index + 1}` }}</div>
            <div class="mt-1 truncate text-xs nfz-title/50">{{ JSON.stringify(doc) }}</div>
          </div>
        </div>
      </button>
    </div>
  </section>
</template>

<style scoped>
.mongo-toolbar-group {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  min-width: 0;
}
.mongo-toolbar-label {
  font-size: 0.72rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--nfz-primary);
  font-weight: 700;
}
.mongo-selection-pill {
  border: 1px solid var(--nfz-border);
  background: var(--nfz-surface-soft);
  color: var(--nfz-text);
  border-radius: 9999px;
  padding: 0.38rem 0.85rem;
  font-size: 0.82rem;
  line-height: 1;
}

.mongo-pane {
  min-width: 0;
}
.mongo-top-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.75rem;
  min-width: 0;
}
.mongo-top-group {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.28rem 0.42rem;
  border: 1px solid var(--nfz-border);
  border-radius: 9999px;
  background: color-mix(in srgb, var(--nfz-surface) 86%, var(--nfz-primary) 3%);
}
.mongo-top-group-danger {
  background: color-mix(in srgb, var(--nfz-negative, #ef4444) 8%, var(--nfz-surface) 92%);
}
.mongo-stats-grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 160px), 1fr));
}
.mongo-actionbar {
  overflow: hidden;
}
.mongo-actionbar-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  width: 100%;
  min-width: 0;
}
.mongo-action-segment {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  flex: 1 1 22rem;
}
.mongo-action-segment-bulk {
  justify-content: flex-end;
}
.mongo-top-group,
.mongo-top-actions,
.mongo-query-actions,
.mongo-grid-shell,
.mongo-list-shell {
  min-width: 0;
}
.mongo-grid-scroll {
  overflow-x: auto;
  overflow-y: hidden;
  width: 100%;
  max-width: 100%;
}
.mongo-grid-shell :deep(.nfz-qgrid-wrap) {
  border: 0;
  border-radius: 0;
}
.mongo-grid-shell :deep(.q-table__middle),
.mongo-grid-shell :deep(.q-table__container) {
  min-width: 0;
}
@media (max-width: 1280px) {
  .mongo-top-actions {
    width: 100%;
    justify-content: flex-start;
  }
  .mongo-action-segment,
  .mongo-action-segment-bulk {
    flex-basis: 100%;
    justify-content: flex-start;
  }
}
@media (max-width: 900px) {
  .mongo-top-group {
    flex-wrap: wrap;
    border-radius: 1rem;
  }
}
.mongo-toolbar-inline-label {
  font-size: 0.68rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--nfz-primary);
  font-weight: 700;
  opacity: 0.9;
}
.mongo-query-shell {
  border: 1px solid var(--nfz-border);
  background: color-mix(in srgb, var(--nfz-surface) 86%, var(--nfz-primary) 4%);
}
.mongo-soft-btn :deep(.q-btn__content) {
  font-weight: 600;
}
.mongo-soft-btn {
  border: 1px solid var(--nfz-border);
  background: var(--nfz-surface-soft);
  color: var(--nfz-text);
}
.mongo-bulk-btn {
  background: color-mix(in srgb, var(--nfz-warning, #f59e0b) 14%, var(--nfz-surface) 86%);
}
:global(body.body--dark) .mongo-query-shell {
  background: color-mix(in srgb, var(--nfz-surface) 92%, var(--nfz-primary) 6%);
}
</style>

