<script setup lang="ts">
const config = useRuntimeConfig()
const { publicClient, clientMode, embeddedMongoEnabled, embeddedMongoMode } = usePlaygroundScenario()
</script>

<template>
  <div style="padding:16px; max-width:1100px; margin:0 auto; display:grid; gap:16px;">
    <div>
      <h1>Embedded</h1>
      <p>Validation du mode embedded, des services locaux et du backend intégré.</p>
      <p><NuxtLink to="/tests">Ouvrir la page de tests détaillés</NuxtLink></p>
    </div>
    <pre style="white-space: pre-wrap">{{ { clientMode, embeddedMongoEnabled, embeddedMongoMode, publicClient } }}</pre>
  </div>
</template>
