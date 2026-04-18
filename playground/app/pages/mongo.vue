<script setup lang="ts">
definePageMeta({ ssr: false })

const { title, scenarioId, clientMode, embeddedMongoEnabled, embeddedMongoMode } = usePlaygroundScenario()
const diagnostics = useAuthDiagnostics({ stableUntilMounted: true })
const trace = useAuthTrace()
const mongo = useMongoManagementClient()

const currentDb = ref('app')
const currentCollection = ref('messages')
const loading = ref(false)
const workspaceLoading = ref(false)
const workspaceLoaded = ref(false)
const result = ref<any>(null)
const error = ref<string | null>(null)
const workspaceError = ref<string | null>(null)
const databases = ref<any[]>([])
const collections = ref<any[]>([])
const dbStats = ref<any>(null)
const collectionCount = ref<number | null>(null)
const collectionIndexes = ref<any[]>([])
const collectionSchema = ref<any>(null)
const collectionDocuments = ref<any[]>([])
const syncingSelection = ref(false)

const managementAuthRequired = computed(() => Boolean(mongo.management?.auth?.authenticate || mongo.management?.auth?.enabled))
const page = useProtectedPage({
  auth: managementAuthRequired.value ? 'required' : 'optional',
  validateBearer: true,
  reason: 'playground-mongo',
  stableUntilMounted: true,
})

const routes = computed(() => [
  { key: 'databases', label: 'databases', path: `${mongo.basePath}/databases` },
  { key: 'collections', label: 'collections', path: `${mongo.basePath}/${currentDb.value}/collections` },
  { key: 'stats', label: 'stats', path: `${mongo.basePath}/${currentDb.value}/stats` },
  { key: 'indexes', label: 'indexes', path: `${mongo.basePath}/${currentDb.value}/${currentCollection.value}/indexes` },
  { key: 'count', label: 'count', path: `${mongo.basePath}/${currentDb.value}/${currentCollection.value}/count` },
  { key: 'schema', label: 'schema', path: `${mongo.basePath}/${currentDb.value}/${currentCollection.value}/schema` },
  { key: 'documents', label: 'documents', path: `${mongo.basePath}/${currentDb.value}/${currentCollection.value}/documents` },
  { key: 'aggregate', label: 'aggregate', path: `${mongo.basePath}/${currentDb.value}/${currentCollection.value}/aggregate` },
])

function asArray(payload: any): any[] {
  if (Array.isArray(payload))
    return payload
  if (Array.isArray(payload?.data))
    return payload.data
  if (Array.isArray(payload?.items))
    return payload.items
  if (Array.isArray(payload?.databases))
    return payload.databases
  if (Array.isArray(payload?.collections))
    return payload.collections
  if (Array.isArray(payload?.indexes))
    return payload.indexes
  if (Array.isArray(payload?.documents))
    return payload.documents
  return []
}

function extractDatabaseName(entry: any): string {
  if (typeof entry === 'string')
    return entry
  return String(entry?.name || entry?.databaseName || entry?.db || entry?._id || '').trim()
}

function extractCollectionName(entry: any): string {
  if (typeof entry === 'string')
    return entry
  return String(entry?.name || entry?.collectionName || entry?.ns || entry?._id || '').trim()
}

const databaseNames = computed(() => asArray(databases.value).map(extractDatabaseName).filter(Boolean))
const collectionNames = computed(() => asArray(collections.value).map(extractCollectionName).filter(Boolean))

const workspaceSnapshot = computed(() => ({
  databases: databaseNames.value.length,
  collections: collectionNames.value.length,
  selectedDb: currentDb.value,
  selectedCollection: currentCollection.value,
  documents: asArray(collectionDocuments.value).length,
  indexes: asArray(collectionIndexes.value).length,
  count: collectionCount.value,
}))

