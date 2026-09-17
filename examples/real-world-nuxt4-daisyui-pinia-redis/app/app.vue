<script setup lang="ts">
const theme = useThemeStore()

onMounted(() => theme.restore())
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
