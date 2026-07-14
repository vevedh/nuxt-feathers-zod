<script setup lang="ts">
import { withBase } from 'vitepress'
</script>

<template>
  <a
    class="vp-brand"
    :href="withBase('/')"
    aria-label="Accueil de la documentation nuxt-feathers-zod"
  >
    <img
      :src="withBase('/images/nfz-feather.webp')"
      alt=""
      class="vp-brand-logo"
      width="28"
      height="28"
    >
    <span class="vp-brand-title">
      <span class="vp-brand-main">nuxt-feathers-</span><span class="vp-brand-zod">zod</span>
    </span>
  </a>
</template>
