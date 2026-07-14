<script setup lang="ts">
definePageMeta({ ssr: false })

interface FieldMeta {
  type: string
  required?: boolean
  array?: boolean
}

interface ServiceItem {
  name: string
  source?: 'manifest' | 'scan' | string
}

interface DiscoveryPayload {
  services?: Array<ServiceItem | string>
}

interface ConsoleStatus {
  allowWrite?: boolean
  authEnabled?: boolean
  authProvider?: string | null
  consoleEnabled?: boolean
  state?: string
}

interface SchemaInfo {
  service: string
  schemaFile: string
  manifestPath: string | null
  adapter?: string
  auth?: boolean
  docs?: boolean
  idField?: string
  collection?: string
  fields: Record<string, FieldMeta>
  schemaFields: Record<string, FieldMeta>
  manifestFields: Record<string, FieldMeta> | null
  drift: boolean
  driftDetail: {
    onlyInManifest: string[]
    onlyInSchema: string[]
    changed: string[]
  }
}

const typeOptions = ['string', 'number', 'int', 'boolean', 'date', 'objectId', 'json'] as const
const builder = useBuilderClient()
const route = useRoute()
const router = useRouter()

const builderAuthRequired = computed(() => Boolean(builder.builder?.auth?.authenticate || builder.builder?.auth?.enabled))
const page = useProtectedPage({
  auth: builderAuthRequired.value ? 'required' : 'optional',
  validateBearer: true,
  reason: 'playground-console-builder',
  stableUntilMounted: true,
})

const selected = ref('')
const services = ref<ServiceItem[]>([])
const status = ref<ConsoleStatus | null>(null)
const info = ref<SchemaInfo | null>(null)
const draft = ref<Record<string, FieldMeta>>({})
const newField = reactive<FieldMeta & { name: string }>({
  name: '',
  type: 'string',
  required: true,
  array: false,
})
const busy = ref(false)
const loading = ref(true)
const lastResult = ref<unknown>(null)
const lastDiff = ref<unknown>(null)
const errorMsg = ref('')

const canWrite = computed(() => status.value?.consoleEnabled === true && status.value?.allowWrite === true)
const drift = computed(() => info.value?.drift === true)
const driftDetail = computed(() => info.value?.driftDetail ?? {
  onlyInManifest: [],
  onlyInSchema: [],
  changed: [],
})
const selectedService = computed(() => services.value.find(service => service.name === selected.value) ?? null)

function normalizeServices(payload: DiscoveryPayload): ServiceItem[] {
  const raw = Array.isArray(payload?.services) ? payload.services : []
  const normalized = raw
    .map((service): ServiceItem | null => {
      if (typeof service === 'string') {
        const name = service.trim()
        return name ? { name } : null
      }
      const name = String(service?.name || '').trim()
      return name ? { name, source: service.source } : null
    })
    .filter((service): service is ServiceItem => service !== null)

  return normalized.filter((service, index, list) => (
    list.findIndex(candidate => candidate.name === service.name) === index
  ))
}

function toErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const candidate = error as { data?: { message?: unknown }, message?: unknown }
    if (typeof candidate.data?.message === 'string')
      return candidate.data.message
    if (typeof candidate.message === 'string')
      return candidate.message
  }
  return String(error || 'Une erreur inconnue est survenue.')
}

async function ensureConsoleAccess(): Promise<void> {
  await page.ensure()
  if (builderAuthRequired.value && !page.authorized.value)
    throw new Error('Une session authentifiée est requise pour utiliser les services NFZ de la console.')
}

function chooseInitialService(): void {
  const names = services.value.map(service => service.name)
  if (!names.length) {
    selected.value = ''
    return
  }
  if (selected.value && names.includes(selected.value))
    return

  const queryService = typeof route.query.service === 'string' ? route.query.service : ''
  if (queryService && names.includes(queryService)) {
    selected.value = queryService
    return
  }

  if (import.meta.client) {
    const previous = localStorage.getItem('nfz.builder.service') || ''
    if (previous && names.includes(previous)) {
      selected.value = previous
      return
    }
  }

  selected.value = names[0] || ''
}

async function loadSchema(): Promise<void> {
  if (!selected.value) {
    info.value = null
    draft.value = {}
    return
  }

  const schema = await builder.getSchema<SchemaInfo>(selected.value)
  info.value = schema
  draft.value = structuredClone(schema.fields ?? {})
}

async function refresh(): Promise<void> {
  loading.value = true
  errorMsg.value = ''
  try {
    await ensureConsoleAccess()
    const [nextStatus, discovery] = await Promise.all([
      builder.getStatus<ConsoleStatus>(),
      builder.getServices<DiscoveryPayload>(),
    ])
    status.value = nextStatus
    services.value = normalizeServices(discovery)
    chooseInitialService()
    await loadSchema()

    if (!services.value.length) {
      errorMsg.value = `Aucun service n’a été découvert par client.service('${builder.services.discovery}').find(). Vérifiez feathers.servicesDirs et la structure des services.`
    }
  }
  catch (error: unknown) {
    errorMsg.value = toErrorMessage(error)
  }
  finally {
    loading.value = false
  }
}

