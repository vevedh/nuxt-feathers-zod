<script setup lang="ts">
import { computed, ref } from 'vue'
import NfzQGrid from '~/components/nfz/ui/NfzQGrid.vue'

type GridColumn = {
  name: string
  label?: string
  field?: string | ((row: any) => any)
  align?: 'left' | 'right' | 'center'
  sortable?: boolean
}

const defaultRows = [
  { _id: '1', name: 'Alice', role: 'admin', active: true, score: 42, department: 'IT', createdAt: '2026-03-01T10:00:00Z' },
  { _id: '2', name: 'Bob', role: 'editor', active: false, score: 18, department: 'Finance', createdAt: '2026-03-02T10:00:00Z' },
  { _id: '3', name: 'Charlie', role: 'viewer', active: true, score: 27, department: 'HR', createdAt: '2026-03-03T10:00:00Z' },
]

function guessColumns(rows: any[]): GridColumn[] {
  const names = Array.from(new Set(rows.flatMap(row => Object.keys(row || {}))))
  return names.map(name => ({ name, label: name, field: name, sortable: true, align: 'left' }))
}

const rows = ref<any[]>([...defaultRows])
const columns = ref<GridColumn[]>(guessColumns(defaultRows))
const selectedKeys = ref<string[]>([])
const tableFilter = ref('')
const visibleColumns = ref<string[]>(columns.value.map(c => c.name))
const dense = ref(false)
const wrapCells = ref(false)
const editable = ref(true)
const virtualScroll = ref(false)
const virtualScrollItemSize = ref(42)
const importMode = ref<'replace' | 'append'>('replace')
const lastImportMeta = ref<{ fileName?: string, fileType?: string, count?: number }>({})
const columnAliases = ref<Record<string, string>>({})
const columnWidths = ref<Record<string, number>>({})
const filterPresets = ref<any[]>([])

const stats = computed(() => ({
  rows: rows.value.length,
  columns: columns.value.length,
  selected: selectedKeys.value.length,
  activeColumns: visibleColumns.value.length || columns.value.length,
}))

function buildSyntheticRows(count: number) {
  const roles = ['admin', 'editor', 'viewer', 'auditor']
  const departments = ['IT', 'Finance', 'HR', 'Ops', 'Support']
  return Array.from({ length: count }, (_, i) => ({
    _id: `row-${i + 1}`,
    name: `User ${i + 1}`,
    role: roles[i % roles.length],
    active: i % 2 === 0,
    score: Math.round((i * 7) % 100),
    department: departments[i % departments.length],
    createdAt: new Date(2026, 0, (i % 28) + 1).toISOString(),
    email: `user${i + 1}@example.local`,
    city: ['Paris', 'Lyon', 'Marseille', 'Bordeaux'][i % 4],
    tags: [`tag-${i % 3}`, `batch-${i % 8}`],
  }))
}

function applyDataset(mode: 'default' | 'small' | 'medium' | 'large') {
  const next = mode === 'default' ? [...defaultRows] : buildSyntheticRows(mode === 'small' ? 50 : mode === 'medium' ? 500 : 5000)
  rows.value = next
  columns.value = guessColumns(next)
  visibleColumns.value = columns.value.map(c => c.name)
  selectedKeys.value = []
}

function onImportData(payload: { rows: any[], columns: GridColumn[], fileName: string, fileType: 'json' | 'xlsx' }) {
  rows.value = importMode.value === 'append' ? [...rows.value, ...payload.rows] : payload.rows
  columns.value = guessColumns(rows.value)
  visibleColumns.value = columns.value.map(c => c.name)
  lastImportMeta.value = { fileName: payload.fileName, fileType: payload.fileType, count: payload.rows.length }
}

function onCellEdit({ row, column, value }: { row: any, column: GridColumn, value: any }) {
  const key = row?._id ?? row?.id
  const idx = rows.value.findIndex(r => (r?._id ?? r?.id) === key)
  if (idx >= 0) rows.value[idx] = { ...rows.value[idx], [column.name]: value }
}

function resetPlayground() {
  tableFilter.value = ''
  selectedKeys.value = []
  dense.value = false
  wrapCells.value = false
  editable.value = true
  virtualScroll.value = false
  virtualScrollItemSize.value = 42
  importMode.value = 'replace'
  columnAliases.value = {}
  columnWidths.value = {}
  filterPresets.value = []
  lastImportMeta.value = {}
  applyDataset('default')
}
</script>

