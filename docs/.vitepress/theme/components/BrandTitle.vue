<script setup lang="ts">
import { useData, withBase } from 'vitepress'

const { isDark } = useData()
</script>

<template>
  <a class="vp-brand" :href="withBase('/')" aria-label="nuxt-feathers-zod home">
    <img
      :src="withBase(isDark ? '/images/plume-dark.png' : '/images/plume-light.png')"
      alt=""
      class="vp-brand-logo"
    >
    <span class="vp-brand-title">
      <span class="vp-brand-main">nuxt-feathers-</span><span class="vp-brand-zod">zod</span>
    </span>
  </a>
</template>
