<script setup lang="ts">
definePageMeta({ public: true })

onMounted(async () => {
  const session = useStudioSessionStore()
  await session.restore('home-redirect')

  if (session.authenticated)
    await navigateTo('/dashboard')
  else
    await navigateTo('/login')
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center nfz-page">
    <QSpinner color="primary" size="42px" />
  </div>
</template>
