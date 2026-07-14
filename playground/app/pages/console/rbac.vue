<script setup lang="ts">
definePageMeta({ ssr: false })

type RbacMethod = 'find' | 'get' | 'create' | 'update' | 'patch' | 'remove'
type RbacPolicies = Record<string, Partial<Record<RbacMethod, string[]>>>

interface RbacFile {
  enabled: boolean
  denyByDefault: boolean
  roles: string[]
  policies: RbacPolicies
  updatedAt?: string
}

interface RbacResponse {
  file: RbacFile
}

interface ConsoleStatus {
  allowWrite?: boolean
  authProvider?: string | null
  consoleEnabled?: boolean
  rbac?: {
    enabled?: boolean
    ready?: boolean
    denyByDefault?: boolean
  }
}

interface DiscoveryPayload {
  services?: Array<string | { name?: string }>
}

const builder = useBuilderClient()
const builderAuthRequired = computed(() => Boolean(builder.builder?.auth?.authenticate || builder.builder?.auth?.enabled))
const page = useProtectedPage({
  auth: builderAuthRequired.value ? 'required' : 'optional',
  validateBearer: true,
  reason: 'playground-console-rbac',
  stableUntilMounted: true,
})

const status = ref<ConsoleStatus | null>(null)
const rbac = ref<RbacFile | null>(null)
const discoveredServices = ref<string[]>([])
const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)
const okMsg = ref<string | null>(null)

const methods: RbacMethod[] = ['find', 'get', 'create', 'update', 'patch', 'remove']
const canWrite = computed(() => status.value?.consoleEnabled === true && status.value?.allowWrite === true)
const services = computed(() => Array.from(new Set([
  ...discoveredServices.value,
  ...Object.keys(rbac.value?.policies || {}),
])).sort())

function toErrorMessage(errorValue: unknown): string {
  if (errorValue && typeof errorValue === 'object') {
    const candidate = errorValue as { data?: { message?: unknown }, message?: unknown }
    if (typeof candidate.data?.message === 'string')
      return candidate.data.message
    if (typeof candidate.message === 'string')
      return candidate.message
  }
  return String(errorValue || 'Une erreur inconnue est survenue.')
}

async function ensureConsoleAccess(): Promise<void> {
  await page.ensure()
  if (builderAuthRequired.value && !page.authorized.value)
    throw new Error('Une session authentifiée est requise pour utiliser les services NFZ de la console.')
}

function normalizeServiceNames(payload: DiscoveryPayload): string[] {
  const raw = Array.isArray(payload.services) ? payload.services : []
  return Array.from(new Set(raw.map((service) => {
    if (typeof service === 'string')
      return service.trim()
    return String(service?.name || '').trim()
  }).filter(Boolean))).sort()
}

async function loadAll(): Promise<void> {
  loading.value = true
  error.value = null
  okMsg.value = null
  try {
    await ensureConsoleAccess()
    const [nextStatus, rbacResponse, discovery] = await Promise.all([
      builder.getStatus<ConsoleStatus>(),
      builder.getRbac<RbacResponse>(),
      builder.getServices<DiscoveryPayload>(),
    ])
    status.value = nextStatus
    rbac.value = structuredClone(rbacResponse.file)
    discoveredServices.value = normalizeServiceNames(discovery)
  }
  catch (errorValue: unknown) {
    error.value = toErrorMessage(errorValue)
  }
  finally {
    loading.value = false
  }
}

function ensurePolicy(service: string): void {
  if (!rbac.value)
    return
  rbac.value.policies ||= {}
  rbac.value.policies[service] ||= {}
}

function toggleRole(service: string, method: RbacMethod, role: string): void {
  if (!rbac.value || !canWrite.value)
    return

  ensurePolicy(service)
  const current = new Set((rbac.value.policies[service]?.[method] || []).map(String))
  if (current.has(role))
    current.delete(role)
  else
    current.add(role)
  rbac.value.policies[service]![method] = [...current]
}

async function save(): Promise<void> {
  if (!rbac.value || !canWrite.value)
    return

  saving.value = true
  error.value = null
  okMsg.value = null
  try {
    await ensureConsoleAccess()
    await builder.saveRbac(rbac.value)
    okMsg.value = 'La politique RBAC a été enregistrée par nfz/rbac.patch().'
    await loadAll()
  }
  catch (errorValue: unknown) {
    error.value = toErrorMessage(errorValue)
  }
  finally {
    saving.value = false
  }
}

onMounted(() => {
  void loadAll()
})
</script>

