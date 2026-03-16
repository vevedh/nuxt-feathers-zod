<script setup lang="ts">
definePageMeta({ ssr: false })
const nuxtApp = useNuxtApp() as any
const config = useRuntimeConfig()
const { publicClient, scenarioId, title } = usePlaygroundScenario()
const api = nuxtApp.$api
const feathersClient = nuxtApp.$feathersClient || nuxtApp.$client || api
const mounted = ref(false)
onMounted(() => { mounted.value = true })
const socket = computed(() => (feathersClient as any)?.io || (feathersClient as any)?.settings?.socket || (feathersClient as any)?.get?.('socket'))
const transport = computed(() => (feathersClient as any)?.get?.('transport') || publicClient.value?.remote?.transport || 'socketio')
const state = computed(() => ({
  scenarioId: scenarioId.value,
  title: title.value,
  apiType: mounted.value ? (api === feathersClient ? 'feathers-client' : 'pinia-client') : 'pending-client-mount',
  transport: transport.value,
  socketCreated: mounted.value ? !!socket.value : false,
  socketConnected: mounted.value ? Boolean((socket.value as any)?.connected) : false,
  socketDisconnected: mounted.value ? Boolean((socket.value as any)?.disconnected) : false,
  remote: publicClient.value?.remote,
}))
</script>

<template>
  <div style="padding:16px; max-width:1100px; margin:0 auto; display:grid; gap:16px;">
    <div>
      <h1>Remote — Socket.IO</h1>
      <p>Page de validation du scénario prioritaire <code>remote + socketio</code>.</p>
      <p><NuxtLink to="/tests">Ouvrir la page de tests détaillés</NuxtLink></p>
    </div>
    <div>
      <h2>État du client</h2>
      <ClientOnly><pre style="white-space: pre-wrap">{{ state }}</pre><template #fallback><pre style="white-space: pre-wrap">client state pending mount…</pre></template></ClientOnly>
    </div>
    <div>
      <h2>Runtime remote</h2>
      <pre style="white-space: pre-wrap">{{ publicClient }}</pre>
    </div>
  </div>
</template>
