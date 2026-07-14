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
  <div class="nfz-page">
    <PlaygroundPageHeader
      eyebrow="Transport distant"
      title="REST"
      description="Comparez l’endpoint HTTP calculé, une requête fetch brute et l’appel réalisé par le client Feathers."
    >
      <template #actions><NuxtLink to="/tests" class="nfz-button nfz-button--primary">Lancer le test REST</NuxtLink></template>
    </PlaygroundPageHeader>
    <PlaygroundPanel title="Endpoint à tester" description="Modifiez le service puis ouvrez la page de tests détaillés pour exécuter la requête.">
      <label>
        Service
        <input v-model.trim="service" placeholder="users">
      </label>
      <p class="nfz-alert"><code>{{ endpointUrl }}</code></p>
    </PlaygroundPanel>
    <PlaygroundJsonPanel title="Configuration REST résolue" :value="{ scenarioId, title, endpointUrl, publicClient }" :collapsed="false" />
  </div>
</template>
