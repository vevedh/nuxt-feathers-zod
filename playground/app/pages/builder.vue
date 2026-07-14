<script setup lang="ts">
definePageMeta({ ssr: false })

interface BuilderServiceOption {
  name: string
  source?: string
}

interface BuilderServiceEndpoint {
  key: string
  path: string
  methods: string
}

interface LegacyBuilderRoute {
  key?: string
  method: string
  path?: string
}

const diagnostics = useAuthDiagnostics({ stableUntilMounted: true })
const trace = useAuthTrace()
const builder = useBuilderClient()

const loading = ref(false)
const result = ref<Record<string, any> | null>(null)
const error = ref<string | null>(null)
const selectedService = ref('users')
const services = ref<BuilderServiceOption[]>([])
const latestOperation = ref<string | null>(null)
const attemptedEndpoint = ref<string | null>(null)
const loadedSchema = ref<Record<string, any> | null>(null)

const builderAuthRequired = computed(() => Boolean(builder.builder?.auth?.authenticate || builder.builder?.auth?.enabled))
const page = useProtectedPage({
  auth: builderAuthRequired.value ? 'required' : 'optional',
  validateBearer: true,
  reason: 'playground-builder',
  stableUntilMounted: true,
})

const serviceEndpoints = computed<BuilderServiceEndpoint[]>(() => [
  { key: 'services', path: builder.services.discovery, methods: 'find' },
  { key: 'schemas', path: builder.services.schemas, methods: 'find, get, patch' },
  { key: 'manifest', path: builder.services.manifest, methods: 'get, patch' },
  { key: 'builder', path: builder.services.builder, methods: 'create' },
  { key: 'status', path: builder.services.status, methods: 'find' },
  { key: 'rbac', path: builder.services.rbac, methods: 'get, patch' },
  { key: 'presets', path: builder.services.presets, methods: 'find, create' },
  { key: 'init', path: builder.services.init, methods: 'create' },
])

const legacyRoutes = computed<LegacyBuilderRoute[]>(() => {
  const routeList = Array.isArray(builder.routes) ? builder.routes : []
  return routeList.map((route: any) => ({
    key: route?.key,
    method: String(route?.method || 'GET').toUpperCase(),
    path: route?.path,
  }))
})

const snapshot = computed(() => ({
  authRequired: builderAuthRequired.value,
  displayState: page.displayState.value,
  authenticated: page.auth.authenticated.value,
  provider: page.auth.provider.value,
  transport: builder.transport,
  serviceRoot: builder.builder?.basePath || 'nfz',
  services: serviceEndpoints.value.length,
  legacyRoutes: legacyRoutes.value.length,
}))

const sessionBadge = computed(() => {
  if (snapshot.value.authenticated)
    return { label: 'Session active', tone: 'success' as const }
  if (snapshot.value.authRequired)
    return { label: 'Session requise', tone: 'warning' as const }
  return { label: 'Accès libre', tone: 'success' as const }
})

const serviceOptions = computed(() => services.value.map(service => ({
  ...service,
  label: service.source ? `${service.name} · ${service.source}` : service.name,
})))

const schemaSummary = computed(() => {
  if (!result.value?.ok || latestOperation.value !== 'getSchema')
    return null

  const data = result.value.data || {}
  const fields = data.fields && typeof data.fields === 'object'
    ? Object.keys(data.fields)
    : []

  return {
    service: String(data.service || selectedService.value || '—'),
    fields: fields.length,
    drift: data.drift === true,
    source: data.manifestPath ? 'Manifest + schéma' : 'Schéma TypeScript',
  }
})

function normalizeServices(payload: any): BuilderServiceOption[] {
  const raw = Array.isArray(payload?.services) ? payload.services : []
  const normalized = raw
    .map((service: any) => {
      if (typeof service === 'string')
        return { name: service }
      const name = String(service?.name || service?.path || '').trim()
      return name ? { name, source: service?.source ? String(service.source) : undefined } : null
    })
    .filter((service: BuilderServiceOption | null): service is BuilderServiceOption => Boolean(service?.name))

  return normalized.filter((service, index, list) => list.findIndex(candidate => candidate.name === service.name) === index)
}

