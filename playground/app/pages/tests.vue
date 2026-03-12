<script setup lang="ts">
definePageMeta({ ssr: false })
// IMPORTANT (dual-mode): in remote mode, feathers-pinia can throw while mapping
// network/CORS/cert errors (because the response is missing). For diagnostics we
// want the *raw* Feathers client injected by the module, not the Pinia wrapper.
const nuxtApp = useNuxtApp() as any
const client: any = nuxtApp.$client || nuxtApp.$feathersClient || nuxtApp.$api
const config = useRuntimeConfig()

// Unified auth (supports: keycloak | local | remote | none)
const auth = useAuth()
const { scenarioId, title, embeddedMongoMode } = usePlaygroundScenario()
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

async function testConnection() {
  connectionLoading.value = true
  connectionError.value = null
  connectionResult.value = null

  try {
    const svc: any = client.service(pingService.value)
    // A lightweight call that works for most standard services
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

    // Extra diagnostics for remote REST mode: try a raw fetch to see what the server returns
    try {
      if (mode.value === 'remote' && publicClient.value?.remote?.transport === 'rest') {
        const base = String(publicClient.value?.remote?.url || '')
        const restPath = String(publicClient.value?.remote?.restPath || '')
        const url = new URL(base)
        const originOnly = url.origin
        const prefix = (url.pathname && url.pathname !== '/') ? url.pathname : ''

        const restPrefix = restPath.startsWith('/') ? restPath : `/${restPath}`
        const root = (originOnly + (prefix || '') + restPrefix).replace(/\/+$/, '')
        const full = `${root}/${encodeURIComponent(pingService.value)}?$limit=1`

        const r = await fetch(full, { method: 'GET' })
        const ct = r.headers.get('content-type') || ''
        const text = await r.text()
        connectionResult.value.debugRestFetch = {
          url: full,
          status: r.status,
          statusText: r.statusText,
          contentType: ct,
          bodyPreview: text.slice(0, 600),
        }
      }
    }
    catch (e2: any) {
      connectionResult.value.debugRestFetch = {
        ok: false,
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
const localIdentifier = ref('')
const localPassword = ref('')

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
      provider: auth.provider.value,
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
</script>

<template>
  <ClientOnly>
  <div style="padding: 16px; max-width: 980px">
    <h1>NFZ Playground — Connection & Auth tests</h1>

    <p>
      Scenario: <strong>{{ title }}</strong> (<code>{{ scenarioId }}</code>)
    </p>

    <p>
      Mongo mode: <code>{{ embeddedMongoMode }}</code>
    </p>

    <p>
      This page is designed to validate the <strong>dual-mode client</strong> behavior:
      <code>embedded</code> vs <code>remote</code>.
    </p>

    <h2 style="margin-top: 18px">Runtime config (public)</h2>
    <pre style="white-space: pre-wrap">{{ publicClient }}</pre>

    <h2 style="margin-top: 18px">Scenario diagnostics</h2>
    <pre style="white-space: pre-wrap">{{ {
      scenarioId,
      title,
      provider: auth.provider,
      authenticated: auth.isAuthenticated,
      user: auth.user,
      storageKey,
      storedTokenPreview: storedToken ? storedToken.slice(0, 24) + (storedToken.length > 24 ? '…' : '') : '',
      embeddedMongoMode,
      embeddedMongoEnabled,
    } }}</pre>

    <div v-if="mode === 'remote'" style="display: grid; gap: 10px; max-width: 920px; margin-top: 12px;">
      <h3 style="margin: 0">JWT storage helper</h3>
      <p style="margin: 0">Utile pour valider le scénario <code>remote + Socket.IO + JWT stocké</code>.</p>
      <div style="display: grid; grid-template-columns: 160px 1fr; gap: 10px; align-items: center;">
        <label>Storage key</label>
        <input :value="storageKey" disabled style="width: 100%">
        <label>Stored token</label>
        <input v-model="storedToken" type="password" placeholder="JWT à injecter dans localStorage" style="width: 100%">
      </div>
      <div style="display: flex; gap: 12px; flex-wrap: wrap;">
        <button @click="readStoredToken">Read storage</button>
        <button @click="writeStoredToken">Write storage</button>
        <button @click="clearStoredToken">Clear storage</button>
      </div>
    </div>

    <hr style="margin: 18px 0">

    <h2>1) Connection test (service find)</h2>

    <p>
      Pick a service path and run a lightweight <code>find({ $limit: 1 })</code>.
      In <code>remote</code> mode, the default list comes from <code>feathers.client.remote.services</code>.
    </p>

    <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap">
      <label>
        Service:
        <select v-model="pingService">
          <option v-for="s in serviceCandidates" :key="s" :value="s">
            {{ s }}
          </option>
        </select>
      </label>

      <button :disabled="connectionLoading" @click="testConnection">
        {{ connectionLoading ? 'Testing…' : 'Test connection' }}
      </button>
    </div>

    <p v-if="connectionError" style="margin-top: 12px; color: #b91c1c">
      Error: {{ connectionError }}
    </p>

    <div v-if="connectionResult" style="margin-top: 12px">
      <pre style="white-space: pre-wrap">{{ connectionResult }}</pre>
    </div>

    <hr style="margin: 18px 0">

    <h2>2) Authentication tests</h2>

    <p>
      Auth service path: <code>{{ authServicePath }}</code>
    </p>

    <h3 style="margin-top: 14px">2.a) Local auth (strategy: local)</h3>
    <div style="display: grid; grid-template-columns: 200px 1fr; gap: 10px; max-width: 720px">
      <label>
        Identifier field
        <select v-model="localIdentifierField" style="width: 100%">
          <option v-for="opt in localIdentifierOptions" :key="opt" :value="opt">{{ opt }}</option>
        </select>
      </label>
      <input v-model="localIdentifier" placeholder="identifier" style="width: 100%">

      <label>Password</label>
      <input v-model="localPassword" type="password" placeholder="password" style="width: 100%">

      <div></div>
      <button :disabled="authLoading" @click="authLocal">
        {{ authLoading ? '…' : 'Login local' }}
      </button>
    </div>

    <h3 style="margin-top: 14px">2.b) Token payload auth (jwt / keycloak / …)</h3>

    <div style="display: grid; grid-template-columns: 200px 1fr; gap: 10px; max-width: 720px">
      <label>Strategy</label>
      <input v-model="tokenStrategy" placeholder="jwt / keycloak" style="width: 100%">

      <label>Token field</label>
      <input v-model="tokenField" placeholder="accessToken / access_token" style="width: 100%">

      <label>Token value</label>
      <input v-model="tokenValue" type="password" placeholder="token" style="width: 100%">

      <div></div>
      <button :disabled="authLoading" @click="authToken">
        {{ authLoading ? '…' : 'Login with token payload' }}
      </button>
    </div>

    <h3 style="margin-top: 14px">2.c) Session utilities</h3>
    <div style="display: flex; gap: 12px; flex-wrap: wrap">
      <button :disabled="authLoading" @click="reauth">
        {{ authLoading ? '…' : 'reAuthenticate()' }}
      </button>
      <button :disabled="authLoading" @click="logout">
        {{ authLoading ? '…' : 'logout()' }}
      </button>
    </div>

    <h3 v-if="isKeycloak" style="margin-top: 14px">2.d) Keycloak SSO (interactive)</h3>

    <div v-if="isKeycloak" style="max-width: 900px">
      <p>
        Provider: <code>{{ auth.provider }}</code> — authenticated: <code>{{ auth.isAuthenticated }}</code>
      </p>

      <div style="display: flex; gap: 12px; flex-wrap: wrap">
        <button :disabled="ssoLoading" @click="ssoLogin">
          {{ ssoLoading ? '…' : 'Login (redirect)' }}
        </button>
        <button :disabled="ssoLoading" @click="ssoWhoami">
          {{ ssoLoading ? '…' : 'whoami()' }}
        </button>
        <button :disabled="ssoLoading" @click="ssoUpdateToken">
          {{ ssoLoading ? '…' : 'updateToken(30s)' }}
        </button>
        <button :disabled="ssoLoading" @click="ssoLogout">
          {{ ssoLoading ? '…' : 'Logout (redirect)' }}
        </button>
      </div>

      <p v-if="ssoError" style="margin-top: 12px; color: #b91c1c">
        Error: {{ ssoError }}
      </p>

      <div style="margin-top: 12px">
        <h4 style="margin: 0">Keycloak snapshot</h4>
        <pre style="white-space: pre-wrap">{{ {
          authenticated: keycloak?.authenticated,
          user: auth.user,
          tokenPreview: tokenPreview.value,
          tokenParsed: keycloak?.tokenParsed,
        } }}</pre>
      </div>

      <div v-if="ssoResult" style="margin-top: 12px">
        <pre style="white-space: pre-wrap">{{ ssoResult }}</pre>
      </div>
    </div>

    <p v-if="authError" style="margin-top: 12px; color: #b91c1c">
      Error: {{ authError }}
    </p>

    <div v-if="authResult" style="margin-top: 12px">
      <pre style="white-space: pre-wrap">{{ authResult }}</pre>
    </div>

    <hr style="margin: 18px 0">

    <h3 style="margin-top: 14px">Tips</h3>
    <ul>
      <li>
        In <code>remote</code> mode with Socket.IO, failures can come from CORS / reverse-proxy / wrong <code>NFZ_REMOTE_WS_PATH</code>.
      </li>
      <li>
        If token payload auth fails, verify server expects <code>strategy</code> and the right token field name.
      </li>
    </ul>
  </div>
  </ClientOnly>
</template>
