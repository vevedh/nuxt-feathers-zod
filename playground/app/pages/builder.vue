<script setup lang="ts">
definePageMeta({ ssr: false })

const diagnostics = useAuthDiagnostics({ stableUntilMounted: true })
const trace = useAuthTrace()
const builder = useBuilderClient()

const loading = ref(false)
const result = ref<any>(null)
const error = ref<string | null>(null)
const selectedService = ref('users')

const builderAuthRequired = computed(() => Boolean(builder.builder?.auth?.authenticate || builder.builder?.auth?.enabled))
const page = useProtectedPage({
  auth: builderAuthRequired.value ? 'required' : 'optional',
  validateBearer: true,
  reason: 'playground-builder',
  stableUntilMounted: true,
})

const routes = computed(() => {
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
  basePath: builder.builder?.basePath || '/api/nfz',
  routes: routes.value.length,
}))

async function run(label: string, fn: () => Promise<any>) {
  loading.value = true
  error.value = null
  result.value = null

  try {
    await page.ensure()
    if (builderAuthRequired.value && !page.authorized.value)
      throw new Error('Builder routes are protected and the current session is not authorized yet')

    const data = await fn()
    result.value = {
      ok: true,
      label,
      snapshot: snapshot.value,
      data,
      diagnostics: diagnostics.value,
      latestEvent: trace.value.latest,
    }
  }
  catch (err: any) {
    error.value = err?.message || String(err)
    result.value = {
      ok: false,
      label,
      snapshot: snapshot.value,
      error: error.value,
      diagnostics: diagnostics.value,
      latestEvent: trace.value.latest,
    }
  }
  finally {
    loading.value = false
  }
}

async function fetchServices() {
  await run('getServices', () => builder.getServices())
}

async function fetchManifest() {
  await run('getManifest', () => builder.getManifest())
}

async function fetchSchema() {
  await run('getSchema', () => builder.getSchema(selectedService.value))
}

const previewPayload = computed(() => ({
  service: selectedService.value,
  mode: 'playground-preview',
}))

async function preview() {
  await run('preview', () => builder.preview(previewPayload.value))
}
</script>

<template>
  <div class="builder-page">
    <h1>Builder validation playground</h1>
    <p>
      This page validates the <code>useBuilderClient()</code> + <code>useProtectedPage()</code>
      contract for Builder Studio routes.
    </p>

    <div class="card-grid">
      <section class="card">
        <h2>Runtime snapshot</h2>
        <ul>
          <li><strong>Base path:</strong> {{ snapshot.basePath }}</li>
          <li><strong>Auth required:</strong> {{ snapshot.authRequired ? 'yes' : 'no' }}</li>
          <li><strong>Provider:</strong> {{ page.auth.provider }}</li>
          <li><strong>Authenticated:</strong> {{ page.auth.authenticated ? 'yes' : 'no' }}</li>
          <li><strong>Display state:</strong> {{ page.displayState }}</li>
        </ul>
      </section>

      <section class="card">
        <h2>Builder routes</h2>
        <ul>
          <li v-for="route in routes" :key="`${route.method}:${route.path}`">
            <code>{{ route.method }}</code> <code>{{ route.path }}</code>
            <span v-if="route.key"> — {{ route.key }}</span>
          </li>
        </ul>
      </section>
    </div>

    <section class="card controls">
      <h2>Validation actions</h2>
      <div class="controls-row">
        <button :disabled="loading" @click="fetchServices">GET services</button>
        <button :disabled="loading" @click="fetchManifest">GET manifest</button>
        <input v-model="selectedService" type="text" placeholder="users" />
        <button :disabled="loading" @click="fetchSchema">GET schema</button>
        <button :disabled="loading" @click="preview">POST preview</button>
      </div>
      <p class="hint">
        The page stays auth-aware even if the actual Builder endpoints are not implemented by the current app.
      </p>
    </section>

    <section class="card output">
      <h2>Last result</h2>
      <p v-if="loading">Loading…</p>
      <p v-else-if="error" class="error">{{ error }}</p>
      <pre v-if="result">{{ JSON.stringify(result, null, 2) }}</pre>
      <p v-else>No request executed yet.</p>
    </section>
  </div>
</template>

<style scoped>
.builder-page {
  display: grid;
  gap: 16px;
  padding: 24px;
}
.card-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}
.card {
  border: 1px solid #d1d5db;
  border-radius: 12px;
  padding: 16px;
  background: #fff;
}
.controls-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}
.controls-row input {
  min-width: 180px;
  padding: 8px 10px;
}
.controls-row button {
  padding: 8px 12px;
}
.hint {
  margin-top: 12px;
  opacity: 0.75;
}
.output pre {
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 420px;
  overflow: auto;
  background: #111827;
  color: #f9fafb;
  padding: 12px;
  border-radius: 10px;
}
.error {
  color: #b91c1c;
}
</style>