<template>
  <QPage class="dash-page">
    <section class="dash-panel">
      <div class="dash-section-head">
        <div>
          <div class="dash-kicker">Playground</div>
          <h1 class="mt-2 dash-title">NfzQGrid test</h1>
          <p class="mt-2 dash-copy">Playground dashboard du composant avec imports, exports, préférences persistées, filtres avancés et virtual scroll.</p>
        </div>
        <div class="dash-toolbar">
          <QBtn unelevated color="primary" label="Base par défaut" @click="applyDataset('default')" />
          <QBtn flat color="primary" label="50 lignes" @click="applyDataset('small')" />
          <QBtn flat color="primary" label="500 lignes" @click="applyDataset('medium')" />
          <QBtn flat color="primary" label="5000 lignes" @click="applyDataset('large')" />
          <QBtn flat color="negative" label="Reset playground" @click="resetPlayground" />
        </div>
      </div>
    </section>

    <section class="dash-kpi-grid">
      <div class="dash-kpi-card">
        <div class="text-xs uppercase tracking-[0.12em] nfz-subtitle">Lignes</div>
        <div class="mt-2 text-2xl font-bold nfz-title">{{ stats.rows }}</div>
      </div>
      <div class="dash-kpi-card">
        <div class="text-xs uppercase tracking-[0.12em] nfz-subtitle">Colonnes</div>
        <div class="mt-2 text-2xl font-bold nfz-title">{{ stats.columns }}</div>
      </div>
      <div class="dash-kpi-card">
        <div class="text-xs uppercase tracking-[0.12em] nfz-subtitle">Colonnes visibles</div>
        <div class="mt-2 text-2xl font-bold nfz-title">{{ stats.activeColumns }}</div>
      </div>
      <div class="dash-kpi-card">
        <div class="text-xs uppercase tracking-[0.12em] nfz-subtitle">Sélection</div>
        <div class="mt-2 text-2xl font-bold nfz-title">{{ stats.selected }}</div>
      </div>
    </section>

    <section class="dash-panel">
      <div class="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <QToggle v-model="dense" label="Mode dense" color="primary" />
          <QToggle v-model="wrapCells" label="Retour à la ligne" color="primary" />
          <QToggle v-model="editable" label="Édition inline" color="primary" />
          <QToggle v-model="virtualScroll" label="Virtual scroll" color="primary" />
          <QInput v-model.number="virtualScrollItemSize" type="number" dense outlined label="Hauteur item virtual scroll" />
          <QSelect v-model="importMode" dense outlined emit-value map-options label="Mode import"
            :options="[{ label: 'Remplacer', value: 'replace' }, { label: 'Ajouter', value: 'append' }]" />
        </div>
        <div class="dash-side-note">
          <div class="font-medium mb-2 nfz-title">Dernier import</div>
          <div class="dash-info-list">
            <div class="dash-info-row"><span>Fichier</span><span>{{ lastImportMeta.fileName || '—' }}</span></div>
            <div class="dash-info-row"><span>Type</span><span>{{ lastImportMeta.fileType || '—' }}</span></div>
            <div class="dash-info-row"><span>Lignes importées</span><span>{{ lastImportMeta.count || 0 }}</span></div>
          </div>
          <div class="mt-3 text-xs nfz-subtitle">Filtres avancés : <code>&gt;=10</code>, <code>!empty</code>, <code>in:admin|editor</code>, <code>/mailbox/i</code>.</div>
        </div>
      </div>
    </section>

    <NfzQGrid
      storage-key="qgrid-test"
      file-name="nfz-qgrid-test"
      :rows="rows"
      :columns="columns"
      :selected-keys="selectedKeys"
      :table-filter="tableFilter"
      :visible-columns="visibleColumns"
      :dense="dense"
      :wrap-cells="wrapCells"
      :editable="editable"
      :virtual-scroll="virtualScroll"
      :virtual-scroll-item-size="virtualScrollItemSize"
      :column-aliases="columnAliases"
      :column-widths="columnWidths"
      :filter-presets="filterPresets"
      import-enabled
      @update:selected-keys="selectedKeys = $event"
      @update:table-filter="tableFilter = $event"
      @update:visible-columns="visibleColumns = $event"
      @update:dense="dense = $event"
      @update:column-aliases="columnAliases = $event"
      @update:column-widths="columnWidths = $event"
      @update:filter-presets="filterPresets = $event"
      @update:column-width="columnWidths = { ...columnWidths, [$event.name]: $event.width }"
      @cell-edit="onCellEdit"
      @import-data="onImportData"
    />
  </QPage>
</template>
