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
  <div style="padding:16px; max-width:1100px; margin:0 auto; display:grid; gap:16px;">
    <div>
      <h1>Middleware / Modules / Hooks</h1>
      <p>Validation de l’ordre de chargement serveur : modules pre → plugins → services → modules post.</p>
    </div>
    <pre style="white-space: pre-wrap">{{ checks }}</pre>
  </div>
</template>
