<script setup lang="ts">
definePageMeta({ ssr: false })
// IMPORTANT (dual-mode): diagnostics must use the raw Feathers client injected by the module.
// This keeps network/CORS/certificate errors visible without a service-cache wrapper.
const nuxtApp = useNuxtApp() as any
const client: any = nuxtApp.$client || nuxtApp.$feathersClient || nuxtApp.$api
const config = useRuntimeConfig()

// Unified auth (supports: keycloak | local | remote | none)
const auth = useAuth()
const { scenarioId, title, embeddedMongoMode, clientMode } = usePlaygroundScenario()
onMounted(() => {
  auth.init().catch(() => {})
})

const storageKey = computed(() => publicClient.value?.remote?.auth?.storageKey || 'feathers-jwt')
const storedToken = ref('')
function readStoredToken() {
  if (import.meta.server) return
  try {
    storedToken.value = window.localStorage.getItem(storageKey.value) || ''
  } catch {}
}
function writeStoredToken() {
  if (import.meta.server) return
  try {
    window.localStorage.setItem(storageKey.value, storedToken.value || '')
  } catch {}
}
function clearStoredToken() {
  if (import.meta.server) return
  try {
    window.localStorage.removeItem(storageKey.value)
    storedToken.value = ''
  } catch {}
}
onMounted(() => { readStoredToken() })

const tokenPreview = computed(() => {
  const t: any = (auth as any).token
  let s = ''
  try {
    if (typeof t === 'string') s = t
    else if (t == null) s = ''
    else s = JSON.stringify(t)
  } catch {
    s = String(t ?? '')
  }
  return s.slice(0, 24) + (s.length > 24 ? '…' : '')
})

type AnyObj = Record<string, any>

function serializeError(e: any): AnyObj {
  const out: AnyObj = {
    name: e?.name,
    message: e?.message ?? String(e),
    code: e?.code ?? e?.statusCode ?? e?.status,
    className: e?.className,
  }

  // Common Feathers error fields
  if (e?.errors !== undefined)
    out.errors = e.errors
  if (e?.data !== undefined)
    out.data = e.data
  if (e?.stack)
    out.stack = String(e.stack)
  if (e?.cause)
    out.cause = e.cause

  // Some adapters expose response/request objects
  if (e?.response)
    out.response = e.response
  if (e?.request)
    out.request = e.request

  // Last resort: try to JSON stringify without throwing
  try {
    out.raw = JSON.parse(JSON.stringify(e))
  }
  catch {
    // ignore
  }

  return out
}

const publicClient = computed(() => (config.public as any)?._feathers?.client ?? {})
const playgroundFlags = computed(() => (config.public as any)?.nfzPlayground ?? {})
const mode = computed(() => publicClient.value?.mode ?? 'embedded')
const embeddedMongoEnabled = computed(() => playgroundFlags.value?.embeddedMongoEnabled !== false)
const resolvedRemoteBaseUrl = computed(() => mode.value === 'remote' ? buildRemoteRestUrl(pingService.value) : '')
const resolvedRemoteQueryUrl = computed(() => mode.value === 'remote' ? buildRemoteRestUrl(pingService.value, 1) : '')

// ---- Connection test ----
const connectionLoading = ref(false)
const connectionError = ref<string | null>(null)
const connectionResult = ref<AnyObj | null>(null)

const serviceCandidates = computed<string[]>(() => {
  if (mode.value === 'remote') {
    const services = publicClient.value?.remote?.services
    if (Array.isArray(services) && services.length)
      return services.map((s: any) => String(s?.path || '')).filter(Boolean)
    // Fallback (common service names in demos)
    return ['ldapusers', 'users', 'messages']
  }
  return embeddedMongoEnabled.value ? ['users', 'messages', 'actions', 'mongos'] : ['users', 'messages', 'actions']
})

const pingService = ref<string>('')
watchEffect(() => {
  if (!pingService.value)
    pingService.value = serviceCandidates.value[0] || 'users'
})

