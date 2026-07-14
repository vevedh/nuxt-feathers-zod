<script setup lang="ts">
const config = useRuntimeConfig()
const runtime = computed(() => (config.public as any)?._feathers || {})
const server = computed(() => runtime.value?.server || {})
const checks = computed(() => ({
  loadOrder: server.value?.loadOrder || ['modules:pre', 'plugins', 'services', 'modules:post'],
  pluginDirs: server.value?.pluginDirs,
  moduleDirs: server.value?.moduleDirs,
  servicesDirs: runtime.value?.servicesDirs,
}))
</script>

<template>
  <div class="nfz-page">
    <PlaygroundPageHeader
      eyebrow="Cycle serveur"
      title="Modules, plugins et hooks"
      description="Vérifiez l’ordre de chargement appliqué avant que l’instance Feathers soit déclarée prête."
    />
    <PlaygroundPanel title="Ordre résolu" description="Le runtime doit charger les modules pre, les plugins, les services puis les modules post.">
      <div class="nfz-feature-grid">
        <div v-for="(step, index) in checks.loadOrder" :key="step" class="nfz-feature-card">
          <span class="nfz-feature-card__icon">{{ index + 1 }}</span>
          <span class="nfz-feature-card__content"><strong class="nfz-feature-card__title">{{ step }}</strong><span class="nfz-feature-card__description">Étape {{ index + 1 }} du bootstrap serveur</span></span>
        </div>
      </div>
    </PlaygroundPanel>
    <PlaygroundJsonPanel title="Répertoires et configuration" :value="checks" :collapsed="false" />
  </div>
</template>