async function runSchemaPatch(payload: Record<string, unknown>, target: 'diff' | 'result'): Promise<void> {
  if (!selected.value)
    return

  busy.value = true
  errorMsg.value = ''
  try {
    await ensureConsoleAccess()
    const response = await builder.saveSchema(selected.value, payload)
    if (target === 'diff')
      lastDiff.value = response
    else
      lastResult.value = response

    if (payload.dryRun !== true) {
      await loadSchema()
      if (info.value)
        draft.value = structuredClone(info.value.fields)
    }
  }
  catch (error: unknown) {
    errorMsg.value = toErrorMessage(error)
  }
  finally {
    busy.value = false
  }
}

async function sync(mode: 'manifest-to-schema' | 'schema-to-manifest', dryRun = false): Promise<void> {
  await runSchemaPatch({ sync: mode, dryRun }, dryRun ? 'diff' : 'result')
}

async function apply(): Promise<void> {
  lastResult.value = null
  await runSchemaPatch({ fields: draft.value }, 'result')
}

async function diff(): Promise<void> {
  lastDiff.value = null
  await runSchemaPatch({ fields: draft.value, dryRun: true }, 'diff')
}

function addField(): void {
  const name = newField.name.trim()
  if (!name || draft.value[name])
    return

  draft.value = {
    ...draft.value,
    [name]: {
      type: newField.type,
      required: Boolean(newField.required),
      array: Boolean(newField.array),
    },
  }
  newField.name = ''
  newField.type = 'string'
  newField.required = true
  newField.array = false
}

function removeField(name: string): void {
  const copy = { ...draft.value }
  delete copy[name]
  draft.value = copy
}

watch(selected, async (value, previous) => {
  if (!value || value === previous)
    return

  if (import.meta.client) {
    localStorage.setItem('nfz.builder.service', value)
    if (route.query.service !== value)
      await router.replace({ query: { ...route.query, service: value } })
  }

  if (!loading.value) {
    busy.value = true
    errorMsg.value = ''
    try {
      await loadSchema()
    }
    catch (error: unknown) {
      errorMsg.value = toErrorMessage(error)
    }
    finally {
      busy.value = false
    }
  }
})

onMounted(() => {
  void refresh()
})
</script>

