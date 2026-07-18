<script setup lang="ts">
type CheckStatus = 'idle' | 'running' | 'success' | 'warning' | 'error' | 'skipped'
type CheckId = 'client' | 'runtime' | 'services' | 'auth' | 'service' | 'mongo'

interface QuickCheck {
  id: CheckId
  title: string
  description: string
  status: CheckStatus
  detail: string
}

interface FeathersService {
  find: (params?: Record<string, unknown>) => Promise<unknown>
}

interface FeathersClient {
  service: (path: string) => FeathersService
}

const auth = useAuth()
const builder = useBuilderClient()
const nuxtApp = useNuxtApp() as unknown as {
  $api?: FeathersClient
  $client?: FeathersClient
  $feathersClient?: FeathersClient
}
const { essentialItems, advancedItems } = usePlaygroundNavigation()
const dashboardEssentialItems = computed(() => essentialItems.value.filter(item => item.to !== '/'))
const { publicClient, clientMode, scenarioId, title, embeddedMongoEnabled, embeddedMongoMode } = usePlaygroundScenario()
const config = useRuntimeConfig()

const flags = computed(() => (config.public as Record<string, any>)?.nfzPlayground ?? {})
const moduleVersion = computed(() => String(flags.value.moduleVersion || 'dev'))
const authProvider = computed(() => auth.provider.value || 'none')
const isAuthenticated = computed(() => auth.isAuthenticated.value)
const sessionUiReady = ref(false)
const displayAuthenticated = computed(() => sessionUiReady.value && isAuthenticated.value)
const displayAuthProvider = computed(() => sessionUiReady.value ? authProvider.value : 'initialisation')
const isLocal = computed(() => authProvider.value === 'local')
const isKeycloak = computed(() => authProvider.value === 'keycloak')
const localForm = reactive({ userId: 'test', password: '12345' })
const authError = ref<string | null>(null)
const authBusy = ref(false)
const checksRunning = ref(false)

const checks = reactive<QuickCheck[]>([
  { id: 'client', title: 'Client injecté', description: 'Le client NFZ est disponible dans l’application Nuxt.', status: 'idle', detail: '' },
  { id: 'runtime', title: 'Runtime serveur', description: 'Le service Feathers NFZ expose son état et sa configuration publique.', status: 'idle', detail: '' },
  { id: 'services', title: 'Découverte des services', description: 'Le manifeste des services générés peut être consulté.', status: 'idle', detail: '' },
  { id: 'auth', title: 'Authentification', description: 'Le provider et l’état de session sont initialisés.', status: 'idle', detail: '' },
  { id: 'service', title: 'Appel Feathers', description: 'Un find léger est exécuté sur un service représentatif.', status: 'idle', detail: '' },
  { id: 'mongo', title: 'MongoDB', description: 'Le service de démonstration MongoDB répond lorsque le mode est activé.', status: 'idle', detail: '' },
])

function updateCheck(id: CheckId, status: CheckStatus, detail = '') {
  const check = checks.find(item => item.id === id)
  if (!check) return
  check.status = status
  check.detail = detail
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error && 'message' in error) return String((error as { message?: unknown }).message || error)
  return String(error || 'Erreur inconnue')
}

function isAccessError(error: unknown) {
  const record = error as { name?: string, code?: number, message?: string }
  return record?.name === 'NotAuthenticated'
    || record?.name === 'Forbidden'
    || record?.code === 401
    || record?.code === 403
    || /not authenticated|forbidden|unauthorized/i.test(String(record?.message || ''))
}

async function runClientCheck() {
  updateCheck('client', 'running')
  const client = nuxtApp.$api || nuxtApp.$client || nuxtApp.$feathersClient
  updateCheck(
    'client',
    client && typeof client.service === 'function' ? 'success' : 'error',
    client ? 'Injection $api/$client détectée.' : 'Aucun client Feathers injecté.',
  )
}

async function runRuntimeCheck() {
  updateCheck('runtime', 'running')
  try {
    const response = await builder.getStatus<{ ok?: boolean, state?: string }>()
    updateCheck('runtime', response?.ok ? 'success' : 'warning', `État serveur : ${response?.state || 'inconnu'}.`)
  }
  catch (error) {
    updateCheck('runtime', 'error', errorMessage(error))
  }
}

async function runServicesCheck() {
  updateCheck('services', 'running')
  try {
    const response = await builder.getServices<{ services?: unknown[] }>()
    const count = Array.isArray(response?.services) ? response.services.length : 0
    updateCheck('services', count > 0 ? 'success' : 'warning', `${count} service(s) découvert(s).`)
  }
  catch (error) {
    updateCheck('services', 'error', errorMessage(error))
  }
}

