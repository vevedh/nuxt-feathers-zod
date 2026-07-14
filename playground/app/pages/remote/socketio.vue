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
  <div class="nfz-page">
    <PlaygroundPageHeader
      eyebrow="Transport distant"
      title="Socket.IO"
      description="Contrôlez la création du socket, son état de connexion, le transport sélectionné et la configuration distante."
    >
      <template #actions><NuxtLink to="/tests" class="nfz-button nfz-button--primary">Tester un service</NuxtLink></template>
    </PlaygroundPageHeader>
    <ClientOnly>
      <div class="nfz-grid nfz-grid--3">
        <article class="nfz-stat-card"><span>Transport</span><strong>{{ state.transport }}</strong><small>{{ state.apiType }}</small></article>
        <article class="nfz-stat-card"><span>Socket</span><strong>{{ state.socketCreated ? 'Créé' : 'Absent' }}</strong><small>Création du client</small></article>
        <article class="nfz-stat-card"><span>Connexion</span><strong>{{ state.socketConnected ? 'Connecté' : 'Déconnecté' }}</strong><small>État temps réel</small></article>
      </div>
      <template #fallback><p class="nfz-alert">Initialisation du client Socket.IO…</p></template>
    </ClientOnly>
    <div class="nfz-grid nfz-grid--2">
      <PlaygroundJsonPanel title="État du client" :value="state" :collapsed="false" />
      <PlaygroundJsonPanel title="Configuration distante" :value="publicClient" />
    </div>
  </div>
</template>
