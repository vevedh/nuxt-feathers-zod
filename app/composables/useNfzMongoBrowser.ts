import { computed, reactive, ref, watch } from 'vue'

export interface MongoDatabaseItem {
  name?: string
  dbName?: string
  databaseName?: string
  database?: string
  db?: string
  _id?: string
  [key: string]: any
}

export interface MongoCollectionItem {
  name?: string
  collectionName?: string
  collection?: string
  _id?: string
  [key: string]: any
}

function normalizeListItems<T = any>(arr: any[]): T[] {
  return arr
    .map((item: any) => {
      if (typeof item === 'string') return { name: item } as T
      if (item && typeof item === 'object' && !Array.isArray(item)) return item as T
      return null
    })
    .filter(Boolean) as T[]
}

function toArray<T = any>(value: any, preferredKeys: string[] = []): T[] {
  if (Array.isArray(value)) return normalizeListItems<T>(value)
  for (const key of preferredKeys) {
    if (Array.isArray(value?.[key])) return normalizeListItems<T>(value[key])
    if (Array.isArray(value?.data?.[key])) return normalizeListItems<T>(value.data[key])
  }
  if (Array.isArray(value?.data)) return normalizeListItems<T>(value.data)
  if (Array.isArray(value?.items)) return normalizeListItems<T>(value.items)
  if (Array.isArray(value?.results)) return normalizeListItems<T>(value.results)
  if (Array.isArray(value?.documents)) return normalizeListItems<T>(value.documents)
  if (Array.isArray(value?.collections)) return normalizeListItems<T>(value.collections)
  if (Array.isArray(value?.databases)) return normalizeListItems<T>(value.databases)
  if (Array.isArray(value?.indexes)) return normalizeListItems<T>(value.indexes)
  if (Array.isArray(value?.value)) return normalizeListItems<T>(value.value)
  if (Array.isArray(value?.data?.documents)) return normalizeListItems<T>(value.data.documents)
  if (Array.isArray(value?.data?.collections)) return normalizeListItems<T>(value.data.collections)
  if (Array.isArray(value?.data?.databases)) return normalizeListItems<T>(value.data.databases)
  if (Array.isArray(value?.data?.indexes)) return normalizeListItems<T>(value.data.indexes)
  return []
}

function normalizeError(error: any) {
  return error?.data?.message || error?.message || String(error)
}

function tryParseJson(value: string, fallback: any) {
  try {
    return value.trim() ? JSON.parse(value) : fallback
  }
  catch {
    return fallback
  }
}

function normalizeCount(value: any) {
  if (typeof value === 'number') return { count: value }
  if (typeof value?.count === 'number') return value
  if (typeof value?.total === 'number') return value
  if (typeof value?.data?.count === 'number') return value.data
  if (typeof value?.data?.total === 'number') return value.data
  return value ?? null
}

function normalizeSchema(value: any) {
  if (value?.data && !Array.isArray(value.data)) return value.data
  return value ?? null
}

function getDatabaseName(item: MongoDatabaseItem) {
  return item.name || item.dbName || item.databaseName || item.database || item.db || ''
}

function getCollectionName(item: MongoCollectionItem) {
  return item.name || item.collectionName || item.collection || ''
}

function cleanDocumentForWrite(doc: any) {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return doc
  const clone = JSON.parse(JSON.stringify(doc))
  delete clone._id
  delete clone.id
  return clone
}

function toDisplayString(value: any) {
  if (value == null) return ''
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  }
  catch {
    return String(value)
  }
}

function createCsv(rows: any[], columns: string[]) {
  const escape = (value: any) => `"${String(value ?? '').replace(/"/g, '""')}"`
  return [columns.map(escape).join(','), ...rows.map(row => columns.map(col => escape(row?.[col])).join(','))].join('\n')
}

type MongoBrowserPrefs = {
  visibleColumnNames?: string[]
  sortField?: string
  sortDir?: 1 | -1
  pageSize?: number
  viewMode?: 'table' | 'list'
  tableDensity?: 'compact' | 'comfortable'
  wrapCells?: boolean
  columnWidths?: Record<string, number>
}

const PREF_KEY = 'nfz:mongo-browser:prefs:v6'

function loadPrefs(): MongoBrowserPrefs {
  if (!import.meta.client) return {}
  try {
    const raw = localStorage.getItem(PREF_KEY)
    return raw ? JSON.parse(raw) : {}
  }
  catch {
    return {}
  }
}