function buildRemoteRestUrl(servicePath: string, limit?: number) {
  const base = String(publicClient.value?.remote?.url || '')
  const restPath = String(publicClient.value?.remote?.restPath || '')
  if (!base)
    return ''
  let url: URL
  try {
    url = new URL(base)
  }
  catch {
    return ''
  }
  const originOnly = url.origin
  const prefix = (url.pathname && url.pathname !== '/') ? url.pathname.replace(/\/$/, '') : ''
  const normalizedRest = !restPath || restPath === '/' ? '' : (restPath.startsWith('/') ? restPath.replace(/\/$/, '') : `/${restPath.replace(/\/$/, '')}`)
  const root = `${originOnly}${prefix}${normalizedRest}`.replace(/\/$/, '')
  const basePath = `${root}/${encodeURIComponent(servicePath)}`
  return typeof limit === 'number' ? `${basePath}?$limit=${limit}` : basePath
}

async function testConnection() {
  connectionLoading.value = true
  connectionError.value = null
  connectionResult.value = null

  try {
    // In remote REST mode, start with raw fetch diagnostics before using any client wrapper.
    if (mode.value === 'remote' && publicClient.value?.remote?.transport === 'rest') {
      const baseUrl = buildRemoteRestUrl(pingService.value)
      const queryUrl = buildRemoteRestUrl(pingService.value, 1)

      const fetchDiagnostic = async (url: string) => {
        console.info('[NFZ TEST FETCH]', { url, mode: mode.value, origin: window.location.origin })
        const r = await fetch(url, { method: 'GET' })
        const ct = r.headers.get('content-type') || ''
        const bodyText = await r.text()
        let parsed: any = bodyText
        try {
          parsed = ct.includes('json') ? JSON.parse(bodyText) : bodyText
        }
        catch {}
        return {
          ok: r.ok,
          url,
          status: r.status,
          statusText: r.statusText,
          contentType: ct,
          bodyPreview: typeof parsed === 'string' ? parsed.slice(0, 600) : parsed,
          parsed,
        }
      }

      const baseDiag = await fetchDiagnostic(baseUrl)
      let queryDiag: any = null
      try {
        queryDiag = await fetchDiagnostic(queryUrl)
      }
      catch (qe: any) {
        queryDiag = { ok: false, url: queryUrl, error: serializeError(qe) }
      }

      if (!baseDiag.ok) {
        connectionError.value = `${baseDiag.status} ${baseDiag.statusText}`
        connectionResult.value = {
          ok: false,
          mode: mode.value,
          service: pingService.value,
          error: {
            name: 'FetchError',
            message: `HTTP ${baseDiag.status} ${baseDiag.statusText}`,
            code: baseDiag.status,
          },
          runtimeClient: publicClient.value,
          debugRestFetch: {
            ok: false,
            base: { ...baseDiag, parsed: undefined },
            query: queryDiag,
          },
        }
        return
      }

      connectionResult.value = {
        ok: true,
        mode: mode.value,
        service: pingService.value,
        resultType: Array.isArray(baseDiag.parsed) ? 'array' : typeof baseDiag.parsed,
        sample: baseDiag.parsed,
        runtimeClient: publicClient.value,
        debugRestFetch: {
          ok: true,
          base: { ...baseDiag, parsed: undefined },
          query: queryDiag,
        },
      }
      return
    }

    const svc: any = client.service(pingService.value)
    console.info('[NFZ TEST FEATHERS]', {
      service: pingService.value,
      mode: mode.value,
      remoteUrl: publicClient.value?.remote?.url,
      restPath: publicClient.value?.remote?.restPath,
      resolvedBaseUrl: resolvedRemoteBaseUrl.value,
      resolvedQueryUrl: resolvedRemoteQueryUrl.value,
      locationOrigin: window.location.origin,
    })
    const res = await svc.find({ query: { $limit: 1 } })
    connectionResult.value = {
      ok: true,
      mode: mode.value,
      service: pingService.value,
      resultType: Array.isArray(res) ? 'array' : typeof res,
      sample: res,
      runtimeClient: publicClient.value,
    }
  }
  catch (e: any) {
    const err = serializeError(e)
    connectionError.value = err.message
    connectionResult.value = {
      ok: false,
      mode: mode.value,
      service: pingService.value,
      error: err,
      runtimeClient: publicClient.value,
    }

    try {
      if (mode.value === 'remote' && publicClient.value?.remote?.transport === 'rest') {
        const baseUrl = buildRemoteRestUrl(pingService.value)
        const queryUrl = buildRemoteRestUrl(pingService.value, 1)
        let base: any
        let query: any
        try {
          const r = await fetch(baseUrl, { method: 'GET' })
          const ct = r.headers.get('content-type') || ''
          const bodyText = await r.text()
          base = {
            ok: r.ok,
            url: baseUrl,
            status: r.status,
            statusText: r.statusText,
            contentType: ct,
            bodyPreview: bodyText.slice(0, 600),
          }
        }
        catch (be: any) {
          base = { ok: false, url: baseUrl, error: serializeError(be) }
        }
        try {
          const r = await fetch(queryUrl, { method: 'GET' })
          const ct = r.headers.get('content-type') || ''
          const bodyText = await r.text()
          query = {
            ok: r.ok,
            url: queryUrl,
            status: r.status,
            statusText: r.statusText,
            contentType: ct,
            bodyPreview: bodyText.slice(0, 600),
          }
        }
        catch (qe: any) {
          query = { ok: false, url: queryUrl, error: serializeError(qe) }
        }
        connectionResult.value.debugRestFetch = { base, query }
      }
    }
    catch (e2: any) {
      connectionResult.value.debugRestFetch = {
        ok: false,
        url: buildRemoteRestUrl(pingService.value, 1),
        error: serializeError(e2),
      }
    }
  }
  finally {
    connectionLoading.value = false
  }
}