async function invokeRoute(key: string) {
  switch (key) {
    case 'databases': return await mongo.getDatabases()
    case 'collections': return await mongo.getCollections(currentDb.value)
    case 'stats': return await mongo.getStats(currentDb.value)
    case 'indexes': return await mongo.getIndexes(currentDb.value, currentCollection.value)
    case 'count': return await mongo.getCount(currentDb.value, currentCollection.value)
    case 'schema': return await mongo.getSchema(currentDb.value, currentCollection.value)
    case 'documents': return await mongo.getDocuments(currentDb.value, currentCollection.value, { $limit: 10 })
    case 'aggregate': return await mongo.aggregate(currentDb.value, currentCollection.value, [{ $limit: 5 }])
    default: throw new Error(`Unknown route key: ${key}`)
  }
}

function resetSelectionArtifacts() {
  dbStats.value = null
  collectionCount.value = null
  collectionIndexes.value = []
  collectionSchema.value = null
  collectionDocuments.value = []
}

async function fetchRoute(key: string, path: string) {
  loading.value = true
  error.value = null
  result.value = null
  try {
    await page.ensure()
    if (managementAuthRequired.value && !page.authorized.value)
      throw new Error('Mongo route is protected and the current session is not authorized yet')

    const data = await invokeRoute(key)
    result.value = {
      ok: true,
      status: 200,
      path,
      data,
    }
  }
  catch (err: any) {
    error.value = err?.message || String(err)
    result.value = { ok: false, path, error: error.value, diagnostics: diagnostics.value, latestEvent: trace.value.latest }
  }
  finally {
    loading.value = false
  }
}

async function loadSelectionArtifacts() {
  if (!currentDb.value || !currentCollection.value) {
    resetSelectionArtifacts()
    return
  }

  const [statsResult, countResult, indexesResult, schemaResult, documentsResult] = await Promise.allSettled([
    mongo.getStats(currentDb.value),
    mongo.getCount(currentDb.value, currentCollection.value),
    mongo.getIndexes(currentDb.value, currentCollection.value),
    mongo.getSchema(currentDb.value, currentCollection.value),
    mongo.getDocuments(currentDb.value, currentCollection.value, { $limit: 10 }),
  ])

  dbStats.value = statsResult.status === 'fulfilled' ? statsResult.value : null
  collectionCount.value = countResult.status === 'fulfilled'
    ? Number((countResult.value as any)?.count ?? (countResult.value as any)?.total ?? countResult.value ?? 0)
    : null
  collectionIndexes.value = indexesResult.status === 'fulfilled' ? asArray(indexesResult.value) : []
  collectionSchema.value = schemaResult.status === 'fulfilled' ? schemaResult.value : null
  collectionDocuments.value = documentsResult.status === 'fulfilled'
    ? asArray((documentsResult.value as any)?.data ? documentsResult.value : (documentsResult.value as any)?.documents ? documentsResult.value.documents : documentsResult.value)
    : []
}

async function refreshWorkspace() {
  workspaceLoading.value = true
  workspaceLoaded.value = true
  workspaceError.value = null
  error.value = null

  try {
    await page.ensure()
    if (managementAuthRequired.value && !page.authorized.value) {
      resetSelectionArtifacts()
      databases.value = []
      collections.value = []
      workspaceError.value = 'Mongo routes are protected and the current session is not authorized yet.'
      return
    }

    const databasesPayload = await mongo.getDatabases()
    const nextDatabases = asArray(databasesPayload)
    databases.value = nextDatabases

    const availableDatabases = nextDatabases.map(extractDatabaseName).filter(Boolean)

    syncingSelection.value = true
    if (!availableDatabases.includes(currentDb.value))
      currentDb.value = availableDatabases[0] || currentDb.value

    const collectionsPayload = currentDb.value ? await mongo.getCollections(currentDb.value) : []
    const nextCollections = asArray(collectionsPayload)
    collections.value = nextCollections

    const availableCollections = nextCollections.map(extractCollectionName).filter(Boolean)
    if (!availableCollections.includes(currentCollection.value))
      currentCollection.value = availableCollections[0] || currentCollection.value
    syncingSelection.value = false

    await loadSelectionArtifacts()

    result.value = {
      ok: true,
      type: 'workspace-refresh',
      basePath: mongo.basePath,
      snapshot: workspaceSnapshot.value,
      diagnostics: diagnostics.value,
    }
  }
  catch (err: any) {
    syncingSelection.value = false
    workspaceError.value = err?.message || String(err)
    result.value = {
      ok: false,
      type: 'workspace-refresh',
      error: workspaceError.value,
      diagnostics: diagnostics.value,
      latestEvent: trace.value.latest,
    }
  }
  finally {
    workspaceLoading.value = false
  }
}

