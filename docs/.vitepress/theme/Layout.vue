<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import BrandTitle from './components/BrandTitle.vue'

const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <template #nav-bar-title>
      <BrandTitle />
    </template>
  </Layout>
</template>

<style scoped>
.VPNavBarTitle .title > span {
  display: none !important;
}
.VPNavBarTitle .title {
  display: none !important;
}
</style>
