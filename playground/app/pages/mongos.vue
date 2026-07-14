<script setup lang="ts">
const params = computed(() => ({ query: {} }))
const mongo = useService('mongos').useFind<Mongo>(params, { paginateOn: 'hybrid' })
</script>

<template>
  <div class="nfz-page">
    <PlaygroundPageHeader
      eyebrow="Pinia + Feathers"
      title="Service mongos"
      description="Contrôle minimal du composable useService() et de la pagination hybride."
    />
    <div class="nfz-grid nfz-grid--2">
      <article class="nfz-stat-card"><span>Total</span><strong>{{ mongo.total }}</strong><small>Documents disponibles</small></article>
      <article class="nfz-stat-card"><span>Premier texte</span><strong>{{ mongo.data[0]?.text || 'Aucune donnée' }}</strong><small>Lecture réactive</small></article>
    </div>
    <PlaygroundJsonPanel title="Données du store" :value="mongo.data" :collapsed="false" />
  </div>
</template>
