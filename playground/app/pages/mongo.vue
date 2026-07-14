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


const authStatusLabel = computed(() => diagnostics.value.authenticated ? 'Session active' : 'Session anonyme')
</script>

<template>
  <div class="nfz-page">
    <PlaygroundPageHeader
      eyebrow="Données"
      title="Gestion MongoDB"
      description="Explorez les bases, collections, statistiques, index, schémas et documents exposés par les services de gestion du module."
    >
      <template #actions>
        <button class="nfz-button nfz-button--primary" type="button" :disabled="workspaceLoading" @click="refreshWorkspace">
          {{ workspaceLoading ? 'Actualisation…' : 'Actualiser les données' }}
        </button>
      </template>
    </PlaygroundPageHeader>

    <div class="nfz-grid nfz-grid--3">
      <article class="nfz-stat-card">
        <span>Scénario</span>
        <strong>{{ title }}</strong>
        <small>{{ scenarioId }} · {{ clientMode }}</small>
      </article>
      <article class="nfz-stat-card">
        <span>MongoDB</span>
        <strong>{{ embeddedMongoMode }}</strong>
        <small>{{ embeddedMongoEnabled ? 'Gestion activée' : 'Gestion désactivée' }}</small>
      </article>
      <article class="nfz-stat-card">
        <span>Authentification</span>
        <strong>{{ authStatusLabel }}</strong>
        <small>Route protégée : {{ managementAuthRequired ? 'oui' : 'non' }}</small>
      </article>
    </div>

    <p v-if="!embeddedMongoEnabled" class="nfz-alert nfz-alert--warning">
      MongoDB est désactivé pour ce scénario. Activez <code>NFZ_PLAYGROUND_EMBEDDED_MONGODB=true</code> pour utiliser ce workspace.
    </p>

    <PlaygroundPanel
      title="Sélection"
      description="Choisissez une base et une collection. Les statistiques, le schéma et les documents sont rechargés automatiquement."
    >
      <div class="nfz-form-grid">
        <label>
          Base de données
          <select v-model="currentDb">
            <option v-for="name in databaseNames" :key="name" :value="name">{{ name }}</option>
            <option v-if="!databaseNames.length" :value="currentDb">{{ currentDb }}</option>
          </select>
        </label>
        <label>
          Collection
          <select v-model="currentCollection">
            <option v-for="name in collectionNames" :key="name" :value="name">{{ name }}</option>
            <option v-if="!collectionNames.length" :value="currentCollection">{{ currentCollection }}</option>
          </select>
        </label>
      </div>
      <p v-if="workspaceError" class="nfz-alert nfz-alert--danger">{{ workspaceError }}</p>
    </PlaygroundPanel>

    <div class="nfz-grid nfz-grid--auto">
      <article class="nfz-stat-card"><span>Bases</span><strong>{{ databaseNames.length }}</strong><small>{{ databaseNames.join(', ') || 'Aucune base' }}</small></article>
      <article class="nfz-stat-card"><span>Collections</span><strong>{{ collectionNames.length }}</strong><small>{{ currentDb }}</small></article>
      <article class="nfz-stat-card"><span>Documents</span><strong>{{ collectionDocuments.length }}</strong><small>Total : {{ collectionCount }}</small></article>
      <article class="nfz-stat-card"><span>Index</span><strong>{{ collectionIndexes.length }}</strong><small>{{ currentDb }}/{{ currentCollection }}</small></article>
    </div>

    <div class="nfz-grid nfz-grid--2">
      <PlaygroundJsonPanel title="Statistiques de la base" :value="dbStats" :collapsed="false" />
      <PlaygroundJsonPanel title="Schéma de la collection" :value="collectionSchema" :collapsed="false" />
    </div>

    <PlaygroundJsonPanel title="Aperçu des documents" :value="collectionDocuments" :collapsed="false" />

    <PlaygroundPanel
      title="Endpoints de gestion"
      description="Chaque test appelle directement l’endpoint REST correspondant afin de faciliter le diagnostic du transport."
    >
      <div class="nfz-feature-grid">
        <article v-for="route in routes" :key="route.key" class="nfz-feature-card">
          <span class="nfz-feature-card__icon" aria-hidden="true">↗</span>
          <span class="nfz-feature-card__content">
            <strong class="nfz-feature-card__title">{{ route.label }}</strong>
            <code>{{ route.path }}</code>
          </span>
          <button class="nfz-button nfz-button--small" type="button" :disabled="loading" @click="fetchRoute(route.key, route.path)">
            Tester
          </button>
        </article>
      </div>
      <p v-if="error" class="nfz-alert nfz-alert--danger">{{ error }}</p>
    </PlaygroundPanel>

    <ClientOnly>
      <PlaygroundJsonPanel v-if="result" title="Dernier résultat REST" :value="result" :collapsed="false" />
      <template #fallback>
        <p class="nfz-alert">Hydratation du diagnostic MongoDB…</p>
      </template>
    </ClientOnly>

    <div class="nfz-grid nfz-grid--2">
      <PlaygroundJsonPanel
        title="État de la page protégée"
        :value="{ ready: page.ready, authorized: page.authorized, pending: page.pending, hydrated: page.hydrated, displayState: page.displayState }"
      />
      <PlaygroundJsonPanel title="État de l’espace de travail" :value="workspaceSnapshot" />
    </div>
  </div>
</template>