async function runAuthCheck() {
  updateCheck('auth', 'running')
  try {
    await auth.init()
    const provider = auth.provider.value || 'none'
    const status: CheckStatus = provider === 'none' ? 'warning' : 'success'
    updateCheck('auth', status, `Fournisseur : ${provider} · session : ${auth.isAuthenticated.value ? 'ouverte' : 'anonyme'}.`)
  }
  catch (error) {
    updateCheck('auth', 'error', errorMessage(error))
  }
}

async function runServiceCheck() {
  updateCheck('service', 'running')
  const client = nuxtApp.$api || nuxtApp.$client || nuxtApp.$feathersClient
  if (!client) {
    updateCheck('service', 'error', 'Client Feathers indisponible.')
    return
  }

  const remoteServices = (publicClient.value as Record<string, any>)?.remote?.services
  const servicePath = clientMode.value === 'remote' && Array.isArray(remoteServices) && remoteServices.length
    ? String(remoteServices[0]?.path || 'users')
    : 'messages'

  try {
    await client.service(servicePath).find({ query: { $limit: 1 } })
    updateCheck('service', 'success', `Service « ${servicePath} » accessible.`)
  }
  catch (error) {
    if (isAccessError(error)) {
      updateCheck('service', 'warning', `Service « ${servicePath} » protégé : connectez-vous pour terminer ce contrôle.`)
      return
    }
    updateCheck('service', 'error', errorMessage(error))
  }
}

async function runMongoCheck() {
  if (!embeddedMongoEnabled.value) {
    updateCheck('mongo', 'skipped', 'MongoDB est désactivé dans ce scénario.')
    return
  }

  updateCheck('mongo', 'running')
  const client = nuxtApp.$api || nuxtApp.$client || nuxtApp.$feathersClient
  if (!client) {
    updateCheck('mongo', 'error', 'Client Feathers indisponible.')
    return
  }

  try {
    await client.service('mongos').find({ query: { $limit: 1 } })
    updateCheck('mongo', 'success', `Mode MongoDB : ${embeddedMongoMode.value}.`)
  }
  catch (error) {
    if (isAccessError(error)) {
      updateCheck('mongo', 'warning', 'Service MongoDB protégé : authentification requise.')
      return
    }
    updateCheck('mongo', 'error', errorMessage(error))
  }
}

async function runQuickChecks() {
  checksRunning.value = true
  checks.forEach(check => {
    check.status = 'idle'
    check.detail = ''
  })
  await Promise.all([
    runClientCheck(),
    runRuntimeCheck(),
    runServicesCheck(),
    runAuthCheck(),
    runServiceCheck(),
    runMongoCheck(),
  ])
  checksRunning.value = false
}

async function loginLocal() {
  authBusy.value = true
  authError.value = null
  try {
    const store = useAuthStore()
    await store.authenticate({ strategy: 'local', ...localForm })
    await runAuthCheck()
    await runServiceCheck()
  }
  catch (error) {
    authError.value = errorMessage(error)
  }
  finally {
    authBusy.value = false
  }
}

async function logout() {
  authBusy.value = true
  authError.value = null
  try {
    await auth.logout()
    await runAuthCheck()
  }
  catch (error) {
    authError.value = errorMessage(error)
  }
  finally {
    authBusy.value = false
  }
}

onMounted(async () => {
  try {
    await auth.init()
  }
  catch (error) {
    authError.value = errorMessage(error)
  }
  finally {
    sessionUiReady.value = true
  }
})
</script>

