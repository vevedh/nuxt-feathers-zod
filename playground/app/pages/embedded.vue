<script setup lang="ts">
const config = useRuntimeConfig()
const { publicClient, clientMode, embeddedMongoEnabled, embeddedMongoMode } = usePlaygroundScenario()
</script>

<template>
  <div class="nfz-page">
    <PlaygroundPageHeader
      eyebrow="Backend intégré"
      title="Mode embedded"
      description="Contrôlez le client local, les services générés, la base MongoDB éventuelle et le backend Feathers hébergé par Nitro."
    >
      <template #actions><NuxtLink to="/tests" class="nfz-button nfz-button--primary">Tester les services</NuxtLink></template>
    </PlaygroundPageHeader>
    <div class="nfz-grid nfz-grid--3">
      <article class="nfz-stat-card"><span>Mode client</span><strong>{{ clientMode }}</strong><small>Attendu : embedded</small></article>
      <article class="nfz-stat-card"><span>MongoDB</span><strong>{{ embeddedMongoMode }}</strong><small>{{ embeddedMongoEnabled ? 'Activé' : 'Désactivé' }}</small></article>
      <article class="nfz-stat-card"><span>Backend</span><strong>Nitro + Feathers</strong><small>Instance runtime default</small></article>
    </div>
    <PlaygroundJsonPanel title="Configuration embedded" :value="{ clientMode, embeddedMongoEnabled, embeddedMongoMode, publicClient }" :collapsed="false" />
  </div>
</template>