// ---- Auth tests ----
const authLoading = ref(false)
const authError = ref<string | null>(null)
const authResult = ref<AnyObj | null>(null)

// Keycloak SSO diagnostics
const ssoLoading = ref(false)
const ssoError = ref<string | null>(null)
const ssoResult = ref<AnyObj | null>(null)

function resetSsoState() {
  ssoError.value = null
  ssoResult.value = null
}

const isKeycloak = computed(() => auth.provider.value === 'keycloak')
const keycloak = computed<any>(() => (useNuxtApp() as any).$keycloak)

async function ssoLogin() {
  ssoLoading.value = true
  resetSsoState()
  try {
    await auth.login({ redirectUri: window.location.origin + '/tests' })
    ssoResult.value = { ok: true, action: 'login', authenticated: auth.isAuthenticated.value }
  }
  catch (e: any) {
    ssoError.value = e?.message || String(e)
  }
  finally {
    ssoLoading.value = false
  }
}

async function ssoWhoami() {
  ssoLoading.value = true
  resetSsoState()
  try {
    if (!keycloak.value || typeof keycloak.value.whoami !== 'function')
      throw new Error('Keycloak bridge whoami() is not available')
    const res = await keycloak.value.whoami()
    ssoResult.value = { ok: true, action: 'whoami', response: res, user: auth.user.value }
  }
  catch (e: any) {
    ssoError.value = e?.message || String(e)
  }
  finally {
    ssoLoading.value = false
  }
}

async function ssoUpdateToken() {
  ssoLoading.value = true
  resetSsoState()
  try {
    if (!keycloak.value || typeof keycloak.value.updateToken !== 'function')
      throw new Error('keycloak.updateToken() is not available')
    const ok = await keycloak.value.updateToken(30)
    ssoResult.value = { ok: true, action: 'updateToken', refreshed: ok, authenticated: auth.isAuthenticated.value }
  }
  catch (e: any) {
    ssoError.value = e?.message || String(e)
  }
  finally {
    ssoLoading.value = false
  }
}

async function ssoLogout() {
  ssoLoading.value = true
  resetSsoState()
  try {
    await auth.logout({ redirectUri: window.location.origin + '/tests' })
    ssoResult.value = { ok: true, action: 'logout' }
  }
  catch (e: any) {
    ssoError.value = e?.message || String(e)
  }
  finally {
    ssoLoading.value = false
  }
}