<template>
  <div class="nfz-page">
    <PlaygroundPageHeader
      eyebrow="Outils avancés"
      title="Console Builder"
      description="Inspectez et comparez les schémas réellement découverts par les services Feathers NFZ. Les écritures restent soumises à console.allowWrite."
    >
      <template #actions>
        <PlaygroundStatusBadge
          :label="canWrite ? 'Écriture autorisée' : 'Lecture seule'"
          :tone="canWrite ? 'success' : 'warning'"
        />
        <button class="nfz-button" type="button" :disabled="loading || busy" @click="refresh">
          {{ loading ? 'Chargement…' : 'Actualiser' }}
        </button>
      </template>
    </PlaygroundPageHeader>

    <div class="nfz-grid nfz-grid--3">
      <article class="nfz-stat-card">
        <span>API utilisée</span>
        <strong>Feathers</strong>
        <small><code>{{ builder.services.discovery }}</code></small>
      </article>
      <article class="nfz-stat-card">
        <span>Services découverts</span>
        <strong>{{ services.length }}</strong>
        <small>{{ selectedService?.source ? `Source : ${selectedService.source}` : 'Manifest ou scan de servicesDirs' }}</small>
      </article>
      <article class="nfz-stat-card">
        <span>État console</span>
        <strong>{{ status?.state || '—' }}</strong>
        <small>Auth : {{ status?.authProvider || 'aucune' }}</small>
      </article>
    </div>

    <PlaygroundPanel
      title="Service et schéma"
      description="La liste provient de nfz/services.find(). Le schéma est lu avec nfz/schemas.get(service)."
    >
      <div class="nfz-form-grid">
        <label>
          Service
          <select v-model="selected" :disabled="loading || busy || !services.length">
            <option v-for="service in services" :key="service.name" :value="service.name">
              {{ service.name }}{{ service.source ? ` · ${service.source}` : '' }}
            </option>
          </select>
        </label>
        <div class="nfz-actions nfz-actions--end">
          <button class="nfz-button" type="button" :disabled="busy || !selected" @click="loadSchema">
            Relire le schéma
          </button>
        </div>
      </div>

      <div v-if="info" class="nfz-grid nfz-grid--3 nfz-builder-meta">
        <article class="nfz-stat-card"><span>Adapter</span><strong>{{ info.adapter || '—' }}</strong><small>{{ info.idField || 'id par défaut' }}</small></article>
        <article class="nfz-stat-card"><span>Protection</span><strong>{{ info.auth ? 'Auth active' : 'Sans auth' }}</strong><small>Docs : {{ info.docs ? 'oui' : 'non' }}</small></article>
        <article class="nfz-stat-card"><span>Dérive</span><strong>{{ drift ? 'Détectée' : 'Aucune' }}</strong><small>{{ info.collection || 'Pas de collection MongoDB' }}</small></article>
      </div>
    </PlaygroundPanel>

    <div v-if="errorMsg" class="nfz-alert nfz-alert--danger" role="alert">
      <strong>La Console Builder n’a pas terminé l’opération.</strong>
      <span>{{ errorMsg }}</span>
    </div>

    <div v-if="drift" class="nfz-alert nfz-alert--warning">
      <strong>Le manifeste et le schéma TypeScript divergent.</strong>
      <span>Manifest uniquement : {{ driftDetail.onlyInManifest.join(', ') || 'aucun' }}</span>
      <span>Schéma uniquement : {{ driftDetail.onlyInSchema.join(', ') || 'aucun' }}</span>
      <span>Champs modifiés : {{ driftDetail.changed.join(', ') || 'aucun' }}</span>
      <div class="nfz-actions">
        <button class="nfz-button" type="button" :disabled="busy" @click="sync('manifest-to-schema', true)">Comparer manifeste → schéma</button>
        <button class="nfz-button" type="button" :disabled="busy" @click="sync('schema-to-manifest', true)">Comparer schéma → manifeste</button>
        <button class="nfz-button nfz-button--primary" type="button" :disabled="busy || !canWrite" @click="sync('manifest-to-schema')">Appliquer manifeste → schéma</button>
        <button class="nfz-button nfz-button--primary" type="button" :disabled="busy || !canWrite" @click="sync('schema-to-manifest')">Appliquer schéma → manifeste</button>
      </div>
    </div>

    <div class="nfz-grid nfz-grid--2">
      <PlaygroundPanel title="Champs" description="Préparez une évolution puis comparez-la avant toute écriture.">
        <div class="nfz-form-stack">
          <div class="nfz-form-grid">
            <label>
              Nom du champ
              <input v-model.trim="newField.name" placeholder="title" autocomplete="off">
            </label>
            <label>
              Type
              <select v-model="newField.type">
                <option v-for="type in typeOptions" :key="type" :value="type">{{ type }}</option>
              </select>
            </label>
          </div>

          <div class="nfz-actions">
            <label class="nfz-inline-check"><input v-model="newField.array" type="checkbox"> Tableau</label>
            <label class="nfz-inline-check"><input v-model="newField.required" type="checkbox"> Requis</label>
            <button class="nfz-button" type="button" @click="addField">Ajouter</button>
          </div>

          <div class="nfz-table-wrap">
            <table class="nfz-table">
              <thead><tr><th>Nom</th><th>Type</th><th>Tableau</th><th>Requis</th><th /></tr></thead>
              <tbody>
                <tr v-for="(meta, name) in draft" :key="name">
                  <td><code>{{ name }}</code></td>
                  <td><select v-model="meta.type"><option v-for="type in typeOptions" :key="type" :value="type">{{ type }}</option></select></td>
                  <td><input v-model="meta.array" type="checkbox"></td>
                  <td><input v-model="meta.required" type="checkbox"></td>
                  <td><button class="nfz-button nfz-button--danger" type="button" @click="removeField(String(name))">Retirer</button></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="nfz-actions nfz-actions--end">
            <button class="nfz-button" type="button" :disabled="busy || !selected" @click="diff">Comparer sans écrire</button>
            <button class="nfz-button nfz-button--primary" type="button" :disabled="busy || !selected || !canWrite" @click="apply">Appliquer</button>
          </div>
          <p v-if="!canWrite" class="nfz-muted">Les actions d’écriture sont désactivées car <code>feathers.console.allowWrite</code> vaut <code>false</code>.</p>
        </div>
      </PlaygroundPanel>

      <div class="nfz-form-stack">
        <PlaygroundJsonPanel title="Schéma préparé" :value="draft" />
        <PlaygroundJsonPanel title="Dernière comparaison" :value="lastDiff" />
        <PlaygroundJsonPanel title="Dernier résultat d’écriture" :value="lastResult" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.nfz-builder-meta {
  margin-top: 1rem;
}

.nfz-actions--end {
  align-self: end;
  justify-content: flex-end;
}

.nfz-inline-check {
  display: inline-flex;
  gap: 0.45rem;
  align-items: center;
}

.nfz-table-wrap {
  overflow-x: auto;
}

.nfz-table {
  width: 100%;
  min-width: 640px;
  border-collapse: collapse;
}

.nfz-table th,
.nfz-table td {
  padding: 0.65rem;
  text-align: left;
  border-bottom: 1px solid var(--nfz-border);
}
</style>