<template>
  <div class="nfz-page">
    <PlaygroundPageHeader
      eyebrow="Centre de validation"
      title="Tester le module sans se perdre"
      description="Un parcours unique pour contrôler le runtime, l’authentification, les services Feathers, MongoDB, les transports et les outils de génération."
    >
      <template #actions>
        <button type="button" class="nfz-button nfz-button--primary" :disabled="checksRunning" @click="runQuickChecks">
          {{ checksRunning ? 'Contrôles en cours…' : 'Lancer les contrôles rapides' }}
        </button>
        <NuxtLink to="/tests" class="nfz-button">Ouvrir les tests détaillés</NuxtLink>
      </template>
    </PlaygroundPageHeader>

    <div class="nfz-grid nfz-grid--3">
      <article class="nfz-stat-card">
        <span>Version du module</span>
        <strong>v{{ moduleVersion }}</strong>
        <small>Scénario : {{ scenarioId }}</small>
      </article>
      <article class="nfz-stat-card">
        <span>Mode client</span>
        <strong>{{ clientMode }}</strong>
        <small>{{ title }}</small>
      </article>
      <article class="nfz-stat-card">
        <span>Session</span>
        <strong>{{ !sessionUiReady ? 'Initialisation…' : (displayAuthenticated ? 'Authentifiée' : 'Anonyme') }}</strong>
        <small>Fournisseur : {{ displayAuthProvider }}</small>
      </article>
    </div>

    <div class="nfz-grid nfz-grid--2">
      <PlaygroundPanel
        title="Contrôles rapides"
        description="Ces tests sont sans effet destructif. Les services protégés sont signalés sans être considérés comme cassés."
      >
        <div class="nfz-check-list">
          <PlaygroundCheckItem
            v-for="check in checks"
            :key="check.id"
            :title="check.title"
            :description="check.description"
            :status="check.status"
            :detail="check.detail"
          />
        </div>
      </PlaygroundPanel>

      <PlaygroundPanel
        title="Authentification"
        description="Utilisez la session locale de démonstration ou déclenchez le flux Keycloak configuré."
      >
        <div class="nfz-form-stack">
          <div
            v-if="!sessionUiReady"
            class="nfz-alert"
            aria-live="polite"
          >
            <strong>Initialisation de la session…</strong><br>
            Synchronisation du runtime d’authentification.
          </div>

          <template v-else>
            <div class="nfz-alert" :class="displayAuthenticated ? 'nfz-alert--success' : ''">
              <strong>{{ displayAuthenticated ? 'Session active' : 'Session anonyme' }}</strong><br>
              Provider : <code>{{ displayAuthProvider }}</code>
            </div>

            <form v-if="isLocal && !displayAuthenticated" class="nfz-form-stack" @submit.prevent="loginLocal">
            <label>
              Identifiant
              <input v-model.trim="localForm.userId" autocomplete="username" required>
            </label>
            <label>
              Mot de passe
              <input v-model="localForm.password" type="password" autocomplete="current-password" required>
            </label>
            <button class="nfz-button nfz-button--primary" type="submit" :disabled="authBusy">
              {{ authBusy ? 'Connexion…' : 'Se connecter' }}
            </button>
            <small class="nfz-muted">Compte de démonstration : <code>test</code> / <code>12345</code></small>
          </form>

          <div v-else-if="isKeycloak && !displayAuthenticated" class="nfz-form-stack">
            <p class="nfz-muted">Le flux SSO sera déclenché lors de l’ouverture d’une page protégée.</p>
            <NuxtLink to="/messages" class="nfz-button nfz-button--primary">Ouvrir une page protégée</NuxtLink>
          </div>

          <div v-else-if="displayAuthenticated" class="nfz-actions">
            <NuxtLink to="/messages" class="nfz-button nfz-button--primary">Tester le CRUD protégé</NuxtLink>
            <button type="button" class="nfz-button nfz-button--danger" :disabled="authBusy" @click="logout">Se déconnecter</button>
          </div>

            <p v-if="authError" class="nfz-alert nfz-alert--danger">{{ authError }}</p>
          </template>
        </div>
      </PlaygroundPanel>
    </div>

    <PlaygroundPanel
      title="Fonctions essentielles"
      description="Chaque carte mène à un scénario ciblé avec des résultats et diagnostics lisibles."
    >
      <div class="nfz-feature-grid">
        <PlaygroundFeatureCard
          v-for="item in dashboardEssentialItems"
          :key="item.to"
          :title="item.label"
          :description="item.description"
          :to="item.to"
          :icon="item.icon"
          meta="Essentiel"
        />
      </div>
    </PlaygroundPanel>

    <PlaygroundPanel
      title="Tests avancés"
      description="Transports distants, runtime d’authentification, validation Zod et backend embarqué."
    >
      <div class="nfz-feature-grid">
        <PlaygroundFeatureCard
          v-for="item in advancedItems"
          :key="item.to"
          :title="item.label"
          :description="item.description"
          :to="item.to"
          :icon="item.icon"
          meta="Avancé"
        />
      </div>
    </PlaygroundPanel>

    <PlaygroundJsonPanel
      title="Configuration publique résolue"
      :value="{
        moduleVersion,
        scenarioId,
        clientMode,
        embeddedMongoEnabled,
        embeddedMongoMode,
        publicClient,
        flags,
      }"
    />
  </div>
</template>