async function run(label: string, operation: string, fn: () => Promise<any>) {
  loading.value = true
  error.value = null
  result.value = null
  latestOperation.value = label
  attemptedEndpoint.value = operation

  try {
    await page.ensure()
    if (builderAuthRequired.value && !page.authorized.value)
      throw new Error('La session courante ne permet pas encore d’utiliser les services NFZ.')

    const data = await fn()
    result.value = {
      ok: true,
      label,
      operation,
      snapshot: snapshot.value,
      data,
      diagnostics: diagnostics.value,
      latestEvent: trace.value.latest,
    }
    return data
  }
  catch (err: any) {
    error.value = err?.message || String(err)
    result.value = {
      ok: false,
      label,
      operation,
      snapshot: snapshot.value,
      error: error.value,
      diagnostics: diagnostics.value,
      latestEvent: trace.value.latest,
    }
    return null
  }
  finally {
    loading.value = false
  }
}

async function loadServicesSilently() {
  try {
    await page.ensure()
    if (builderAuthRequired.value && !page.authorized.value)
      return

    const data = await builder.getServices<any>()
    const available = normalizeServices(data)
    services.value = available

    if (available.length && !available.some(service => service.name === selectedService.value))
      selectedService.value = available[0].name
  }
  catch {
    // L’action explicite conserve le diagnostic complet pour l’utilisateur.
  }
}

async function fetchServices() {
  const operation = `client.service('${builder.services.discovery}').find()`
  const data = await run('getServices', operation, () => builder.getServices())
  if (data) {
    services.value = normalizeServices(data)
    if (services.value.length && !services.value.some(service => service.name === selectedService.value))
      selectedService.value = services.value[0].name
  }
}

async function fetchManifest() {
  await run('getManifest', `client.service('${builder.services.manifest}').get('current')`, () => builder.getManifest())
}

async function fetchSchema() {
  const service = selectedService.value.trim()
  if (!service) {
    error.value = 'Sélectionnez un service avant de lire son schéma.'
    return
  }

  const operation = `client.service('${builder.services.schemas}').get('${service}')`
  const data = await run('getSchema', operation, () => builder.getSchema(service))
  if (data)
    loadedSchema.value = data
}

async function preview() {
  const service = selectedService.value.trim()
  if (!service) {
    error.value = 'Sélectionnez un service avant de lancer la prévisualisation.'
    return
  }

  await run('preview', `client.service('${builder.services.builder}').create({ action: 'preview' })`, async () => {
    const schema = loadedSchema.value?.service === service
      ? loadedSchema.value
      : await builder.getSchema<any>(service)

    loadedSchema.value = schema
    return await builder.preview({
      service,
      fields: schema?.fields || {},
    })
  })
}

onMounted(() => {
  void loadServicesSilently()
})
</script>

