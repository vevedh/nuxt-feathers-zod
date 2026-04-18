<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { exportFile, useQuasar } from 'quasar'

type GridColumn = {
  name: string
  label?: string
  field?: string | ((row: any) => any)
  align?: 'left' | 'right' | 'center'
  sortable?: boolean
}

type FilterOperator = '=' | '!=' | '<' | '<=' | '>' | '>=' | 'like' | 'begin' | 'end' | 'regex' | 'empty' | 'notEmpty' | 'in'
type FilterRule = {
  id: string
  field: string
  operator: FilterOperator
  value: string
}

type FilterPreset = {
  id: string
  label: string
  filter?: string
  columnFilters?: Record<string, string>
  logic?: 'and' | 'or'
  rules?: FilterRule[]
  showColumnFilters?: boolean
}

type ViewPreset = {
  id: string
  label: string
  visibleColumns: string[]
  columnAliases: Record<string, string>
  columnWidths: Record<string, number>
  dense: boolean
  filter?: string
  columnFilters?: Record<string, string>
  logic?: 'and' | 'or'
  rules?: FilterRule[]
  showColumnFilters?: boolean
}

const props = withDefaults(defineProps<{
  rows: any[]
  columns: GridColumn[]
  loading?: boolean
  rowKey?: string
  visibleColumns?: string[]
  selectedKeys?: string[]
  pagination?: Record<string, any>
  dense?: boolean
  dark?: boolean
  flat?: boolean
  bordered?: boolean
  square?: boolean
  separator?: 'horizontal' | 'vertical' | 'cell' | 'none'
  csvDownload?: boolean
  fullscreen?: boolean
  globalSearch?: boolean
  tableFilter?: string
  searchPlaceholder?: string
  fileName?: string
  storageKey?: string
  virtualScroll?: boolean
  virtualScrollItemSize?: number
  enableColumnFilters?: boolean
  stickyHeader?: boolean
  tableHeight?: string
  editable?: boolean
  columnAliases?: Record<string, string>
  filterPresets?: FilterPreset[]
  columnWidths?: Record<string, number>
  wrapCells?: boolean
  importEnabled?: boolean
}>(), {
  loading: false,
  rowKey: '_id',
  visibleColumns: () => [],
  selectedKeys: () => [],
  pagination: () => ({ rowsPerPage: 25 }),
  dense: false,
  dark: false,
  flat: true,
  bordered: true,
  square: false,
  separator: 'horizontal',
  csvDownload: false,
  fullscreen: true,
  globalSearch: true,
  tableFilter: '',
  searchPlaceholder: 'Recherche',
  fileName: 'grid-export',
  storageKey: '',
  virtualScroll: false,
  virtualScrollItemSize: 42,
  enableColumnFilters: true,
  stickyHeader: true,
  tableHeight: '28rem',
  editable: false,
  columnAliases: () => ({}),
  filterPresets: () => [],
  columnWidths: () => ({}),
  wrapCells: false,
  importEnabled: false,
})

const emit = defineEmits<{
  request: [payload: any]
  'row-click': [row: any]
  'update:selectedKeys': [keys: string[]]
  'update:tableFilter': [value: string]
  'update:visibleColumns': [value: string[]]
  'update:dense': [value: boolean]
  'update:columnAliases': [value: Record<string, string>]
  'update:filterPresets': [value: FilterPreset[]]
  'update:columnWidth': [payload: { name: string, width: number }]
  'update:columnWidths': [value: Record<string, number>]
  'cell-edit': [payload: { row: any, column: GridColumn, value: any }]
  'import-data': [payload: { rows: any[], columns: GridColumn[], fileName: string, fileType: 'json' | 'xlsx' }]
}>()

const localFilter = ref(props.tableFilter)
const localDense = ref(!!props.dense)
const localVisibleColumns = ref<string[]>([])
const localColumnWidths = ref<Record<string, number>>({ ...(props.columnWidths || {}) })
const columnFilters = ref<Record<string, string>>({})
const localAliases = ref<Record<string, string>>({ ...(props.columnAliases || {}) })
const localPresets = ref<FilterPreset[]>([...(props.filterPresets || [])])
const localViews = ref<ViewPreset[]>([])
const newPresetLabel = ref('')
const newViewLabel = ref('')
const dragCol = ref('')
const localShowColumnFilters = ref(!!props.enableColumnFilters)
const localShowAdvancedFilters = ref(false)
const localFilterLogic = ref<'and' | 'or'>('and')
const localRules = ref<FilterRule[]>([])
const draftRule = ref<FilterRule>({ id: '', field: '', operator: 'like', value: '' })
const $q = useQuasar()
const importFileInput = ref<HTMLInputElement | null>(null)

const rowId = (row: any) => String(row?.[props.rowKey] ?? row?._id ?? row?.id ?? JSON.stringify(row))
const localSelectedRows = ref<any[]>([])

const arraysEqual = (a: any[] = [], b: any[] = []) => a.length === b.length && a.every((v, i) => v === b[i])
const shallowObjEqual = (a: Record<string, any> = {}, b: Record<string, any> = {}) => {
  const ak = Object.keys(a); const bk = Object.keys(b)
  return ak.length === bk.length && ak.every(k => a[k] === b[k])
}

let syncingSelectedFromProps = false
let syncingFilterFromProps = false
let syncingDenseFromProps = false
let syncingVisibleColumnsFromProps = false
let syncingAliasesFromProps = false
let syncingPresetsFromProps = false
let syncingColumnWidthsFromProps = false

watch(() => [props.rows, props.selectedKeys] as const, () => {
  const next = (props.rows || []).filter(r => props.selectedKeys.includes(rowId(r)))
  if (arraysEqual(next.map(rowId), localSelectedRows.value.map(rowId))) return
  syncingSelectedFromProps = true
  localSelectedRows.value = next
}, { immediate: true, deep: true })
watch(localSelectedRows, rows => {
  if (syncingSelectedFromProps) { syncingSelectedFromProps = false; return }
  const next = rows.map(rowId)
  if (!arraysEqual(next, props.selectedKeys || [])) emit('update:selectedKeys', next)
}, { deep: true })

