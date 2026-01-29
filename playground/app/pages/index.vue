<script setup lang="ts">
const auth = useAuth()
await auth.init()

const localForm = reactive<{ userId: string, password: string }>({ userId: 'test', password: '12345' })

const isLocal = computed(() => auth.provider.value === 'local')
const isKeycloak = computed(() => auth.provider.value === 'keycloak')

async function loginLocal() {
  const store = useAuthStore()
  await store.authenticate({ strategy: 'local', ...localForm })
  await navigateTo('/messages')
}

async function goProtected() {
  // messages page is protected by middleware ['auth']
  await navigateTo('/messages')
}
</script>

<template>
  <div class="login-page">
    <h1>Playground</h1>

    <p>
      Provider: <strong>{{ auth.provider }}</strong>
      <span v-if="auth.ready">(ready)</span>
    </p>

    <div v-if="isKeycloak">
      <p>
        Keycloak SSO (Option A): navigation to a protected page triggers login only if needed.
      </p>
      <button @click="goProtected">
        Go to protected page (/messages)
      </button>
    </div>

    <form v-else-if="isLocal" @submit.prevent="loginLocal">
      <h3>Local auth</h3>
      <div>
        <label for="userId">User ID:</label><br>
        <input id="userId" v-model="localForm.userId" type="text" required>
      </div>
      <div>
        <label for="password">Password:</label><br>
        <input id="password" v-model="localForm.password" type="password" required>
      </div>
      <button id="login" type="submit">
        Login
      </button>
      <div>
        <p>Password of test user 12345</p>
      </div>
    </form>

    <div v-else>
      <p>No auth provider enabled.</p>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.login-page div {
  margin-bottom: 10px;
}
.login-page p {
  font-size: 0.9em;
}
</style>
