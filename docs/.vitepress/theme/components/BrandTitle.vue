<script setup lang="ts">
import { useData } from 'vitepress'

const { isDark } = useData()
</script>

<template>
  <div class="vp-brand">
    <img
      :src="isDark ? '/images/plume-dark.png' : '/images/plume-light.png'"
      alt="nuxt-feathers-zod"
      class="vp-brand-logo"
    >

    <span class="vp-brand-title">
      nuxt-feathers-
      <span class="vp-brand-zod">zod</span>
    </span>
  </div>
</template>

<style scoped>
.vp-brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.vp-brand-logo {
  height: 28px;
  width: auto;
}

.vp-brand-title {
  font-weight: 700;
  letter-spacing: -0.02em;
  font-size: 1rem;
  color: var(--vp-c-text-1);
}

.vp-brand-zod {
  background: linear-gradient(90deg, #22c55e, #16a34a);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  font-style: italic;
}
</style>
