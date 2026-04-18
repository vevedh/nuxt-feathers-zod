<script setup lang="ts">
defineProps<{ title: string; subtitle: string }>()
</script>
<template>
  <div class="hero-card surface-card rounded-6 p-6 md:p-8 shadow-sm">
    <div class="dash-kicker">Migration cockpit</div>
    <h1 class="mt-3 text-3xl md:text-4xl font-black nfz-title leading-tight">{{ title }}</h1>
    <p class="mt-3 max-w-3xl text-base nfz-subtitle leading-relaxed">{{ subtitle }}</p>
    <div class="dash-badge-row text-sm">
      <span class="dash-badge">Nuxt 4</span>
      <span class="dash-badge">nuxt-feathers-zod embedded</span>
      <span class="dash-badge">Quasar + UnoCSS</span>
    </div>
  </div>
</template>