const authServicePath = computed(() => {
  return (publicClient.value?.remote?.auth?.servicePath || 'authentication')
})

// Local auth
// The username field is configurable in embedded mode (auth.local.usernameField).
// We let this page adapt dynamically (email/username/userId/...).
const embeddedUsernameField = computed(() => {
  const a = (config.public as any)?._feathers?.auth
  return a?.local?.usernameField || 'email'
})

const localIdentifierField = ref<string>(embeddedUsernameField.value)
const localIdentifier = ref(mode.value === 'embedded' ? 'test' : '')
const localPassword = ref(mode.value === 'embedded' ? '12345' : '')

const localIdentifierOptions = computed(() => {
  const base = ['email', 'username']
  const u = String(embeddedUsernameField.value || '').trim()
  if (u && !base.includes(u)) base.unshift(u)
  return base
})

watchEffect(() => {
  // Keep selection aligned with configured usernameField when available.
  const u = String(embeddedUsernameField.value || 'email')
  if (!localIdentifierField.value || !localIdentifierOptions.value.includes(localIdentifierField.value)) {
    localIdentifierField.value = u
  }
})

// Token/payload auth (jwt/keycloak/etc.)
const tokenStrategy = ref<string>('jwt')
const tokenField = ref<string>('access_token')
const tokenValue = ref('')

watchEffect(() => {
  // Defaults from remote auth config (if provided)
  const ra = publicClient.value?.remote?.auth
  if (mode.value === 'remote' && ra?.enabled) {
    tokenStrategy.value = ra?.strategy || tokenStrategy.value
    tokenField.value = ra?.tokenField || tokenField.value
  }
})

function resetAuthState() {
  authError.value = null
  authResult.value = null
}

async function authLocal() {
  authLoading.value = true
  resetAuthState()
  try {
    const payload: AnyObj = {
      strategy: 'local',
      password: localPassword.value,
    }
    payload[localIdentifierField.value] = localIdentifier.value

    const res = await (client as any)
      .service(authServicePath.value)
      .create(payload)

    authResult.value = {
      ok: true,
      mode: mode.value,
      type: 'local',
      authService: authServicePath.value,
      payload: { ...payload, password: '***' },
      response: res,
    }
  }
  catch (e: any) {
    authError.value = e?.message || String(e)
  }
  finally {
    authLoading.value = false
  }
}

async function authToken() {
  authLoading.value = true
  resetAuthState()
  try {
    const payload: AnyObj = {
      strategy: tokenStrategy.value || 'jwt',
      [tokenField.value || 'accessToken']: tokenValue.value,
    }

    const res = await (client as any)
      .service(authServicePath.value)
      .create(payload)

    readStoredToken()
    authResult.value = {
      ok: true,
      mode: mode.value,
      type: 'token',
      authService: authServicePath.value,
      payload: { ...payload, [tokenField.value]: tokenValue.value ? '***' : '' },
      response: res,
      storageKey: storageKey.value,
      storedTokenPreview: storedToken.value ? storedToken.value.slice(0, 24) + (storedToken.value.length > 24 ? '…' : '') : '',
    }
  }
  catch (e: any) {
    authError.value = e?.message || String(e)
  }
  finally {
    authLoading.value = false
  }
}

async function reauth() {
  authLoading.value = true
  resetAuthState()
  try {
    if (typeof (client as any).reAuthenticate !== 'function')
      throw new Error('client.reAuthenticate() is not available (authentication-client not configured)')

    const res = await (client as any).reAuthenticate()
    readStoredToken()
    authResult.value = {
      ok: true,
      mode: mode.value,
      type: 'reAuthenticate',
      response: res,
      storageKey: storageKey.value,
      storedTokenPreview: storedToken.value ? storedToken.value.slice(0, 24) + (storedToken.value.length > 24 ? '…' : '') : '',
    }
  }
  catch (e: any) {
    authError.value = e?.message || String(e)
  }
  finally {
    authLoading.value = false
  }
}

