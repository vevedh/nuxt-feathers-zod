<script setup lang="ts">
import { storeToRefs } from 'pinia'

const usersStore = useUsersStore()
const { items: users, loading, error } = storeToRefs(usersStore)

onMounted(() => {
  usersStore.refresh().catch(() => null)
})
</script>

<template>
  <QPage class="dash-page">
    <AppHeroCard title="Utilisateurs locaux" subtitle="Vue simple des comptes applicatifs seedés ou créés dans le service users embedded, chargés via store Pinia + feathers-pinia." />
    <section class="dash-panel">
      <div class="dash-section-head mb-4">
        <h2 class="text-lg font-semibold nfz-title">Comptes</h2>
        <QBtn color="primary" flat icon="refresh" label="Rafraîchir" :loading="loading" @click="usersStore.refresh()" />
      </div>
      <div v-if="error" class="mb-4 rounded-4 border border-red-300/30 bg-red-400/10 px-4 py-2 text-sm text-red-1">{{ error }}</div>
      <div class="dash-stack">
        <div v-for="user in users" :key="user._id || user.id || user.username" class="dash-list-item">
          <div class="font-medium nfz-title">{{ user.username }}</div>
          <div class="mt-1 text-xs nfz-subtitle">{{ user.email || '—' }}</div>
          <div class="mt-2 text-xs text-cyan-2">{{ (user.roles || []).join(', ') || 'aucun rôle' }}</div>
        </div>
      </div>
    </section>
  </QPage>
</template>
