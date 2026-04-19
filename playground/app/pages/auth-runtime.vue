<script setup lang="ts">
definePageMeta({ ssr: false })

const authFacade = useAuth()
const auth = useAuthRuntime()
const diagnostics = useAuthDiagnostics({ stableUntilMounted: true })
const trace = useAuthTrace()
const bridge = useKeycloakBridge()
const { title, scenarioId, clientMode } = usePlaygroundScenario()
const page = useProtectedPage({
  auth: 'optional',
  validateBearer: true,
  reason: 'playground-auth-runtime',
  stableUntilMounted: true,
})

const busy = ref(false)
const actionError = ref<string | null>(null)

const latestEvents = computed(() => trace.value.items.slice(0, 12))
const anonymousHint = computed(() => {
  if (diagnostics.value.status === 'anonymous' && !diagnostics.value.authenticated && !diagnostics.value.hasAccessToken)
    return 'Aucun token stocké : état anonyme normal tant qu’aucune session locale/SSO n’a encore été créée.'
  return null
})

async function runAction(label: string, task: () => Promise<any>) {
  busy.value = true
  actionError.value = null
  try {
    await task()
  }
  catch (error: any) {
    actionError.value = error?.message || String(error)
    console.warn(`[playground/auth-runtime] ${label} failed`, error)
  }
  finally {
    busy.value = false
  }
}

onMounted(async () => {
  await runAction('init', async () => {
    await authFacade.init()
    await page.ensure()
  })
})
</script>

<template>
  <div style="padding:16px;max-width:1100px;margin:0 auto;display:grid;gap:18px;">
    <div>
      <h1>Auth runtime playground</h1>
      <p>Scénario détecté : <strong>{{ title }}</strong> (<code>{{ scenarioId }}</code>)</p>
      <p>Mode client : <code>{{ clientMode }}</code></p>
      <p>
        <NuxtLink to="/">Accueil</NuxtLink>
        · <NuxtLink to="/tests">Tests</NuxtLink>
        · <NuxtLink to="/mongo">Mongo</NuxtLink>
      </p>
    </div>

    <div style="display:flex;flex-wrap:wrap;gap:8px;">
      <button type="button" :disabled="busy" @click="runAction('init', () => authFacade.init())">Init</button>
      <button type="button" :disabled="busy" @click="runAction('ensureReady', () => auth.ensureReady('playground-auth-runtime:button'))">ensureReady</button>
      <button type="button" :disabled="busy" @click="runAction('reAuthenticate', () => auth.reAuthenticate())">reAuthenticate</button>
      <button v-if="auth.provider.value === 'keycloak'" type="button" :disabled="busy" @click="runAction('bridge', () => bridge.ensureSynchronized('playground-auth-runtime:button'))">Keycloak bridge</button>
      <button v-if="auth.provider.value === 'keycloak'" type="button" :disabled="busy" @click="runAction('validateBearer', () => auth.ensureValidatedBearer('playground-auth-runtime:button'))">validate bearer</button>
      <button type="button" :disabled="busy" @click="auth.clearEvents()">Clear events</button>
      <button type="button" :disabled="busy" @click="auth.resetDiagnostics()">Reset diagnostics</button>
    </div>

    <p v-if="actionError" style="color:#991b1b;"><strong>Erreur:</strong> {{ actionError }}</p>
    <p v-else-if="anonymousHint" style="color:#334155;"><strong>Info:</strong> {{ anonymousHint }}</p>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
      <div style="border:1px solid #ddd;border-radius:12px;padding:12px;">
        <strong>Provider</strong>
        <div><code>{{ diagnostics.provider }}</code></div>
      </div>
      <div style="border:1px solid #ddd;border-radius:12px;padding:12px;">
        <strong>Status</strong>
        <ClientOnly><div><code>{{ diagnostics.status }}</code></div><template #fallback><div><code>idle</code></div></template></ClientOnly>
      </div>
      <div style="border:1px solid #ddd;border-radius:12px;padding:12px;">
        <strong>Authenticated</strong>
        <ClientOnly><div><code>{{ diagnostics.authenticated }}</code></div><template #fallback><div><code>false</code></div></template></ClientOnly>
      </div>
      <div style="border:1px solid #ddd;border-radius:12px;padding:12px;">
        <strong>Token source</strong>
        <ClientOnly><div><code>{{ diagnostics.tokenSource }}</code></div><template #fallback><div><code>none</code></div></template></ClientOnly>
      </div>
      <div style="border:1px solid #ddd;border-radius:12px;padding:12px;">
        <strong>Protected page</strong>
        <div><code>{{ { ready: page.ready, authorized: page.authorized, pending: page.pending, hydrated: page.hydrated, displayState: page.displayState } }}</code></div>
      </div>
      <div style="border:1px solid #ddd;border-radius:12px;padding:12px;">
        <strong>Client sync</strong>
        <ClientOnly><div><code>{{ diagnostics.clientSync }}</code></div><template #fallback><div><code>{{ { api: 'idle', client: 'idle', feathersClient: 'idle' } }}</code></div></template></ClientOnly>
      </div>
    </div>

    <div style="display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));">
      <div style="border:1px solid #ddd;border-radius:12px;padding:16px;">
        <h3 style="margin-top:0;">Diagnostics snapshot</h3>
        <ClientOnly><pre style="white-space:pre-wrap;">{{ diagnostics }}</pre><template #fallback><pre style="white-space:pre-wrap;">{{ { hydrationState: 'stable-until-mounted', provider: 'local', status: 'idle', authenticated: false, tokenSource: 'none' } }}</pre></template></ClientOnly>
      </div>
      <div style="border:1px solid #ddd;border-radius:12px;padding:16px;">
        <h3 style="margin-top:0;">Latest auth events</h3>
        <ClientOnly><pre style="white-space:pre-wrap;">{{ latestEvents }}</pre><template #fallback><pre style="white-space:pre-wrap;">[]</pre></template></ClientOnly>
      </div>
    </div>
  </div>
</template>
