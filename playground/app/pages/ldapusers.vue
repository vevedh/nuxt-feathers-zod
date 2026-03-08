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
  <div style="padding: 16px">
    <h1>Remote service demo: ldapusers</h1>

    <p>
      This page calls the external Feathers service <code>ldapusers</code> using the NFZ client.
    </p>

    <p>
      Expected endpoint:
      <code>https://api.domain.ltd/api/v1/ldapusers</code>
    </p>

    <button :disabled="loading" @click="fetchLdapUsers">
      {{ loading ? 'Loading…' : 'Fetch ldapusers' }}
    </button>

    <p v-if="error" style="margin-top: 12px; color: #b91c1c">
      Error: {{ error }}
    </p>

    <div v-if="rows" style="margin-top: 12px">
      <p>
        Rows: <strong>{{ rows.length }}</strong>
      </p>
      <pre style="white-space: pre-wrap">{{ rows }}</pre>
    </div>
  </div>
</template>