watch(() => props.tableFilter, value => {
  const next = value || ''
  if (next === localFilter.value) return
  syncingFilterFromProps = true
  localFilter.value = next
})
watch(localFilter, value => {
  if (syncingFilterFromProps) { syncingFilterFromProps = false; return }
  const next = value || ''
  if (next !== (props.tableFilter || '')) emit('update:tableFilter', next)
  persistPrefs()
})
watch(() => props.dense, value => {
  const next = !!value
  if (next === localDense.value) return
  syncingDenseFromProps = true
  localDense.value = next
})
watch(localDense, value => {
  if (syncingDenseFromProps) { syncingDenseFromProps = false; return }
  if (value !== !!props.dense) emit('update:dense', value)
  persistPrefs()
})
watch(() => props.visibleColumns, value => {
  const next = value?.length ? [...value] : props.columns.map(c => c.name)
  if (arraysEqual(next, localVisibleColumns.value)) return
  syncingVisibleColumnsFromProps = true
  localVisibleColumns.value = next
}, { immediate: true, deep: true })
watch(() => props.columns, value => {
  const available = (value || []).map(c => c.name)
  const current = (localVisibleColumns.value || []).filter(name => available.includes(name))
  const desired = (props.visibleColumns?.length ? props.visibleColumns.filter(name => available.includes(name)) : current)

  if (!available.length) {
    if (!localVisibleColumns.value.length) return
    syncingVisibleColumnsFromProps = true
    localVisibleColumns.value = []
    return
  }

  const next = desired.length ? desired : available
  if (arraysEqual(next, localVisibleColumns.value)) return
  syncingVisibleColumnsFromProps = true
  localVisibleColumns.value = [...next]
}, { immediate: true, deep: true })
watch(localVisibleColumns, value => {
  if (syncingVisibleColumnsFromProps) { syncingVisibleColumnsFromProps = false; return }
  const next = [...value]
  if (!arraysEqual(next, props.visibleColumns || [])) emit('update:visibleColumns', next)
  persistPrefs()
}, { deep: true })
watch(() => props.columnAliases, value => {
  const next = { ...(value || {}) }
  if (shallowObjEqual(next, localAliases.value)) return
  syncingAliasesFromProps = true
  localAliases.value = next
}, { deep: true })
watch(localAliases, value => {
  if (syncingAliasesFromProps) { syncingAliasesFromProps = false; return }
  const next = { ...value }
  if (!shallowObjEqual(next, props.columnAliases || {})) emit('update:columnAliases', next)
  persistPrefs()
}, { deep: true })
watch(() => props.filterPresets, value => {
  const next = [...(value || [])]
  if (JSON.stringify(next) === JSON.stringify(localPresets.value)) return
  syncingPresetsFromProps = true
  localPresets.value = next
}, { deep: true })
watch(localPresets, value => {
  if (syncingPresetsFromProps) { syncingPresetsFromProps = false; return }
  emit('update:filterPresets', [...value])
  persistPrefs()
}, { deep: true })
watch([columnFilters, localShowColumnFilters, localShowAdvancedFilters, localFilterLogic, localRules], () => persistPrefs(), { deep: true })
watch(() => props.columnWidths, value => {
  const next = { ...(value || {}) }
  if (shallowObjEqual(next, localColumnWidths.value)) return
  syncingColumnWidthsFromProps = true
  localColumnWidths.value = next
}, { deep: true })
watch(localColumnWidths, value => {
  if (syncingColumnWidthsFromProps) { syncingColumnWidthsFromProps = false; return }
  emit('update:columnWidths', { ...value })
  persistPrefs()
}, { deep: true })

const effectivePagination = computed(() => props.virtualScroll ? { ...(props.pagination || {}), rowsPerPage: 0 } : (props.pagination || { rowsPerPage: 25 }))
const orderedColumns = computed(() => {
  const byName = new Map(props.columns.map(col => [col.name, col]))
  const ordered = localVisibleColumns.value.map(name => byName.get(name)).filter(Boolean) as GridColumn[]
  const rest = props.columns.filter(col => !localVisibleColumns.value.includes(col.name))
  return [...ordered, ...rest]
})
const visibleOrderedColumns = computed<GridColumn[]>(() => orderedColumns.value.filter(col => localVisibleColumns.value.includes(col.name)).map((col) => ({
  ...col,
  field: col.field || col.name,
  label: localAliases.value[col.name] || col.label || col.name,
  style: `width:${localColumnWidths.value?.[col.name] || 220}px;max-width:${localColumnWidths.value?.[col.name] || 220}px;${props.wrapCells ? 'white-space:normal;' : 'white-space:nowrap;'}`,
  classes: props.wrapCells ? 'whitespace-normal break-words' : 'truncate',
} as GridColumn)))

function prefsKey() { return props.storageKey ? `nfz-qgrid:${props.storageKey}` : '' }
function viewsKey() { return props.storageKey ? `nfz-qgrid-views:${props.storageKey}` : '' }
function loadPrefs() {
  if (!import.meta.client) return
  try {
    const key = prefsKey(); if (key) {
      const raw = localStorage.getItem(key)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed.visibleColumns) && parsed.visibleColumns.length) localVisibleColumns.value = parsed.visibleColumns
        if (typeof parsed.filter === 'string') localFilter.value = parsed.filter
        if (typeof parsed.dense === 'boolean') localDense.value = parsed.dense
        if (parsed.columnFilters) columnFilters.value = parsed.columnFilters
        if (parsed.aliases) localAliases.value = parsed.aliases
        if (parsed.columnWidths) localColumnWidths.value = parsed.columnWidths
        if (typeof parsed.showColumnFilters === 'boolean') localShowColumnFilters.value = parsed.showColumnFilters
        if (typeof parsed.showAdvancedFilters === 'boolean') localShowAdvancedFilters.value = parsed.showAdvancedFilters
        if (parsed.logic === 'and' || parsed.logic === 'or') localFilterLogic.value = parsed.logic
        if (Array.isArray(parsed.rules)) localRules.value = parsed.rules
      }
    }
    const vkey = viewsKey(); if (vkey) {
      const raw = localStorage.getItem(vkey)
      if (raw) localViews.value = JSON.parse(raw)
    }
  } catch {}
}
function persistPrefs() {
  if (!import.meta.client) return
  try {
    const key = prefsKey(); if (key) localStorage.setItem(key, JSON.stringify({ visibleColumns: localVisibleColumns.value, filter: localFilter.value, dense: localDense.value, columnFilters: columnFilters.value, aliases: localAliases.value, columnWidths: localColumnWidths.value, showColumnFilters: localShowColumnFilters.value, showAdvancedFilters: localShowAdvancedFilters.value, logic: localFilterLogic.value, rules: localRules.value }))
    const vkey = viewsKey(); if (vkey) localStorage.setItem(vkey, JSON.stringify(localViews.value))
  } catch {}
}
onMounted(loadPrefs)