<template>
  <div class="nfz-page">
    <PlaygroundPageHeader
      eyebrow="Schémas et génération"
      title="Validation Zod et services Feathers"
      description="Contrôlez les services détectés, le manifeste, les schémas Zod et les prévisualisations par le client Feathers, sans dépendre de routes métier Nitro."
    >
      <template #actions>
        <PlaygroundStatusBadge :label="sessionBadge.label" :tone="sessionBadge.tone" />
      </template>
    </PlaygroundPageHeader>

    <div class="nfz-grid nfz-grid--3">
      <article class="nfz-stat-card"><span>Transport</span><strong>{{ snapshot.transport }}</strong><small>Client Feathers unifié</small></article>
      <article class="nfz-stat-card"><span>État de page</span><strong>{{ snapshot.displayState }}</strong><small>Fournisseur : {{ snapshot.provider }}</small></article>
      <article class="nfz-stat-card"><span>Services NFZ</span><strong>{{ snapshot.services }}</strong><small>Racine logique : {{ snapshot.serviceRoot }}/*</small></article>
    </div>

    <PlaygroundPanel title="Actions de validation" description="Choisissez un service détecté puis exécutez le contrôle par client.service(...).">
      <div class="nfz-form-stack">
        <div class="nfz-actions">
          <button class="nfz-button" type="button" :disabled="loading" @click="fetchServices">Actualiser les services</button>
          <button class="nfz-button" type="button" :disabled="loading" @click="fetchManifest">Lire le manifeste</button>
        </div>

        <div class="nfz-form-grid">
          <label>
            Service
            <select v-if="serviceOptions.length" v-model="selectedService">
              <option v-for="service in serviceOptions" :key="service.name" :value="service.name">
                {{ service.label }}
              </option>
            </select>
            <input v-else v-model.trim="selectedService" placeholder="users" autocomplete="off">
          </label>

          <div class="nfz-actions">
            <button class="nfz-button nfz-button--primary" type="button" :disabled="loading || !selectedService" @click="fetchSchema">
              Lire le schéma
            </button>
            <button class="nfz-button" type="button" :disabled="loading || !selectedService" @click="preview">Prévisualiser</button>
          </div>
        </div>
      </div>
    </PlaygroundPanel>

    <div v-if="error" class="nfz-alert nfz-alert--danger" role="alert">
      <strong>La validation n’a pas abouti.</strong>
      <span>{{ error }}</span>
      <small v-if="attemptedEndpoint">Opération appelée : <code>{{ attemptedEndpoint }}</code></small>
    </div>
    <p v-else-if="loading" class="nfz-alert">Exécution du service Feathers…</p>

    <div v-if="schemaSummary" class="nfz-grid nfz-grid--3">
      <article class="nfz-stat-card"><span>Service</span><strong>{{ schemaSummary.service }}</strong><small>Schéma résolu</small></article>
      <article class="nfz-stat-card"><span>Champs</span><strong>{{ schemaSummary.fields }}</strong><small>{{ schemaSummary.source }}</small></article>
      <article class="nfz-stat-card"><span>Dérive</span><strong>{{ schemaSummary.drift ? 'Détectée' : 'Aucune' }}</strong><small>Manifest / schéma</small></article>
    </div>

    <PlaygroundJsonPanel v-if="result" title="Détails techniques du dernier contrôle" :value="result" :collapsed="true" />

    <PlaygroundPanel title="Services Feathers NFZ" description="Cette surface est canonique et fonctionne en appel direct, REST ou Socket.IO.">
      <div class="nfz-table-wrap">
        <table class="nfz-table">
          <thead><tr><th>Fonction</th><th>Service</th><th>Méthodes</th></tr></thead>
          <tbody>
            <tr v-for="endpoint in serviceEndpoints" :key="endpoint.path">
              <td>{{ endpoint.key }}</td>
              <td><code>{{ endpoint.path }}</code></td>
              <td><code>{{ endpoint.methods }}</code></td>
            </tr>
          </tbody>
        </table>
      </div>
    </PlaygroundPanel>

    <PlaygroundPanel
      v-if="legacyRoutes.length"
      title="Compatibilité Nitro 6.x"
      description="Ces façades dépréciées délèguent aux services Feathers et peuvent être désactivées avec console.legacyNitroRoutes=false."
    >
      <div class="nfz-table-wrap">
        <table class="nfz-table">
          <thead><tr><th>Méthode</th><th>Chemin historique</th><th>Clé</th></tr></thead>
          <tbody>
            <tr v-for="route in legacyRoutes" :key="`${route.method}:${route.path}`">
              <td><code>{{ route.method }}</code></td>
              <td><code>{{ route.path }}</code></td>
              <td>{{ route.key || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </PlaygroundPanel>
  </div>
</template>