function savePrefs(prefs: MongoBrowserPrefs) {
  if (!import.meta.client) return
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify(prefs))
  }
  catch {}
}

function encodePath(value: string) {
  return encodeURIComponent(String(value || ''))
}

export function useNfzMongoBrowser() {
  const management = useMongoManagementClient()
  const tool = useProtectedTool(management.basePath)

  const state = reactive({
    databases: [] as MongoDatabaseItem[],
    collections: [] as MongoCollectionItem[],
    documents: [] as any[],
    indexes: [] as any[],
    schema: null as any,
    stats: null as any,
    dbStats: null as any,
    selectedDatabase: '',
    selectedCollection: '',
    selectedDocument: null as any | null,
    selectedDocumentKeys: [] as string[],
    activeDocumentJson: '{}',
    queryText: `\{
  "$limit": 25
\}`,
    treeFilter: '',
    quickSearch: '',
    viewMode: 'table' as 'table' | 'list',
    page: 1,
    pageSize: 25,
    totalDocs: 0,
    sortField: '_id',
    sortDir: -1 as 1 | -1,
    loadingDatabases: false,
    loadingCollections: false,
    loadingDocuments: false,
    loadingInspector: false,
    savingDocument: false,
    deletingDocument: false,
    loadingDbStats: false,
    creatingCollection: false,
    droppingCollection: false,
    error: null as string | null,
    rawDatabases: null as any,
    rawCollections: null as any,
    rawDocuments: null as any,
    collectionsByDatabase: {} as Record<string, MongoCollectionItem[]>,
    expandedNodes: [] as string[],
    visibleColumnNames: [] as string[],
    columnWidths: {} as Record<string, number>,
    tableDensity: 'comfortable' as 'compact' | 'comfortable',
    wrapCells: false,
  })

  const initialPrefs = loadPrefs()
  if (initialPrefs.visibleColumnNames) state.visibleColumnNames = [...initialPrefs.visibleColumnNames]
  if (initialPrefs.sortField) state.sortField = initialPrefs.sortField
  if (initialPrefs.sortDir) state.sortDir = initialPrefs.sortDir
  if (initialPrefs.pageSize) state.pageSize = initialPrefs.pageSize
  if (initialPrefs.viewMode) state.viewMode = initialPrefs.viewMode
  if (initialPrefs.tableDensity) state.tableDensity = initialPrefs.tableDensity
  if (typeof initialPrefs.wrapCells === 'boolean') state.wrapCells = initialPrefs.wrapCells
  if (initialPrefs.columnWidths) state.columnWidths = { ...initialPrefs.columnWidths }

  function documentsPath(dbName = state.selectedDatabase, collectionName = state.selectedCollection, id?: any) {
    const base = `${encodePath(dbName)}/${encodePath(collectionName)}/documents`
    return id == null ? base : `${base}/${encodeURIComponent(String(id))}`
  }

  function collectionPath(dbName = state.selectedDatabase, collectionName?: string) {
    const base = `${encodePath(dbName)}/collections`
    return collectionName ? `${base}/${encodePath(collectionName)}` : base
  }

  function extractDocumentId(doc: any) {
    return doc?._id || doc?.id || null
  }

  async function patchDocument(documentId: any, payload: Record<string, any>) {
    try {
      return await tool.patch(documentsPath(state.selectedDatabase, state.selectedCollection, documentId), payload)
    }
    catch {
      for (const query of [{ _id: String(documentId) }, { id: String(documentId) }]) {
        try {
          return await tool.patch(documentsPath(), payload, { query })
        }
        catch {}
      }
      throw new Error('Impossible de patcher le document')
    }
  }

  async function createDocumentRequest(payload: Record<string, any>) {
    return await tool.post(documentsPath(), payload)
  }

  async function removeDocumentRequest(documentId: any) {
    try {
      return await tool.remove(documentsPath(state.selectedDatabase, state.selectedCollection, documentId))
    }
    catch {
      for (const query of [{ _id: String(documentId) }, { id: String(documentId) }]) {
        try {
          return await tool.remove(documentsPath(), { query })
        }
        catch {}
      }
      throw new Error('Impossible de supprimer le document')
    }
  }

  async function loadDatabases() {
    state.loadingDatabases = true
    state.error = null
    try {
      const data = await management.getDatabases()
      state.rawDatabases = data ?? null
      state.databases = toArray<MongoDatabaseItem>(data, ['databases', 'dbs'])
      if (!state.selectedDatabase && state.databases[0]) {
        const nextDb = getDatabaseName(state.databases[0])
        if (nextDb && nextDb !== state.selectedDatabase) state.selectedDatabase = nextDb
      }
    }
    catch (e: any) {
      state.error = normalizeError(e)
      state.databases = []
    }
    finally {
      state.loadingDatabases = false
    }
  }

  async function loadCollections(dbName = state.selectedDatabase) {
    if (!dbName) return
    state.loadingCollections = true
    state.error = null
    try {
      const data = await management.getCollections(dbName)
      state.rawCollections = data ?? null
      const items = toArray<MongoCollectionItem>(data, ['collections'])
      state.collectionsByDatabase[dbName] = items
      if (dbName === state.selectedDatabase)
        state.collections = items
      if (dbName === state.selectedDatabase && !state.selectedCollection && items[0]) {
        const firstName = getCollectionName(items[0])
        if (state.selectedCollection !== firstName) state.selectedCollection = firstName
      }
    }
    catch (e: any) {
      state.error = normalizeError(e)
      if (dbName === state.selectedDatabase) state.collections = []
    }
    finally {
      state.loadingCollections = false
    }
  }

  async function loadDbStats(dbName = state.selectedDatabase) {
    if (!dbName) return
    state.loadingDbStats = true
    try {
      state.dbStats = await management.getStats(dbName)
    }
    catch {
      state.dbStats = null
    }
    finally {
      state.loadingDbStats = false
    }
  }

  function getDocumentKey(doc: any) {
    return String(doc?._id || doc?.id || JSON.stringify(doc))
  }

  async function loadDocuments() {
    if (!state.selectedDatabase || !state.selectedCollection) return
    state.loadingDocuments = true
    state.loadingInspector = true
    state.error = null
    try {
      const parsed = tryParseJson(state.queryText, {})
      const query = {
        ...parsed,
        $limit: Number(parsed?.$limit ?? state.pageSize),
        $skip: Number(parsed?.$skip ?? ((state.page - 1) * state.pageSize)),
        $sort: { [state.sortField || '_id']: state.sortDir },
      }

      const [docsRes, countRes, indexesRes, schemaRes] = await Promise.allSettled([
        management.getDocuments(state.selectedDatabase, state.selectedCollection, query),
        management.getCount(state.selectedDatabase, state.selectedCollection),
        management.getIndexes(state.selectedDatabase, state.selectedCollection),
        management.getSchema(state.selectedDatabase, state.selectedCollection),
      ])

      const docsValue = docsRes.status === 'fulfilled' ? docsRes.value : null
      state.rawDocuments = docsValue
      state.documents = docsValue ? toArray(docsValue, ['documents', 'docs']) : []
      const countValue = countRes.status === 'fulfilled' ? normalizeCount(countRes.value) : null
      state.stats = countValue
      state.totalDocs = Number(countValue?.count ?? countValue?.total ?? state.documents.length ?? 0)
      state.indexes = indexesRes.status === 'fulfilled' ? toArray(indexesRes.value, ['indexes']) : []
      state.schema = schemaRes.status === 'fulfilled' ? normalizeSchema(schemaRes.value) : null
      if (!state.selectedDocument || !state.documents.find(doc => getDocumentKey(doc) === getDocumentKey(state.selectedDocument)))
        state.selectedDocument = state.documents[0] ?? null
      state.selectedDocumentKeys = state.selectedDocumentKeys.filter(k => state.documents.some(doc => getDocumentKey(doc) === k))
    }
    catch (e: any) {
      state.error = normalizeError(e)
      state.documents = []
      state.selectedDocument = null
      state.selectedDocumentKeys = []
    }
    finally {
      state.loadingDocuments = false
      state.loadingInspector = false
    }
  }

  async function selectDatabase(name: string) {
    if (!name || state.selectedDatabase === name) return
    state.selectedDatabase = name
    state.selectedCollection = ''
    state.collections = state.collectionsByDatabase[name] || []
    state.documents = []
    state.selectedDocument = null
    state.selectedDocumentKeys = []
    state.indexes = []
    state.schema = null
    state.stats = null
    state.dbStats = null
    state.page = 1
    await handleDatabaseChange(name)
  }

  async function selectCollection(name: string) {
    if (!name || state.selectedCollection === name) return
    state.selectedCollection = name
    state.documents = []
    state.selectedDocument = null
    state.selectedDocumentKeys = []
    state.page = 1
    await handleCollectionChange(name)
  }

  async function onTreeExpand(keys: string[]) {
    state.expandedNodes = keys
    const dbKeys = keys.filter(k => k.startsWith('db:')).map(k => k.replace(/^db:/, ''))
    await Promise.all(dbKeys.map(db => state.collectionsByDatabase[db] ? Promise.resolve() : loadCollections(db)))
  }

  function selectTreeNode(key: string) {
    if (key.startsWith('col:')) {
      const [, dbName, collectionName] = key.split(':')
      if (dbName && dbName !== state.selectedDatabase) void selectDatabase(dbName)
      if (collectionName) void selectCollection(collectionName)
      return
    }
    if (key.startsWith('db:')) void selectDatabase(key.replace(/^db:/, ''))
  }

  async function nextPage() {
    const maxPage = Math.max(1, Math.ceil((state.totalDocs || 0) / state.pageSize))
    if (state.page < maxPage) {
      state.page += 1
      await loadDocuments()
    }
  }

  async function prevPage() {
    if (state.page > 1) {
      state.page -= 1
      await loadDocuments()
    }
  }

  async function applyPagingAndSort() {
    state.page = 1
    await loadDocuments()
  }

  function resetQuery() {
    state.quickSearch = ''
    state.queryText = `\{
  "$limit": ${state.pageSize}
\}`
  }

  function applyQuickPreset(kind: 'all' | 'withId' | 'createdDesc') {
    if (kind === 'all') { resetQuery(); return }
    if (kind === 'withId') {
      state.queryText = `\{
  "_id": { "$exists": true },
  "$limit": ${state.pageSize}
\}`
      return
    }
    if (kind === 'createdDesc') {
      state.sortField = 'createdAt'
      state.sortDir = -1
      state.queryText = `\{
  "$limit": ${state.pageSize}
\}`
    }
  }

  async function createDocument() {
    state.selectedDocument = null
    state.activeDocumentJson = '{\n  \n}'
  }

  function toggleDocumentSelection(doc: any) {
    const key = getDocumentKey(doc)
    state.selectedDocumentKeys = state.selectedDocumentKeys.includes(key)
      ? state.selectedDocumentKeys.filter(k => k !== key)
      : [...state.selectedDocumentKeys, key]
  }

  function selectAllCurrentPage() {
    state.selectedDocumentKeys = filteredDocuments.value.map(doc => getDocumentKey(doc))
  }

  function clearSelection() {
    state.selectedDocumentKeys = []
  }

  function replaceSelectedKeys(keys: string[]) {
    state.selectedDocumentKeys = [...new Set(keys)]
  }

  async function inlinePatchField(payload: { row: any, column: any, value: any }) {
    if (!state.selectedDatabase || !state.selectedCollection) return
    const row = payload?.row
    const field = typeof payload?.column?.name === 'string' ? payload.column.name : ''
    if (!row || !field) return

    const documentId = extractDocumentId(row)
    const patchPayload = { [field]: payload.value }

    state.savingDocument = true
    state.error = null
    try {
      if (documentId) await patchDocument(documentId, patchPayload)
      else await createDocumentRequest(cleanDocumentForWrite({ ...(row || {}), ...patchPayload }))
      const merged = { ...(row || {}), ...patchPayload }
      state.selectedDocument = merged
      state.activeDocumentJson = JSON.stringify(merged, null, 2)
      await loadDocuments()
    }
    catch (e: any) {
      state.error = normalizeError(e)
    }
    finally {
      state.savingDocument = false
    }
  }

  async function saveActiveDocument() {
    if (!state.selectedDatabase || !state.selectedCollection) return
    state.savingDocument = true
    state.error = null
    try {
      const parsed = tryParseJson(state.activeDocumentJson, null)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
        throw new Error('Le document JSON doit être un objet valide')
      const id = extractDocumentId(parsed) || extractDocumentId(state.selectedDocument)
      if (id) await patchDocument(id, cleanDocumentForWrite(parsed))
      else await createDocumentRequest(cleanDocumentForWrite(parsed))
      await loadDocuments()
    }
    catch (e: any) {
      state.error = normalizeError(e)
    }
    finally {
      state.savingDocument = false
    }
  }

  async function deleteSelectedDocument() {
    if (!state.selectedDocument) return
    state.deletingDocument = true
    state.error = null
    try {
      const id = extractDocumentId(state.selectedDocument)
      if (!id) throw new Error('Document sans identifiant supprimable')
      await removeDocumentRequest(id)
      state.selectedDocument = null
      await loadDocuments()
    }
    catch (e: any) {
      state.error = normalizeError(e)
    }
    finally {
      state.deletingDocument = false
    }
  }

  async function bulkDeleteSelected() {
    if (!state.selectedDocumentKeys.length) return
    state.deletingDocument = true
    state.error = null
    try {
      for (const key of [...state.selectedDocumentKeys])
        await removeDocumentRequest(key)
      state.selectedDocumentKeys = []
      state.selectedDocument = null
      await loadDocuments()
    }
    catch (e: any) {
      state.error = normalizeError(e)
    }
    finally {
      state.deletingDocument = false
    }
  }

  async function createCollection() {
    if (!state.selectedDatabase || !import.meta.client) return
    const name = window.prompt('Nom de la nouvelle collection ?')?.trim()
    if (!name) return
    state.creatingCollection = true
    state.error = null
    try {
      await tool.post(collectionPath(), { name })
      await loadCollections(state.selectedDatabase)
      state.selectedCollection = name
    }
    catch (e: any) {
      state.error = normalizeError(e)
    }
    finally {
      state.creatingCollection = false
    }
  }

  async function dropSelectedCollection() {
    if (!state.selectedDatabase || !state.selectedCollection || !import.meta.client) return
    const ok = window.confirm(`Supprimer la collection ${state.selectedCollection} ?`)
    if (!ok) return
    state.droppingCollection = true
    state.error = null
    try {
      await tool.remove(collectionPath(state.selectedDatabase, state.selectedCollection))
      const dropped = state.selectedCollection
      state.selectedCollection = ''
      state.documents = []
      state.selectedDocument = null
      state.selectedDocumentKeys = []
      delete state.collectionsByDatabase[state.selectedDatabase]
      await loadCollections(state.selectedDatabase)
      if (state.selectedCollection === dropped) state.selectedCollection = ''
    }
    catch (e: any) {
      state.error = normalizeError(e)
    }
    finally {
      state.droppingCollection = false
    }
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportCurrentPage(format: 'json' | 'csv' = 'json') {
    const rows = filteredDocuments.value
    if (!rows.length || !import.meta.client) return
    const stamp = `${state.selectedDatabase}-${state.selectedCollection}-${Date.now()}`
    if (format === 'json') {
      downloadBlob(new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json;charset=utf-8' }), `${stamp}.json`)
      return
    }
    const columns = effectiveColumns.value.map(col => col.name)
    downloadBlob(new Blob([createCsv(rows, columns)], { type: 'text/csv;charset=utf-8' }), `${stamp}.csv`)
  }

  function setVisibleColumns(names: string[]) {
    state.visibleColumnNames = [...names]
  }

  function setColumnWidth(name: string, width: number) {
    const safe = Math.max(120, Math.min(640, Number(width) || 220))
    state.columnWidths = { ...state.columnWidths, [name]: safe }
  }

  function resetColumnWidths() {
    state.columnWidths = {}
  }

  function setTableDensity(value: 'compact' | 'comfortable') {
    state.tableDensity = value
  }

  function selectAllFiltered() {
    state.selectedDocumentKeys = filteredDocuments.value.map(doc => getDocumentKey(doc))
  }

  function invertSelection() {
    const current = new Set(state.selectedDocumentKeys)
    state.selectedDocumentKeys = filteredDocuments.value.map(doc => getDocumentKey(doc)).filter(key => !current.has(key))
  }

  async function bulkExportSelected(format: 'json' | 'csv' = 'json') {
    if (!import.meta.client || !state.selectedDocumentKeys.length) return
    const rows = state.documents.filter(doc => state.selectedDocumentKeys.includes(getDocumentKey(doc)))
    if (!rows.length) return
    const stamp = `${state.selectedDatabase}-${state.selectedCollection}-selected-${Date.now()}`
    if (format === 'json') {
      downloadBlob(new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json;charset=utf-8' }), `${stamp}.json`)
      return
    }
    const columns = effectiveColumns.value.map(col => col.name)
    downloadBlob(new Blob([createCsv(rows, columns)], { type: 'text/csv;charset=utf-8' }), `${stamp}.csv`)
  }

  async function bulkPatchSelected() {
    if (!import.meta.client || !state.selectedDocumentKeys.length) return
    const field = window.prompt('Champ à mettre à jour sur les documents sélectionnés ?')?.trim()
    if (!field) return
    const rawValue = window.prompt(`Valeur JSON pour "${field}" ?`, 'true')
    const parsedValue = tryParseJson(rawValue ?? '', rawValue)
    state.savingDocument = true
    state.error = null
    try {
      for (const key of state.selectedDocumentKeys)
        await patchDocument(key, { [field]: parsedValue })
      await loadDocuments()
    }
    catch (e: any) {
      state.error = normalizeError(e)
    }
    finally {
      state.savingDocument = false
    }
  }

  const totalPages = computed(() => Math.max(1, Math.ceil((state.totalDocs || 0) / state.pageSize)))

  const filteredDocuments = computed(() => {
    const needle = state.quickSearch.trim().toLowerCase()
    if (!needle) return state.documents
    return state.documents.filter((doc) => toDisplayString(doc).toLowerCase().includes(needle))
  })

  const allColumns = computed(() => {
    const keys = new Set<string>()
    for (const doc of filteredDocuments.value)
      Object.keys(doc || {}).slice(0, 24).forEach(k => keys.add(k))
    const ordered = Array.from(keys)
    if (ordered.includes('_id')) {
      ordered.splice(ordered.indexOf('_id'), 1)
      ordered.unshift('_id')
    }
    return ordered.slice(0, 12).map(key => ({
      name: key,
      label: key,
      field: (row: any) => typeof row?.[key] === 'object' ? JSON.stringify(row[key]) : row?.[key],
      align: 'left' as const,
      sortable: false,
    }))
  })

  const effectiveColumns = computed(() => {
    const wanted = state.visibleColumnNames.length ? state.visibleColumnNames : allColumns.value.map(col => col.name)
    return allColumns.value
      .filter(col => wanted.includes(col.name))
      .map((col) => {
        const width = state.columnWidths[col.name] || 220
        const whiteSpace = state.wrapCells ? 'normal' : 'nowrap'
        const overflow = state.wrapCells ? 'visible' : 'hidden'
        const textOverflow = state.wrapCells ? 'clip' : 'ellipsis'
        return {
          ...col,
          headerStyle: `width:${width}px; min-width:${width}px; max-width:${width}px;`,
          style: `width:${width}px; min-width:${width}px; max-width:${width}px; white-space:${whiteSpace}; overflow:${overflow}; text-overflow:${textOverflow};`,
        }
      })
  })

  const treeNodes = computed(() => {
    const needle = state.treeFilter.trim().toLowerCase()
    const nodes = state.databases.map((db) => {
      const dbName = getDatabaseName(db)
      const collections = (state.collectionsByDatabase[dbName] || []).map(collection => ({
        key: `col:${dbName}:${getCollectionName(collection)}`,
        label: getCollectionName(collection),
        icon: 'description',
        raw: collection,
      }))
      return {
        key: `db:${dbName}`,
        label: dbName,
        icon: 'dns',
        raw: db,
        children: collections,
        lazy: false,
      }
    })
    if (!needle) return nodes
    return nodes.map((dbNode) => {
      const dbMatch = dbNode.label.toLowerCase().includes(needle)
      const children = (dbNode.children || []).filter((child: any) => child.label.toLowerCase().includes(needle))
      if (dbMatch) return dbNode
      if (children.length) return { ...dbNode, children }
      return null
    }).filter(Boolean)
  })

  const statsCards = computed(() => {
    const countValue = state.stats?.count ?? state.stats?.total ?? state.documents.length
    const dbObjects = state.dbStats?.objects ?? state.dbStats?.data?.objects ?? '—'
    return [
      { label: 'Base active', value: state.selectedDatabase || '—' },
      { label: 'Collection', value: state.selectedCollection || '—' },
      { label: 'Documents', value: countValue ?? '—' },
      { label: 'Page', value: `${state.page}/${totalPages.value}` },
      { label: 'Indexes', value: state.indexes?.length ?? 0 },
      { label: 'Objets DB', value: dbObjects },
    ]
  })

  const schemaBadges = computed(() => {
    const s = state.schema || {}
    return Object.keys(s).slice(0, 8).map(key => ({ label: key, value: typeof s[key] === 'object' ? 'object' : String(s[key]) }))
  })

  const indexBadges = computed(() => state.indexes.slice(0, 8).map((idx: any, i: number) => ({
    label: idx?.name || `index-${i + 1}`,
    value: Object.keys(idx?.key || {}).join(', ') || 'key',
  })))

  function syncVisibleColumns(cols = allColumns.value) {
    const names = cols.map(col => col.name)
    if (!names.length) return
    if (!state.visibleColumnNames.length) {
      state.visibleColumnNames = [...names.slice(0, 8)]
      return
    }
    const next = state.visibleColumnNames.filter(name => names.includes(name))
    for (const name of names) if (!next.includes(name) && next.length < 8) next.push(name)
    if (JSON.stringify(next) !== JSON.stringify(state.visibleColumnNames)) state.visibleColumnNames = next
  }

  watch(allColumns, (cols) => {
    const before = JSON.stringify(state.visibleColumnNames)
    syncVisibleColumns(cols)
    const after = JSON.stringify(state.visibleColumnNames)
    if (before === after) return
  }, { flush: 'post' })

  const loadingDbKey = ref('')
  const loadingCollectionKey = ref('')

  async function handleDatabaseChange(value: string) {
    if (!value) return
    const key = value
    if (loadingDbKey.value === key) return
    loadingDbKey.value = key
    try {
      await loadDbStats(value)
      if (state.collectionsByDatabase[value]) {
        state.collections = state.collectionsByDatabase[value]
        if (!state.selectedCollection && state.collections[0]) state.selectedCollection = getCollectionName(state.collections[0])
      }
      else {
        await loadCollections(value)
      }
    } finally {
      loadingDbKey.value = ''
    }
  }

  async function handleCollectionChange(value: string) {
    if (!value || !state.selectedDatabase) return
    const key = `${state.selectedDatabase}:${value}:${state.page}:${state.pageSize}:${state.sortField}:${state.sortDir}:${state.queryText}`
    if (loadingCollectionKey.value === key) return
    loadingCollectionKey.value = key
    try {
      await loadDocuments()
      syncVisibleColumns()
    } finally {
      loadingCollectionKey.value = ''
    }
  }

  watch(() => state.selectedDocument, (value) => {
    const next = JSON.stringify(value ?? {}, null, 2)
    if (state.activeDocumentJson !== next) state.activeDocumentJson = next
  }, { immediate: true })

  watch([
    () => JSON.stringify(state.visibleColumnNames),
    () => state.sortField,
    () => state.sortDir,
    () => state.pageSize,
    () => state.viewMode,
    () => state.tableDensity,
    () => state.wrapCells,
    () => JSON.stringify(state.columnWidths),
  ], () => {
    savePrefs({
      visibleColumnNames: state.visibleColumnNames,
      sortField: state.sortField,
      sortDir: state.sortDir,
      pageSize: state.pageSize,
      viewMode: state.viewMode,
      tableDensity: state.tableDensity,
      wrapCells: state.wrapCells,
      columnWidths: state.columnWidths,
    })
  })

  async function init() {
    state.error = null
    await loadDatabases()
    if (!state.selectedDatabase) return
    await handleDatabaseChange(state.selectedDatabase)
    if (state.selectedCollection) await handleCollectionChange(state.selectedCollection)
  }

  function clearError() {
    state.error = null
  }

  return Object.assign(state, {
    managementBasePath: management.basePath,
    managementRoutes: management.routes,
    getDatabaseName,
    getCollectionName,
    init,
    loadDatabases,
    loadCollections,
    loadDocuments,
    loadDbStats,
    selectDatabase,
    selectCollection,
    onTreeExpand,
    selectTreeNode,
    nextPage,
    prevPage,
    applyPagingAndSort,
    resetQuery,
    applyQuickPreset,
    createDocument,
    saveActiveDocument,
    deleteSelectedDocument,
    bulkDeleteSelected,
    toggleDocumentSelection,
    selectAllCurrentPage,
    selectAllFiltered,
    invertSelection,
    clearSelection,
    replaceSelectedKeys,
    createCollection,
    dropSelectedCollection,
    exportCurrentPage,
    bulkExportSelected,
    bulkPatchSelected,
    inlinePatchField,
    filteredDocuments,
    allColumns,
    documentColumns: effectiveColumns,
    totalPages,
    treeNodes,
    statsCards,
    schemaBadges,
    indexBadges,
    setVisibleColumns,
    setColumnWidth,
    resetColumnWidths,
    setTableDensity,
    clearError,
  })
}