function wrapCsvValue(val: any) { const f = val == null ? '' : String(val).replace(/"/g, '""'); return `"${f}"` }
function columnValue(col: GridColumn, row: any) { if (typeof col.field === 'function') return col.field(row); return row?.[(col.field || col.name) as string] }
function serializeCellValue(val: any) {
  if (val == null) return ''
  if (typeof val === 'object') {
    try { return JSON.stringify(val) } catch { return String(val) }
  }
  return String(val)
}
function buildExportPayload(scope: 'active' | 'all' = 'active') {
  const cols = (scope === 'active'
    ? visibleOrderedColumns.value
    : props.columns.map(col => ({
        ...col,
        label: localAliases.value[col.name] || col.label || col.name,
      })))
  const rows = scope === 'active' ? filteredRows.value : (props.rows || [])
  const records = rows.map((row) => Object.fromEntries(cols.map(col => [col.label || col.name, serializeCellValue(columnValue(col, row))])))
  return { cols, rows, records }
}
function downloadBlob(filename: string, content: BlobPart, mimeType: string) {
  exportFile(filename, content, mimeType)
}
function exportCsv(scope: 'active' | 'all' = 'active') {
  const { cols, rows } = buildExportPayload(scope)
  const header = cols.map(col => wrapCsvValue(col.label || col.name)).join(',')
  const body = rows
    .map(row => cols.map(col => wrapCsvValue(serializeCellValue(columnValue(col, row)))).join(','))
    .join('\n')
  const content = [header, body].filter(Boolean).join('\n')
  downloadBlob(`${props.fileName}-${scope}.csv`, content, 'text/csv;charset=utf-8')
}
function exportJson(scope: 'active' | 'all' = 'active') {
  const { records } = buildExportPayload(scope)
  downloadBlob(`${props.fileName}-${scope}.json`, JSON.stringify(records, null, 2), 'application/json;charset=utf-8')
}
function exportExcel(scope: 'active' | 'all' = 'active') {
  const { cols, rows } = buildExportPayload(scope)
  const table = [
    '<table><thead><tr>',
    ...cols.map(col => `<th>${String(col.label || col.name).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</th>`),
    '</tr></thead><tbody>',
    ...rows.map((row) => {
      const tds = cols.map((col) => {
        const value = serializeCellValue(columnValue(col, row))
        const safe = String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        return `<td>${safe}</td>`
      }).join('')
      return `<tr>${tds}</tr>`
    }),
    '</tbody></table>',
  ].join('')
  const content = `﻿<html><head><meta charset="utf-8"></head><body>${table}</body></html>`
  downloadBlob(`${props.fileName}-${scope}.xls`, content, 'application/vnd.ms-excel;charset=utf-8')
}
function exportPdf(scope: 'active' | 'all' = 'active') {
  const { cols, rows } = buildExportPayload(scope)
  const title = `${props.fileName} — ${scope === 'active' ? 'Vue active' : 'Toutes les données'}`
  const head = cols.map(col => `<th style="border:1px solid #ccc;padding:6px;text-align:left;background:#f5f5f5">${String(col.label || col.name).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</th>`).join('')
  const body = rows.map((row) => {
    const tds = cols.map((col) => {
      const value = serializeCellValue(columnValue(col, row))
      const safe = String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      return `<td style="border:1px solid #ddd;padding:6px;text-align:left">${safe}</td>`
    }).join('')
    return `<tr>${tds}</tr>`
  }).join('')
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>@page{size:auto;margin:12mm} body{font-family:Arial,sans-serif;padding:24px} h1{font-size:18px;margin-bottom:16px} table{border-collapse:collapse;width:100%;font-size:12px}
.nfz-qgrid-toolbar {
  width: 100%;
  justify-content: flex-end;
  overflow: hidden;
}
.nfz-qgrid-search {
  flex: 1 1 14rem;
}
.nfz-qgrid :deep(.q-table__top .q-space) {
  display: none;
}
.nfz-qgrid :deep(.q-table__top) {
  align-items: flex-start;
  flex-wrap: wrap;
  row-gap: 0.5rem;
}
.nfz-qgrid :deep(.q-table__top > *) {
  min-width: 0;
}
.nfz-qgrid :deep(.q-table__top .q-btn),
.nfz-qgrid :deep(.q-table__top .q-field),
.nfz-qgrid :deep(.q-table__top .q-btn-dropdown) {
  max-width: 100%;
}

</style></head><body><h1>${title}</h1><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  iframe.setAttribute('aria-hidden', 'true')
  document.body.appendChild(iframe)
  const cleanup = () => {
    try { iframe.remove() } catch {}
  }
  iframe.onload = () => {
    try {
      const w = iframe.contentWindow
      if (!w) throw new Error('print-frame-unavailable')
      w.focus()
      setTimeout(() => {
        try { w.print() } finally { setTimeout(cleanup, 1500) }
      }, 150)
    }
    catch (error) {
      cleanup()
      throw error
    }
  }
  const doc = iframe.contentDocument || iframe.contentWindow?.document
  if (!doc) {
    cleanup()
    throw new Error('print-document-unavailable')
  }
  doc.open()
  doc.write(html)
  doc.close()
}
function notifyMessage(type: 'positive' | 'negative', message: string) {
  const notify = ($q as any)?.notify
  if (typeof notify === 'function') {
    notify({ type, message })
    return
  }
  console[type === 'negative' ? 'error' : 'log'](`[NFZ QGrid] ${message}`)
}
function notifyExportError(error: unknown, format: string) {
  console.error(`[NFZ QGrid] export ${format} failed`, error)
  notifyMessage('negative', `Export ${format.toUpperCase()} impossible`)
}
async function runExport(format: 'json' | 'csv' | 'excel' | 'pdf', scope: 'active' | 'all') {
  try {
    if (format === 'json') return exportJson(scope)
    if (format === 'csv') return exportCsv(scope)
    if (format === 'excel') return await exportExcel(scope)
    if (format === 'pdf') return await exportPdf(scope)
  }
  catch (error) {
    notifyExportError(error, format)
  }
}

function guessColumnsFromRows(rows: any[]): GridColumn[] {
  const names = Array.from(new Set(rows.flatMap(row => Object.keys(row || {}))))
  return names.map(name => ({ name, label: name, field: name, sortable: true, align: 'left' }))
}
function normalizeImportedRows(value: any): any[] {
  if (Array.isArray(value)) return value
  if (value && Array.isArray(value.rows)) return value.rows
  if (value && Array.isArray(value.data)) return value.data
  if (value && typeof value === 'object') return [value]
  return []
}
function openImportDialog() {
  importFileInput.value?.click()
}
async function handleImportFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input?.files?.[0]
  if (!file) return
  try {
    const lower = file.name.toLowerCase()
    let rows: any[] = []
    let fileType: 'json' | 'xlsx' = 'json'
    if (lower.endsWith('.json')) {
      const text = await file.text()
      rows = normalizeImportedRows(JSON.parse(text))
      fileType = 'json'
    }
    else if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
      const XLSX = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const firstSheet = workbook.SheetNames[0]
      const worksheet = firstSheet ? workbook.Sheets[firstSheet] : undefined
      rows = worksheet ? XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as any[] : []
      fileType = 'xlsx'
    }
    else {
      throw new Error('unsupported-file')
    }
    const columns = guessColumnsFromRows(rows)
    emit('import-data', { rows, columns, fileName: file.name, fileType })
    notifyMessage('positive', `Import ${fileType.toUpperCase()} réussi (${rows.length} ligne(s))`)
  }
  catch (error) {
    console.error('[NFZ QGrid] import failed', error)
    notifyMessage('negative', 'Import JSON/XLSX impossible')
  }
  finally {
    if (input) input.value = ''
  }
}

