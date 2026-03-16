<script setup lang="ts">
definePageMeta({ ssr: false })
const config = useRuntimeConfig()
const { publicClient, scenarioId, title } = usePlaygroundScenario()
const service = ref('users')
const baseUrl = computed(() => {
  const remote = (publicClient.value as any)?.remote || {}
  const raw = String(remote?.url || '')
  const restPath = String(remote?.restPath || '')
  try {
    const u = new URL(raw)
    const origin = u.origin
    const prefix = u.pathname && u.pathname !== '/' ? u.pathname.replace(/\/$/, '') : ''
    const rp = !restPath || restPath === '/' ? '' : (restPath.startsWith('/') ? restPath.replace(/\/$/, '') : `/${restPath.replace(/\/$/, '')}`)
    return `${origin}${prefix}${rp}`.replace(/\/$/, '')
  } catch {
    return raw.replace(/\/$/, '')
  }
})
const endpointUrl = computed(() => `${baseUrl.value}/${encodeURIComponent(service.value)}`)
</script>

<template>
  <div style="padding:16px; max-width:1100px; margin:0 auto; display:grid; gap:16px;">
    <div>
      <h1>Remote — REST</h1>
      <p>Page de validation REST brute. À utiliser pour comparer <code>fetch()</code> et client Feathers.</p>
      <p><NuxtLink to="/tests">Ouvrir la page de tests détaillés</NuxtLink></p>
    </div>
    <div>
      <h2>État</h2>
      <pre style="white-space: pre-wrap">{{ { scenarioId, title, endpointUrl, publicClient } }}</pre>
    </div>
  </div>
</template>
