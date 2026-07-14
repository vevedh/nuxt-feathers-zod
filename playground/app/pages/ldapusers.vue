<script setup lang="ts">
const { client } = useFeathers()

type AnyObj = Record<string, any>

const loading = ref(false)
const error = ref<string | null>(null)
const rows = ref<AnyObj[] | null>(null)

async function fetchLdapUsers() {
  loading.value = true
  error.value = null
  rows.value = null
  try {
    // Remote mode expected:
    // - NFZ_CLIENT_MODE=remote
    // - NFZ_REMOTE_URL=https://api.domain.ltd
    // - NFZ_REMOTE_REST_PATH=/api/v1
    // Service URL: https://api.domain.ltd/api/v1/ldapusers
    // NOTE: `client` returned by useFeathers() is NOT a Ref.
    const svc: any = client.service('ldapusers')
    const res = await svc.find({ query: { $limit: 25 } })

    // Feathers pagination: { total, limit, skip, data }
    rows.value = Array.isArray(res) ? res : (res?.data ?? [])
  }
  catch (e: any) {
    // Most common real-world cause in browser: CORS.
    error.value = e?.message || String(e)
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="nfz-page">
    <PlaygroundPageHeader
      eyebrow="Service distant"
      title="LDAP Users"
      description="Validez un service Feathers externe et distinguez rapidement une erreur de service, de transport ou de CORS."
    >
      <template #actions>
        <button class="nfz-button nfz-button--primary" type="button" :disabled="loading" @click="fetchLdapUsers">
          {{ loading ? 'Chargement…' : 'Interroger ldapusers' }}
        </button>
      </template>
    </PlaygroundPageHeader>

    <p class="nfz-alert">
      Endpoint de référence : <code>https://api.domain.ltd/api/v1/ldapusers</code>
    </p>
    <p v-if="error" class="nfz-alert nfz-alert--danger">{{ error }}</p>

    <div v-if="rows" class="nfz-grid">
      <article class="nfz-stat-card"><span>Résultats</span><strong>{{ rows.length }}</strong><small>Limite demandée : 25</small></article>
      <PlaygroundJsonPanel title="Réponse du service" :value="rows" :collapsed="false" />
    </div>
  </div>
</template>