function toggleColumn(name: string, enabled: boolean) {
  if (enabled) {
    if (!localVisibleColumns.value.includes(name)) localVisibleColumns.value = [...localVisibleColumns.value, name]
  } else {
    localVisibleColumns.value = localVisibleColumns.value.filter(n => n !== name)
  }
}
function onDragStart(name: string) { dragCol.value = name }
function onDrop(target: string) {
  const source = dragCol.value
  if (!source || source === target) return
  const cols = [...localVisibleColumns.value]
  const from = cols.indexOf(source)
  const to = cols.indexOf(target)
  if (from === -1 || to === -1) return
  const moved = cols.splice(from, 1)[0]
  if (!moved) return
  cols.splice(to, 0, moved)
  localVisibleColumns.value = cols
}
function makeId(prefix='id') { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}` }
function saveCurrentFilterPreset() {
  const label = newPresetLabel.value.trim(); if (!label) return
  localPresets.value = [...localPresets.value, { id: makeId('preset'), label, filter: localFilter.value, columnFilters: { ...columnFilters.value }, logic: localFilterLogic.value, rules: localRules.value.map(r => ({ ...r })), showColumnFilters: localShowColumnFilters.value }]
  newPresetLabel.value = ''
}
function applyFilterPreset(preset: FilterPreset) {
  localFilter.value = preset.filter || ''
  columnFilters.value = { ...(preset.columnFilters || {}) }
  localFilterLogic.value = preset.logic || 'and'
  localRules.value = (preset.rules || []).map(r => ({ ...r }))
  localShowColumnFilters.value = !!preset.showColumnFilters || Object.keys(preset.columnFilters || {}).length > 0
}
function clearCurrentFilters() {
  localFilter.value = ''
  columnFilters.value = {}
  localFilterLogic.value = 'and'
  localRules.value = []
  localShowColumnFilters.value = false
}
function samePresetAsCurrent(preset: FilterPreset) {
  return (preset.filter || '') === (localFilter.value || '')
    && JSON.stringify(preset.columnFilters || {}) === JSON.stringify(columnFilters.value || {})
    && (preset.logic || 'and') === localFilterLogic.value
    && JSON.stringify(preset.rules || []) === JSON.stringify(localRules.value || [])
    && (!!preset.showColumnFilters) === (!!localShowColumnFilters.value)
}
function removeFilterPreset(id: string) {
  const preset = localPresets.value.find(p => p.id === id)
  localPresets.value = localPresets.value.filter(p => p.id !== id)
  if (preset && samePresetAsCurrent(preset)) clearCurrentFilters()
}
function saveViewPreset() {
  const label = newViewLabel.value.trim(); if (!label) return
  localViews.value = [...localViews.value, {
    id: makeId('view'),
    label,
    visibleColumns: [...localVisibleColumns.value],
    columnAliases: { ...localAliases.value },
    columnWidths: { ...(localColumnWidths.value || {}) },
    dense: localDense.value,
    filter: localFilter.value,
    columnFilters: { ...columnFilters.value },
    logic: localFilterLogic.value,
    rules: localRules.value.map(r => ({ ...r })),
    showColumnFilters: localShowColumnFilters.value,
  }]
  newViewLabel.value = ''
  persistPrefs()
}
function applyViewPreset(view: ViewPreset) {
  localVisibleColumns.value = [...view.visibleColumns]
  localAliases.value = { ...view.columnAliases }
  localDense.value = !!view.dense
  localFilter.value = view.filter || ''
  columnFilters.value = { ...(view.columnFilters || {}) }
  localFilterLogic.value = view.logic || 'and'
  localRules.value = (view.rules || []).map(r => ({ ...r }))
  localShowColumnFilters.value = !!view.showColumnFilters || Object.keys(view.columnFilters || {}).length > 0
  localColumnWidths.value = { ...(view.columnWidths || {}) }
  Object.entries(view.columnWidths || {}).forEach(([name, width]) => emit('update:columnWidth', { name, width }))
}
function removeViewPreset(id: string) { localViews.value = localViews.value.filter(v => v.id !== id); persistPrefs() }
function startResize(colName: string, ev: MouseEvent) {
  const startX = ev.clientX; const start = localColumnWidths.value?.[colName] || 220
  const onMove = (e: MouseEvent) => {
    const width = Math.max(120, Math.min(800, start + e.clientX - startX))
    localColumnWidths.value = { ...localColumnWidths.value, [colName]: width }
    emit('update:columnWidth', { name: colName, width })
  }
  const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp)
}
function toggleRowSelection(row: any, checked: boolean) {
  const exists = localSelectedRows.value.some((r:any) => rowId(r) === rowId(row))
  if (checked && !exists) localSelectedRows.value = [...localSelectedRows.value, row]
  else if (!checked && exists) localSelectedRows.value = localSelectedRows.value.filter((r:any) => rowId(r) !== rowId(row))
}
function coerceValue(val: any) {
  if (val === 'true') return true
  if (val === 'false') return false
  if (val !== '' && !Number.isNaN(Number(val))) return Number(val)
  try { return JSON.parse(val) } catch { return val }
}
function inferColumnType(name: string, rows: any[]) {
  const values = rows.map(row => row?.[name]).filter(v => v !== null && v !== undefined && v !== '')
  if (!values.length) return 'string'
  if (values.every(v => typeof v === 'boolean' || v === 'true' || v === 'false')) return 'boolean'
  if (values.every(v => !Number.isNaN(Number(v)))) return 'number'
  if (values.every(v => !Number.isNaN(Date.parse(String(v))))) return 'date'
  return 'string'
}
function getColumnType(name: string) {
  return inferColumnType(name, props.rows || [])
}
function normalizeString(value: any) {
  return value == null ? '' : String(value)
}
function parseRegex(input: string) {
  const trimmed = input.trim()
  const match = trimmed.match(/^\/(.*)\/([gimsuy]*)$/)
  if (!match) return null
  try { return new RegExp(match[1] || '', match[2] || '') } catch { return null }
}
function compareValues(raw: any, expression: string, typeHint: string = 'string') {
  const expr = (expression || '').trim()
  if (!expr) return true
  const str = normalizeString(raw)
  const lower = str.toLowerCase()
  const regex = parseRegex(expr.startsWith('regex:') ? expr.slice(6) : expr)
  if (regex) return regex.test(str)
  if (expr === 'empty') return str === ''
  if (expr === '!empty' || expr === 'not:empty') return str !== ''
  if (typeHint === 'boolean') {
    if (['true', '=true', 'is:true'].includes(expr.toLowerCase())) return raw === true || lower === 'true'
    if (['false', '=false', 'is:false'].includes(expr.toLowerCase())) return raw === false || lower === 'false'
  }
  const num = Number(raw)
  const numeric = !Number.isNaN(num)
  const checks = [
    ['>=', (v: string) => numeric ? num >= Number(v) : str >= v],
    ['<=', (v: string) => numeric ? num <= Number(v) : str <= v],
    ['!=', (v: string) => lower !== v.toLowerCase()],
    ['>', (v: string) => numeric ? num > Number(v) : str > v],
    ['<', (v: string) => numeric ? num < Number(v) : str < v],
    ['=', (v: string) => lower === v.toLowerCase()],
  ] as const
  for (const [prefix, fn] of checks) {
    if (expr.startsWith(prefix)) return fn(expr.slice(prefix.length).trim())
  }
  if (expr.toLowerCase().startsWith('in:')) {
    const items = expr.slice(3).split('|').map(v => v.trim().toLowerCase()).filter(Boolean)
    return items.includes(lower)
  }
  return lower.includes(expr.toLowerCase())
}
function ruleMatches(rule: FilterRule, row: any) {
  const raw = row?.[rule.field]
  const left = raw == null ? '' : String(raw)
  const right = rule.value ?? ''
  const leftNum = Number(left)
  const rightNum = Number(right)
  switch (rule.operator) {
    case '=': return left === right
    case '!=': return left !== right
    case '<': return !Number.isNaN(leftNum) && !Number.isNaN(rightNum) ? leftNum < rightNum : left < right
    case '<=': return !Number.isNaN(leftNum) && !Number.isNaN(rightNum) ? leftNum <= rightNum : left <= right
    case '>': return !Number.isNaN(leftNum) && !Number.isNaN(rightNum) ? leftNum > rightNum : left > right
    case '>=': return !Number.isNaN(leftNum) && !Number.isNaN(rightNum) ? leftNum >= rightNum : left >= right
    case 'like': return left.toLowerCase().includes(right.toLowerCase())
    case 'begin': return left.toLowerCase().startsWith(right.toLowerCase())
    case 'end': return left.toLowerCase().endsWith(right.toLowerCase())
    case 'regex': return !!parseRegex(right)?.test(left)
    case 'empty': return left === ''
    case 'notEmpty': return left !== ''
    case 'in': return right.split('|').map(v => v.trim().toLowerCase()).filter(Boolean).includes(left.toLowerCase())
    default: return true
  }
}
function addDraftRule() {
  if (!draftRule.value.field || !draftRule.value.operator) return
  localRules.value = [...localRules.value, { ...draftRule.value, id: makeId('rule') }]
  draftRule.value = { id: '', field: '', operator: 'like', value: '' }
}
function removeRule(id: string) { localRules.value = localRules.value.filter(r => r.id !== id) }
const advancedRulesCount = computed(() => localRules.value.length)
const filteredRows = computed(() => {
  const text = (localFilter.value || '').trim().toLowerCase()
  return (props.rows || []).filter((row) => {
    if (text && !JSON.stringify(row).toLowerCase().includes(text)) return false
    for (const col of visibleOrderedColumns.value) {
      const f = (columnFilters.value[col.name] || '').trim()
      if (!f) continue
      if (!compareValues(columnValue(col, row), f, getColumnType(col.name))) return false
    }
    if (localRules.value.length) {
      const matches = localRules.value.map(rule => ruleMatches(rule, row))
      const ok = localFilterLogic.value === 'and' ? matches.every(Boolean) : matches.some(Boolean)
      if (!ok) return false
    }
    return true
  })
})

const selectedRowIds = computed(() => new Set(localSelectedRows.value.map(row => rowId(row))))
const visibleSelectableRows = computed(() => filteredRows.value)
const selectedVisibleCount = computed(() => visibleSelectableRows.value.filter(row => selectedRowIds.value.has(rowId(row))).length)
const allVisibleSelected = computed(() => visibleSelectableRows.value.length > 0 && selectedVisibleCount.value === visibleSelectableRows.value.length)
const someVisibleSelected = computed(() => selectedVisibleCount.value > 0 && !allVisibleSelected.value)
function toggleAllVisibleRows(checked: boolean) {
  if (checked) {
    const map = new Map(localSelectedRows.value.map(row => [rowId(row), row]))
    for (const row of visibleSelectableRows.value) map.set(rowId(row), row)
    localSelectedRows.value = Array.from(map.values())
    return
  }
  const visibleIds = new Set(visibleSelectableRows.value.map(row => rowId(row)))
  localSelectedRows.value = localSelectedRows.value.filter(row => !visibleIds.has(rowId(row)))
}

const fieldOptions = computed(() => props.columns.map(col => ({ label: localAliases.value[col.name] || col.label || col.name, value: col.name })))
const operatorOptions = [
  { label: '=', value: '=' },
  { label: '!=', value: '!=' },
  { label: '<', value: '<' },
  { label: '<=', value: '<=' },
  { label: '>', value: '>' },
  { label: '>=', value: '>=' },
  { label: 'like', value: 'like' },
  { label: 'begin', value: 'begin' },
  { label: 'end', value: 'end' },
  { label: 'regex', value: 'regex' },
  { label: 'empty', value: 'empty' },
  { label: 'notEmpty', value: 'notEmpty' },
  { label: 'in', value: 'in' },
]
const filterExpressionHelp = 'Exemples: >=10, <=2025-01-01, true, false, empty, !empty, in:admin|editor, /mailbox/i'
</script>

<template>
  <div class="nfz-qgrid-shell min-w-0 max-w-full overflow-hidden">
  <QTable
    :rows="filteredRows"
    :columns="visibleOrderedColumns as any"
    :loading="loading"
    :row-key="rowKey"
    selection="multiple"
    v-model:selected="localSelectedRows"
    :pagination="effectivePagination"
    :virtual-scroll="virtualScroll"
    :virtual-scroll-sticky-size-start="enableColumnFilters && localShowColumnFilters ? 96 : 48"
    :virtual-scroll-item-size="virtualScrollItemSize"
    :rows-per-page-options="virtualScroll ? [0] : [10, 25, 50, 100]"
    :dense="localDense"
    :flat="flat"
    :bordered="bordered"
    :square="square"
    :separator="separator"
    class="rounded-4 border border-[var(--nfz-border)] bg-[var(--nfz-surface)] nfz-qgrid"
    table-class="nfz-qgrid-table min-w-max"
    :table-style="stickyHeader ? `max-height:${tableHeight};` : undefined"
    hide-bottom
    @request="emit('request', $event)"
    @row-click="(_, row) => emit('row-click', row)"
  >
    <template #top-right="scope">
      <div class="nfz-qgrid-toolbar flex flex-wrap items-center gap-2 min-w-0 max-w-full">
        <QInput v-if="globalSearch" v-model="localFilter" filled borderless dense debounce="250" :placeholder="searchPlaceholder" class="nfz-qgrid-search min-w-0 sm:min-w-56">
          <template #append><QIcon name="search" /></template>
        </QInput>
        <QToggle v-model="localDense" dense color="primary" label="Dense" class="text-[var(--nfz-text)]" />
        <QBtn flat color="primary" :icon="localShowColumnFilters ? 'filter_alt_off' : 'filter_alt'" no-caps :label="localShowColumnFilters ? 'Masquer filtres colonnes' : 'Filtres colonnes'" @click="localShowColumnFilters = !localShowColumnFilters" />

        <QBtnDropdown flat color="primary" icon="view_column" label="Colonnes" no-caps>
          <div class="min-w-90 p-3 flex flex-col gap-2 bg-[var(--nfz-surface)] text-[var(--nfz-text)]">
            <div v-for="col in orderedColumns" :key="col.name" class="rounded-3 border border-[var(--nfz-border)] bg-[var(--nfz-surface-soft)] p-2" draggable="true" @dragstart="onDragStart(col.name)" @dragover.prevent @drop="onDrop(col.name)">
              <div class="flex items-center gap-2">
                <QCheckbox :model-value="localVisibleColumns.includes(col.name)" color="primary" @update:model-value="(v) => toggleColumn(col.name, !!v)" />
                <div class="i-mdi-drag text-[var(--nfz-muted)]" />
                <div class="min-w-0 flex-1 truncate text-sm">{{ localAliases[col.name] || col.label || col.name }}</div>
              </div>
            </div>
          </div>
        </QBtnDropdown>

        <QBtnDropdown flat color="primary" icon="edit_note" label="Libellés" no-caps>
          <div class="min-w-90 p-3 flex flex-col gap-2 bg-[var(--nfz-surface)] text-[var(--nfz-text)]">
            <div v-for="col in orderedColumns" :key="`alias-${col.name}`" class="nfz-soft p-2">
              <div class="mb-1 text-xs text-[var(--nfz-muted)]">{{ col.name }}</div>
              <QInput v-model="localAliases[col.name]" dense outlined placeholder="Nom affiché" />
            </div>
          </div>
        </QBtnDropdown>

        <QBtnDropdown flat color="primary" icon="rule" label="Filtres (CRUD)" no-caps>
          <div class="min-w-110 p-3 flex flex-col gap-3 bg-[var(--nfz-surface)] text-[var(--nfz-text)]">
            <div class="grid gap-3 md:grid-cols-4">
              <QSelect v-model="draftRule.field" dense outlined emit-value map-options :options="fieldOptions" label="Colonne" />
              <QSelect v-model="draftRule.operator" dense outlined emit-value map-options :options="operatorOptions" label="Opérateur" />
              <QInput v-model="draftRule.value" dense outlined label="Valeur / expression" :hint="filterExpressionHelp" />
              <QBtn color="primary" unelevated label="Ajouter" @click="addDraftRule" />
            </div>
            <div class="grid gap-3 md:grid-cols-2">
              <QBtnToggle v-model="localFilterLogic" unelevated toggle-color="primary" color="grey-3" text-color="dark" :options="[{ label: 'ET', value: 'and' }, { label: 'OU', value: 'or' }]" />
              <QInput v-model="newPresetLabel" dense outlined label="Nom du filtre" />
            </div>
            <div class="flex flex-wrap gap-2">
              <QBtn color="primary" unelevated label="Enregistrer le filtre courant" @click="saveCurrentFilterPreset" />
              <QBtn flat color="primary" :label="localShowAdvancedFilters ? 'Masquer builder' : 'Afficher builder'" @click="localShowAdvancedFilters = !localShowAdvancedFilters" />
            </div>
            <div v-if="localShowAdvancedFilters" class="max-h-48 overflow-auto flex flex-col gap-2">
              <div v-for="rule in localRules" :key="rule.id" class="nfz-soft p-3 flex items-center justify-between gap-3">
                <div class="text-sm"><strong>{{ rule.field }}</strong> {{ rule.operator }} <span class="text-[var(--nfz-muted)]">{{ rule.value }}</span></div>
                <QBtn flat round dense color="negative" icon="delete" @click="removeRule(rule.id)" />
              </div>
              <div v-if="!localRules.length" class="text-xs text-[var(--nfz-muted)]">Aucune règle avancée. Ajoute des filtres de type colonne + opérateur + valeur.</div>
            </div>
            <div class="text-xs text-[var(--nfz-muted)]">Filtres enregistrés : {{ localPresets.length }} · règles avancées : {{ advancedRulesCount }}</div>
            <div class="max-h-56 overflow-auto flex flex-col gap-2">
              <div v-for="preset in localPresets" :key="preset.id" class="nfz-soft p-3 flex items-center justify-between gap-3">
                <div>
                  <div class="font-medium">{{ preset.label }}</div>
                  <div class="text-xs text-[var(--nfz-muted)]">{{ (preset.logic || 'and').toUpperCase() }} · {{ preset.rules?.length || 0 }} règle(s)</div>
                </div>
                <div class="flex items-center gap-1">
                  <QBtn flat round dense icon="play_arrow" @click="applyFilterPreset(preset)" />
                  <QBtn flat round dense color="negative" icon="delete" @click="removeFilterPreset(preset.id)" />
                </div>
              </div>
            </div>
          </div>
        </QBtnDropdown>

        <QBtnDropdown flat color="primary" icon="table_view" label="Vues" no-caps>
          <div class="min-w-96 p-3 flex flex-col gap-3 bg-[var(--nfz-surface)] text-[var(--nfz-text)]">
            <QInput v-model="newViewLabel" dense outlined label="Nom de la vue" color="primary" />
            <QBtn color="primary" unelevated label="Enregistrer la vue courante" @click="saveViewPreset" />
            <div class="text-xs text-[var(--nfz-muted)]">Une vue mémorise colonnes, libellés, largeurs, densité et filtres.</div>
            <div class="max-h-72 overflow-auto flex flex-col gap-2">
              <div v-for="view in localViews" :key="view.id" class="nfz-soft p-3 flex items-center justify-between gap-3">
                <div>
                  <div class="font-medium">{{ view.label }}</div>
                  <div class="text-xs text-[var(--nfz-muted)]">{{ view.visibleColumns.length }} colonne(s) · {{ (view.rules?.length || 0) }} règle(s)</div>
                </div>
                <div class="flex items-center gap-1">
                  <QBtn flat round dense icon="play_arrow" @click="applyViewPreset(view)" />
                  <QBtn flat round dense color="negative" icon="delete" @click="removeViewPreset(view.id)" />
                </div>
              </div>
            </div>
          </div>
        </QBtnDropdown>

        <QBtn v-if="importEnabled" color="secondary" unelevated icon="upload_file" label="Importer" no-caps @click="openImportDialog" />
        <input ref="importFileInput" type="file" accept=".json,.xlsx,.xls" class="hidden" @change="handleImportFile" />
        <QBtnDropdown color="primary" unelevated icon="download" label="Exporter" no-caps>
          <QList class="min-w-72">
            <QItem clickable v-close-popup @click="runExport('json', 'active')"><QItemSection avatar><QIcon name="data_object" /></QItemSection><QItemSection>JSON · vue active</QItemSection></QItem>
            <QItem clickable v-close-popup @click="runExport('json', 'all')"><QItemSection avatar><QIcon name="dataset" /></QItemSection><QItemSection>JSON · toutes les données</QItemSection></QItem>
            <QSeparator />
            <QItem clickable v-close-popup @click="runExport('csv', 'active')"><QItemSection avatar><QIcon name="table_view" /></QItemSection><QItemSection>CSV · vue active</QItemSection></QItem>
            <QItem clickable v-close-popup @click="runExport('csv', 'all')"><QItemSection avatar><QIcon name="table_rows" /></QItemSection><QItemSection>CSV · toutes les données</QItemSection></QItem>
            <QSeparator />
            <QItem clickable v-close-popup @click="runExport('excel', 'active')"><QItemSection avatar><QIcon name="grid_on" /></QItemSection><QItemSection>Excel · vue active</QItemSection></QItem>
            <QItem clickable v-close-popup @click="runExport('excel', 'all')"><QItemSection avatar><QIcon name="view_agenda" /></QItemSection><QItemSection>Excel · toutes les données</QItemSection></QItem>
            <QSeparator />
            <QItem clickable v-close-popup @click="runExport('pdf', 'active')"><QItemSection avatar><QIcon name="picture_as_pdf" /></QItemSection><QItemSection>PDF · vue active</QItemSection></QItem>
            <QItem clickable v-close-popup @click="runExport('pdf', 'all')"><QItemSection avatar><QIcon name="description" /></QItemSection><QItemSection>PDF · toutes les données</QItemSection></QItem>
          </QList>
        </QBtnDropdown>
        <QBtn v-if="fullscreen" flat round dense :icon="scope.inFullscreen ? 'fullscreen_exit' : 'fullscreen'" @click="scope.toggleFullscreen" />
      </div>
    </template>

    <template #header="slotProps">
      <QTr :props="slotProps" class="nfz-qgrid-header-row">
        <QTh auto-width class="nfz-select-header-cell">
          <div class="nfz-select-box">
            <QCheckbox
              :model-value="allVisibleSelected"
              :indeterminate="someVisibleSelected"
              dense
              color="primary"
              @update:model-value="(v) => toggleAllVisibleRows(!!v)"
            />
          </div>
        </QTh>
        <QTh v-for="col in slotProps.cols" :key="col.name" :props="slotProps" :style="col.style" class="relative">
          <div class="flex items-center justify-between gap-2 whitespace-nowrap">
            <span>{{ col.label }}</span>
          </div>
          <div class="absolute right-0 top-0 h-full w-2 cursor-col-resize" @mousedown.stop.prevent="startResize(col.name, $event)" />
        </QTh>
      </QTr>
      <QTr v-if="enableColumnFilters && localShowColumnFilters" :props="slotProps" class="nfz-qgrid-filter-row bg-[var(--nfz-surface-soft)]">
        <th class="q-th q-table--col-auto-width align-top border-r border-[var(--nfz-border)] nfz-select-header-cell">
          <div class="flex h-full min-h-[56px] items-center justify-center px-2">
            <QIcon name="filter_alt" color="primary" />
          </div>
        </th>
        <th
          v-for="col in slotProps.cols"
          :key="`f-${col.name}`"
          class="q-th text-left align-top bg-[var(--nfz-surface-soft)]"
          :style="col.style"
        >
          <div class="w-full min-w-[160px] px-1 py-2">
            <QInput
              v-model="columnFilters[col.name]"
              dense
              outlined
              square
              clearable
              clear-icon="close"
              color="primary"
              bg-color="white"
              input-class="text-black text-[13px]"
              class="nfz-column-filter w-full"
              debounce="120"
              placeholder="Filtrer..."
              hide-bottom-space
            >
              <template #prepend>
                <QIcon name="search" size="14px" color="grey-6" />
              </template>
            </QInput>
          </div>
        </th>
      </QTr>
    </template>

    <template #body="slotProps">
      <QTr :props="slotProps">
        <QTd auto-width class="nfz-select-cell">
          <div class="nfz-select-box">
            <QCheckbox
              :model-value="localSelectedRows.some((r:any)=>rowId(r)===rowId(slotProps.row))"
              dense
              color="primary"
              @update:model-value="(v) => toggleRowSelection(slotProps.row, !!v)"
            />
          </div>
        </QTd>
        <QTd v-for="col in slotProps.cols" :key="col.name" :props="slotProps" :style="col.style" :class="col.classes">
          <div class="max-w-full truncate text-[var(--nfz-text)]" @dblclick.stop>
            <span>{{ typeof col.value === 'object' ? JSON.stringify(col.value) : col.value }}</span>
            <QPopupEdit v-if="editable" v-slot="scope" :model-value="typeof col.value === 'object' ? JSON.stringify(col.value) : String(col.value ?? '')" buttons label-set="Enregistrer" label-cancel="Annuler" @save="val => emit('cell-edit', { row: slotProps.row, column: col, value: coerceValue(val) })">
              <QInput v-model="scope.value" dense autofocus type="textarea" />
            </QPopupEdit>
          </div>
        </QTd>
      </QTr>
    </template>
  </QTable>
  </div>
</template>


<style scoped>

.nfz-qgrid-shell {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
}
.nfz-qgrid {
  width: 100%;
  min-width: 0;
  max-width: 100%;
}
.nfz-qgrid :deep(.q-table__container) {
  width: 100%;
  max-width: 100%;
  overflow: hidden;
}
.nfz-qgrid :deep(.q-table__top),
.nfz-qgrid :deep(.q-table__bottom) {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
}
.nfz-qgrid :deep(.q-table__middle) {
  display: block;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: auto;
  overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch;
}
.nfz-qgrid :deep(.q-table) {
  width: 100%;
  min-width: 0;
  max-width: 100%;
}
.nfz-qgrid :deep(.q-table__middle table) {
  width: 100%;
  min-width: 100%;
  table-layout: fixed;
}

.nfz-qgrid :deep(.nfz-select-header-cell),
.nfz-qgrid :deep(.nfz-select-cell) {
  width: 56px;
  min-width: 56px;
  max-width: 56px;
  padding-left: 6px;
  padding-right: 6px;
  overflow: visible !important;
  text-overflow: unset !important;
}

.nfz-qgrid :deep(.nfz-select-box) {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  width: 100%;
}

.nfz-qgrid :deep(.q-table tbody td),
.nfz-qgrid :deep(.q-table thead th) {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nfz-qgrid :deep(.nfz-select-header-cell),
.nfz-qgrid :deep(.nfz-select-cell),
.nfz-qgrid :deep(.nfz-select-header-cell *),
.nfz-qgrid :deep(.nfz-select-cell *) {
  overflow: visible !important;
  text-overflow: unset !important;
}

.nfz-qgrid :deep(.q-table thead th .q-checkbox),
.nfz-qgrid :deep(.q-table tbody td .q-checkbox) {
  flex: 0 0 auto;
}
.nfz-column-filter :deep(.q-field__control) {
  min-height: 38px;
  border-radius: 6px;
  background: #ffffff !important;
}
.nfz-qgrid-filter-row :deep(.q-th) {
  vertical-align: top;
}
.nfz-column-filter :deep(.q-field__native),
.nfz-column-filter :deep(.q-field__input),
.nfz-column-filter :deep(.q-field__marginal) {
  color: #111827;
}
.nfz-column-filter :deep(.q-placeholder) {
  color: #6b7280 !important;
  opacity: 1 !important;
}

.nfz-qgrid-toolbar {
  width: 100%;
  justify-content: flex-end;
  overflow: hidden;
}
.nfz-qgrid-search {
  flex: 1 1 14rem;
}
.nfz-qgrid :deep(.q-table__top .q-space) {
  display: none;
}
.nfz-qgrid :deep(.q-table__top) {
  align-items: flex-start;
  flex-wrap: wrap;
  row-gap: 0.5rem;
}
.nfz-qgrid :deep(.q-table__top > *) {
  min-width: 0;
}
.nfz-qgrid :deep(.q-table__top .q-btn),
.nfz-qgrid :deep(.q-table__top .q-field),
.nfz-qgrid :deep(.q-table__top .q-btn-dropdown) {
  max-width: 100%;
}

</style>