<template>
  <div class="nfz-page">
    <PlaygroundPageHeader
      eyebrow="Outils avancés"
      title="Console RBAC"
      description="Contrôlez les rôles et politiques des services découverts. La lecture et l’écriture passent par les services Feathers NFZ."
    >
      <template #actions>
        <PlaygroundStatusBadge :label="canWrite ? 'Écriture autorisée' : 'Lecture seule'" :tone="canWrite ? 'success' : 'warning'" />
        <button class="nfz-button" type="button" :disabled="loading || saving" @click="loadAll">Actualiser</button>
      </template>
    </PlaygroundPageHeader>

    <div class="nfz-grid nfz-grid--3">
      <article class="nfz-stat-card"><span>Fournisseur auth</span><strong>{{ status?.authProvider || 'aucun' }}</strong><small>État résolu par nfz/status.find()</small></article>
      <article class="nfz-stat-card"><span>Services</span><strong>{{ services.length }}</strong><small>Découverts par nfz/services.find()</small></article>
      <article class="nfz-stat-card"><span>RBAC</span><strong>{{ rbac?.enabled ? 'Actif' : 'Inactif' }}</strong><small>Deny by default : {{ rbac?.denyByDefault ? 'oui' : 'non' }}</small></article>
    </div>

    <div v-if="error" class="nfz-alert nfz-alert--danger" role="alert"><strong>Le chargement RBAC a échoué.</strong><span>{{ error }}</span></div>
    <div v-if="okMsg" class="nfz-alert nfz-alert--success" role="status">{{ okMsg }}</div>
    <p v-if="loading" class="nfz-alert">Chargement des services Feathers NFZ…</p>

    <PlaygroundPanel v-if="rbac" title="Politique" description="Les changements ne sont persistés que lorsque console.allowWrite=true.">
      <div class="nfz-actions">
        <label class="nfz-inline-check"><input v-model="rbac.enabled" type="checkbox" :disabled="!canWrite"> Activer RBAC</label>
        <label class="nfz-inline-check"><input v-model="rbac.denyByDefault" type="checkbox" :disabled="!canWrite"> Refuser par défaut</label>
        <button class="nfz-button nfz-button--primary nfz-save" type="button" :disabled="!canWrite || saving" @click="save">
          {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
        </button>
      </div>
      <p class="nfz-muted">Fichier : <code>services/.nfz/rbac.json</code> · Mise à jour : {{ rbac.updatedAt || 'non renseignée' }}</p>
      <p v-if="!canWrite" class="nfz-alert nfz-alert--warning">Le playground est volontairement en lecture seule. Activez <code>feathers.console.allowWrite</code> uniquement pour un test local maîtrisé.</p>
    </PlaygroundPanel>

    <PlaygroundPanel v-if="rbac" title="Matrice services × méthodes" description="Cliquez sur un rôle pour l’autoriser ou le retirer de la méthode sélectionnée.">
      <div v-if="!services.length" class="nfz-alert nfz-alert--warning">
        Aucun service n’a été découvert. Vérifiez <code>feathers.servicesDirs</code> puis <code>nfz/services.find()</code>.
      </div>
      <div v-else class="nfz-table-wrap">
        <table class="nfz-table nfz-rbac-table">
          <thead>
            <tr><th>Service</th><th v-for="method in methods" :key="method">{{ method }}</th></tr>
          </thead>
          <tbody>
            <tr v-for="service in services" :key="service">
              <td><code>{{ service }}</code></td>
              <td v-for="method in methods" :key="method">
                <div class="nfz-role-list">
                  <button
                    v-for="role in rbac.roles"
                    :key="role"
                    class="nfz-role"
                    :class="{ 'nfz-role--active': (rbac.policies?.[service]?.[method] || []).includes(role) }"
                    type="button"
                    :disabled="!canWrite"
                    @click="toggleRole(service, method, role)"
                  >
                    {{ role }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </PlaygroundPanel>

    <PlaygroundJsonPanel v-if="rbac" title="Politique RBAC courante" :value="rbac" />
  </div>
</template>

<style scoped>
.nfz-inline-check {
  display: inline-flex;
  gap: 0.45rem;
  align-items: center;
}

.nfz-save {
  margin-left: auto;
}

.nfz-table-wrap {
  overflow-x: auto;
}

.nfz-table {
  width: 100%;
  min-width: 880px;
  border-collapse: collapse;
}

.nfz-table th,
.nfz-table td {
  padding: 0.65rem;
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid var(--nfz-border);
}

.nfz-role-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.nfz-role {
  padding: 0.3rem 0.55rem;
  border: 1px solid var(--nfz-border);
  border-radius: 999px;
  opacity: 0.45;
  cursor: pointer;
}

.nfz-role--active {
  opacity: 1;
  border-color: var(--nfz-accent);
}
</style>