async function logout() {
  authLoading.value = true
  resetAuthState()
  try {
    await auth.logout()
    clearStoredToken()
    authResult.value = {
      ok: true,
      mode: mode.value,
      type: 'logout',
      clientMode: clientMode.value,
      authProvider: auth.provider.value,
      authenticated: auth.isAuthenticated.value,
    }
  }
  catch (e: any) {
    authError.value = e?.message || String(e)
  }
  finally {
    authLoading.value = false
  }
}


const authProviderLabel = computed(() => auth.provider.value || 'none')
const authenticated = computed(() => auth.isAuthenticated.value)
const authUserSnapshot = computed(() => auth.user.value)
</script>

<template>
  <ClientOnly>
    <div class="nfz-page">
      <PlaygroundPageHeader
        eyebrow="Parcours essentiel"
        title="Connexion et authentification"
        description="Validez d’abord l’accès à un service, puis la session. Les réglages de token et les diagnostics bruts restent disponibles dans les sections avancées."
      >
        <template #actions>
          <NuxtLink to="/" class="nfz-button">Retour au tableau de bord</NuxtLink>
          <NuxtLink to="/validation" class="nfz-button">Voir les scénarios</NuxtLink>
        </template>
      </PlaygroundPageHeader>

      <div class="nfz-grid nfz-grid--3">
        <article class="nfz-stat-card">
          <span>Scénario</span>
          <strong>{{ title }}</strong>
          <small>{{ scenarioId }}</small>
        </article>
        <article class="nfz-stat-card">
          <span>Mode client</span>
          <strong>{{ mode }}</strong>
          <small>MongoDB : {{ embeddedMongoMode }}</small>
        </article>
        <article class="nfz-stat-card">
          <span>Authentification</span>
          <strong>{{ authenticated ? 'Session active' : 'Session anonyme' }}</strong>
          <small>Fournisseur : {{ authProviderLabel }}</small>
        </article>
      </div>

      <PlaygroundPanel
        title="1. Tester un service"
        description="Le contrôle exécute un find limité à un enregistrement. En mode REST distant, une requête fetch brute est aussi ajoutée au diagnostic."
      >
        <div class="nfz-form-stack">
          <div class="nfz-form-grid">
            <label>
              Service à interroger
              <select v-model="pingService">
                <option v-for="service in serviceCandidates" :key="service" :value="service">
                  {{ service }}
                </option>
              </select>
            </label>
            <button class="nfz-button nfz-button--primary" type="button" :disabled="connectionLoading" @click="testConnection">
              {{ connectionLoading ? 'Test en cours…' : 'Tester la connexion' }}
            </button>
          </div>

          <p v-if="connectionError" class="nfz-alert nfz-alert--danger">
            {{ connectionError }}
          </p>
          <p v-else-if="connectionResult?.ok" class="nfz-alert nfz-alert--success">
            Le service <code>{{ pingService }}</code> répond correctement.
          </p>

          <PlaygroundJsonPanel
            v-if="connectionResult"
            title="Résultat et diagnostic de connexion"
            :value="connectionResult"
            :collapsed="false"
          />
        </div>
      </PlaygroundPanel>

      <PlaygroundPanel
        title="2. Tester une session locale"
        description="Utilisez le champ d’identification déclaré par la configuration du module, puis contrôlez la restauration et la fermeture de session."
      >
        <div class="nfz-form-stack">
          <div class="nfz-form-grid">
            <label>
              Champ d’identification
              <select v-model="localIdentifierField">
                <option v-for="option in localIdentifierOptions" :key="option" :value="option">
                  {{ option }}
                </option>
              </select>
            </label>
            <label>
              Identifiant
              <input v-model.trim="localIdentifier" autocomplete="username" placeholder="test ou adresse de connexion">
            </label>
            <label>
              Mot de passe
              <input v-model="localPassword" type="password" autocomplete="current-password" placeholder="Mot de passe">
            </label>
            <button class="nfz-button nfz-button--primary" type="button" :disabled="authLoading" @click="authLocal">
              {{ authLoading ? 'Connexion…' : 'Ouvrir la session locale' }}
            </button>
          </div>

          <div class="nfz-actions">
            <button class="nfz-button" type="button" :disabled="authLoading" @click="reauth">
              Restaurer la session
            </button>
            <button class="nfz-button nfz-button--danger" type="button" :disabled="authLoading" @click="logout">
              Fermer la session
            </button>
          </div>

          <p v-if="authError" class="nfz-alert nfz-alert--danger">{{ authError }}</p>
          <p v-else-if="authResult?.ok" class="nfz-alert nfz-alert--success">
            L’opération d’authentification s’est terminée correctement.
          </p>

          <PlaygroundJsonPanel
            v-if="authResult"
            title="Résultat de l’authentification"
            :value="authResult"
            :collapsed="false"
          />
        </div>
      </PlaygroundPanel>

      <PlaygroundPanel
        v-if="isKeycloak"
        title="3. Tester le flux Keycloak"
        description="Déclenchez le SSO, vérifiez le profil retourné et contrôlez le renouvellement du token."
      >
        <div class="nfz-form-stack">
          <div class="nfz-actions">
            <button class="nfz-button nfz-button--primary" type="button" :disabled="ssoLoading" @click="ssoLogin">Connexion SSO</button>
            <button class="nfz-button" type="button" :disabled="ssoLoading" @click="ssoWhoami">Lire le profil</button>
            <button class="nfz-button" type="button" :disabled="ssoLoading" @click="ssoUpdateToken">Renouveler le token</button>
            <button class="nfz-button nfz-button--danger" type="button" :disabled="ssoLoading" @click="ssoLogout">Déconnexion SSO</button>
          </div>

          <p v-if="ssoError" class="nfz-alert nfz-alert--danger">{{ ssoError }}</p>
          <PlaygroundJsonPanel
            title="État Keycloak"
            :value="{
              authenticated: keycloak?.authenticated,
              user: authUserSnapshot,
              tokenPreview,
              tokenParsed: keycloak?.tokenParsed,
              result: ssoResult,
            }"
            :collapsed="false"
          />
        </div>
      </PlaygroundPanel>

      <PlaygroundPanel
        title="Options avancées"
        description="Ces outils servent aux scénarios JWT stocké, payload Keycloak et aux diagnostics de configuration distante."
      >
        <div class="nfz-grid nfz-grid--2">
          <div v-if="mode === 'remote'" class="nfz-form-stack">
            <h3>Token stocké</h3>
            <label>
              Clé de stockage
              <input :value="storageKey" disabled>
            </label>
            <label>
              Token
              <input v-model="storedToken" type="password" placeholder="JWT à écrire dans localStorage">
            </label>
            <div class="nfz-actions">
              <button class="nfz-button" type="button" @click="readStoredToken">Relire</button>
              <button class="nfz-button" type="button" @click="writeStoredToken">Écrire</button>
              <button class="nfz-button nfz-button--danger" type="button" @click="clearStoredToken">Supprimer</button>
            </div>
          </div>

          <div class="nfz-form-stack">
            <h3>Authentification par token</h3>
            <label>
              Stratégie
              <input v-model.trim="tokenStrategy" placeholder="jwt ou keycloak">
            </label>
            <label>
              Champ du token
              <input v-model.trim="tokenField" placeholder="accessToken ou access_token">
            </label>
            <label>
              Valeur
              <input v-model="tokenValue" type="password" placeholder="Token à transmettre">
            </label>
            <button class="nfz-button" type="button" :disabled="authLoading" @click="authToken">
              Envoyer le payload
            </button>
          </div>
        </div>
      </PlaygroundPanel>

      <div class="nfz-grid nfz-grid--2">
        <PlaygroundJsonPanel
          title="Configuration publique du client"
          :value="publicClient"
        />
        <PlaygroundJsonPanel
          title="Résumé du scénario"
          :value="{
            scenarioId,
            title,
            provider: authProviderLabel,
            authenticated,
            user: authUserSnapshot,
            storageKey,
            storedTokenPreview: storedToken ? `${storedToken.slice(0, 24)}${storedToken.length > 24 ? '…' : ''}` : '',
            embeddedMongoMode,
            embeddedMongoEnabled,
          }"
        />
      </div>
    </div>
  </ClientOnly>
</template>