watch(currentDb, async (value, previous) => {
  if (syncingSelection.value || value === previous || workspaceLoading.value || !workspaceLoaded.value)
    return

  workspaceError.value = null
  collections.value = []
  resetSelectionArtifacts()
  await refreshWorkspace()
})

watch(currentCollection, async (value, previous) => {
  if (syncingSelection.value || value === previous || workspaceLoading.value || !workspaceLoaded.value)
    return

  workspaceError.value = null
  await loadSelectionArtifacts().catch((err: any) => {
    workspaceError.value = err?.message || String(err)
  })
})

onMounted(async () => {
  await refreshWorkspace()
})
</script>

<template>
  <div style="padding:16px;max-width:1200px;margin:0 auto;display:grid;gap:18px;">
    <div>
      <h1>Mongo management playground</h1>
      <p>Scénario détecté : <strong>{{ title }}</strong> (<code>{{ scenarioId }}</code>)</p>
      <p>Mode client : <code>{{ clientMode }}</code> — Mongo activé : <code>{{ embeddedMongoEnabled }}</code> — mode : <code>{{ embeddedMongoMode }}</code></p>
      <p>Base Mongo effective : <code>{{ mongo.basePath }}</code> · auth route requise : <code>{{ managementAuthRequired }}</code></p>
      <p>Les chemins ci-dessous sont des <strong>endpoints REST</strong>, pas des routes Vue Router.</p>
      <p><NuxtLink to="/">Accueil</NuxtLink> · <NuxtLink to="/tests">Tests</NuxtLink> · <NuxtLink to="/auth-runtime">Auth runtime</NuxtLink> · <NuxtLink to="/embedded">Embedded</NuxtLink></p>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
      <div style="border:1px solid #ddd;border-radius:12px;padding:12px;">
        <strong>Protected page</strong>
        <div><code>{{ { ready: page.ready, authorized: page.authorized, pending: page.pending, hydrated: page.hydrated, displayState: page.displayState } }}</code></div>
      </div>
      <div style="border:1px solid #ddd;border-radius:12px;padding:12px;">
        <strong>Auth snapshot</strong>
        <ClientOnly>
          <div><code>{{ { provider: diagnostics.provider, status: diagnostics.status, authenticated: diagnostics.authenticated, tokenSource: diagnostics.tokenSource, hydrationState: diagnostics.hydrationState } }}</code></div>
          <template #fallback><div><code>{{ { provider: 'local', status: 'idle', authenticated: false, tokenSource: 'none', hydrationState: 'stable-until-mounted' } }}</code></div></template>
        </ClientOnly>
      </div>
      <div style="border:1px solid #ddd;border-radius:12px;padding:12px;">
        <strong>Workspace snapshot</strong>
        <div><code>{{ workspaceSnapshot }}</code></div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;align-items:end;">
      <label style="display:grid;gap:6px;">
        <span>Database</span>
        <select v-model="currentDb" style="padding:8px;border:1px solid #ccc;border-radius:8px;">
          <option v-for="name in databaseNames" :key="name" :value="name">{{ name }}</option>
          <option v-if="!databaseNames.length" :value="currentDb">{{ currentDb }}</option>
        </select>
      </label>
      <label style="display:grid;gap:6px;">
        <span>Collection</span>
        <select v-model="currentCollection" style="padding:8px;border:1px solid #ccc;border-radius:8px;">
          <option v-for="name in collectionNames" :key="name" :value="name">{{ name }}</option>
          <option v-if="!collectionNames.length" :value="currentCollection">{{ currentCollection }}</option>
        </select>
      </label>
      <button type="button" :disabled="workspaceLoading" style="width:max-content;padding:10px 14px;border-radius:8px;border:1px solid #bbb;cursor:pointer;" @click="refreshWorkspace">
        {{ workspaceLoading ? 'Actualisation…' : 'Actualiser le workspace Mongo' }}
      </button>
    </div>

    <div v-if="workspaceError" style="color:#991b1b;border:1px solid #fecaca;background:#fef2f2;border-radius:12px;padding:12px;">
      <strong>Workspace error:</strong> {{ workspaceError }}
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;">
      <div style="border:1px solid #ddd;border-radius:12px;padding:12px;">
        <strong>Databases</strong>
        <div style="font-size:1.5rem;font-weight:700;">{{ databaseNames.length }}</div>
        <div><code>{{ databaseNames }}</code></div>
      </div>
      <div style="border:1px solid #ddd;border-radius:12px;padding:12px;">
        <strong>Collections</strong>
        <div style="font-size:1.5rem;font-weight:700;">{{ collectionNames.length }}</div>
        <div><code>{{ collectionNames }}</code></div>
      </div>
      <div style="border:1px solid #ddd;border-radius:12px;padding:12px;">
        <strong>Documents loaded</strong>
        <div style="font-size:1.5rem;font-weight:700;">{{ collectionDocuments.length }}</div>
        <div><code>count={{ collectionCount }}</code></div>
      </div>
      <div style="border:1px solid #ddd;border-radius:12px;padding:12px;">
        <strong>Indexes</strong>
        <div style="font-size:1.5rem;font-weight:700;">{{ collectionIndexes.length }}</div>
        <div><code>{{ currentDb }}/{{ currentCollection }}</code></div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;">
      <div style="border:1px solid #ddd;border-radius:12px;padding:12px;display:grid;gap:8px;">
        <strong>DB stats</strong>
        <pre style="white-space:pre-wrap;margin:0;">{{ dbStats }}</pre>
      </div>
      <div style="border:1px solid #ddd;border-radius:12px;padding:12px;display:grid;gap:8px;">
        <strong>Schema</strong>
        <pre style="white-space:pre-wrap;margin:0;">{{ collectionSchema }}</pre>
      </div>
    </div>

    <div style="border:1px solid #ddd;border-radius:12px;padding:12px;display:grid;gap:8px;">
      <strong>Documents preview</strong>
      <pre style="white-space:pre-wrap;margin:0;">{{ collectionDocuments }}</pre>
    </div>

    <div style="display:grid;gap:12px;">
      <div v-for="route in routes" :key="route.key" style="border:1px solid #ddd;border-radius:12px;padding:12px;display:grid;gap:8px;">
        <strong>{{ route.label }}</strong>
        <code>{{ route.path }}</code>
        <button type="button" :disabled="loading" style="width:max-content;padding:8px 12px;border-radius:8px;border:1px solid #bbb;cursor:pointer;" @click="fetchRoute(route.key, route.path)">
          {{ loading ? 'Chargement…' : `Tester ${route.label}` }}
        </button>
      </div>
    </div>

    <div v-if="error" style="color:#991b1b;"><strong>Erreur:</strong> {{ error }}</div>
    <ClientOnly>
      <pre v-if="result" style="white-space:pre-wrap;border:1px solid #ddd;border-radius:12px;padding:16px;">{{ result }}</pre>
      <template #fallback><pre v-if="result" style="white-space:pre-wrap;border:1px solid #ddd;border-radius:12px;padding:16px;">{{ { ok: Boolean(result?.ok), type: result?.type || 'pending-client-hydration' } }}</pre></template>
    </ClientOnly>
  </div>
</template>
