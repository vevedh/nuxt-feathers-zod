<script setup lang="ts">
const config = useRuntimeConfig()
const { title, scenarioId, clientMode, embeddedMongoEnabled, embeddedMongoMode } = usePlaygroundScenario()
const publicPlayground = computed(() => (config.public as any)?.nfzPlayground ?? {})
const basePath = computed(() => {
  const raw = String(publicPlayground.value?.embeddedMongoManagementBasePath || '/mongo').trim()
  const collapsed = raw.replace(/\/+/g, '/').replace(/\/{2,}/g, '/')
  const withLeadingSlash = collapsed.startsWith('/') ? collapsed : `/${collapsed}`
  return withLeadingSlash.length > 1 ? withLeadingSlash.replace(/\/$/, '') : withLeadingSlash
})
const restPath = computed(() => String(((config.public as any)?._feathers?.transports?.rest?.path) || '/feathers'))
const apiRoot = computed(() => `${restPath.value}${basePath.value}`)
const currentDb = ref('app')
const currentCollection = ref('messages')
const loading = ref(false)
const result = ref<any>(null)
const error = ref<string | null>(null)

const routes = computed(() => [
  { label: 'databases', path: `${apiRoot.value}/databases` },
  { label: 'collections', path: `${apiRoot.value}/${currentDb.value}/collections` },
  { label: 'stats', path: `${apiRoot.value}/${currentDb.value}/stats` },
  { label: 'indexes', path: `${apiRoot.value}/${currentDb.value}/${currentCollection.value}/indexes` },
  { label: 'count', path: `${apiRoot.value}/${currentDb.value}/${currentCollection.value}/count` },
  { label: 'schema', path: `${apiRoot.value}/${currentDb.value}/${currentCollection.value}/schema` },
  { label: 'documents', path: `${apiRoot.value}/${currentDb.value}/${currentCollection.value}/documents` },
  { label: 'aggregate', path: `${apiRoot.value}/${currentDb.value}/${currentCollection.value}/aggregate` },
])

async function fetchRoute(path: string) {
  loading.value = true
  error.value = null
  result.value = null
  try {
    const response = await fetch(path)
    const text = await response.text()
    let parsed: any = text
    try {
      parsed = text ? JSON.parse(text) : null
    }
    catch {}
    result.value = {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      path,
      data: parsed,
    }
    if (!response.ok)
      error.value = `${response.status} ${response.statusText}`
  }
  catch (err: any) {
    error.value = err?.message || String(err)
    result.value = { ok: false, path, error: error.value }
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div style="padding:16px;max-width:1100px;margin:0 auto;display:grid;gap:18px;">
    <div>
      <h1>Mongo management playground</h1>
      <p>Scénario détecté : <strong>{{ title }}</strong> (<code>{{ scenarioId }}</code>)</p>
      <p>Mode client : <code>{{ clientMode }}</code> — Mongo activé : <code>{{ embeddedMongoEnabled }}</code> — mode : <code>{{ embeddedMongoMode }}</code></p>
      <p>REST : <code>{{ restPath }}</code> · Base Mongo : <code>{{ basePath }}</code></p>
      <p><NuxtLink to="/tests">Tests</NuxtLink> · <NuxtLink to="/validation">Validation</NuxtLink> · <NuxtLink to="/embedded">Embedded</NuxtLink></p>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;">
      <label style="display:grid;gap:6px;">
        <span>Database</span>
        <input v-model="currentDb" type="text" style="padding:8px;border:1px solid #ccc;border-radius:8px;">
      </label>
      <label style="display:grid;gap:6px;">
        <span>Collection</span>
        <input v-model="currentCollection" type="text" style="padding:8px;border:1px solid #ccc;border-radius:8px;">
      </label>
    </div>

    <div style="display:grid;gap:12px;">
      <div v-for="route in routes" :key="route.label" style="border:1px solid #ddd;border-radius:12px;padding:12px;display:grid;gap:8px;">
        <strong>{{ route.label }}</strong>
        <code>{{ route.path }}</code>
        <button type="button" :disabled="loading" style="width:max-content;padding:8px 12px;border-radius:8px;border:1px solid #bbb;cursor:pointer;" @click="fetchRoute(route.path)">
          {{ loading ? 'Chargement…' : `Tester ${route.label}` }}
        </button>
      </div>
    </div>

    <div v-if="error" style="color:#991b1b;"><strong>Erreur:</strong> {{ error }}</div>
    <pre v-if="result" style="white-space:pre-wrap;border:1px solid #ddd;border-radius:12px;padding:16px;">{{ result }}</pre>
  </div>
</template>
