<script setup lang="ts">
const auth = useAuth()
await auth.init()


const errorMsg = ref<string | null>(null)

function serializeError(err: any) {
  const e = err ?? {}
  return {
    name: e.name,
    message: e.message,
    code: e.code ?? e.name,
    className: e.className,
    type: e.type,
    data: e.data,
  }
}

const localForm = reactive<{ userId: string, password: string }>({ userId: 'test', password: '12345' })

const isLocal = computed(() => auth.provider.value === 'local')
const isKeycloak = computed(() => auth.provider.value === 'keycloak')

async function loginLocal() {
  errorMsg.value = null
  const store = useAuthStore()
  try {
    await store.authenticate({ strategy: 'local', ...localForm })
    await navigateTo('/messages')
  }
  catch (err: any) {
    const s = serializeError(err)
    errorMsg.value = s.message || 'Login failed'
    console.warn('[playground/index] local login failed', s)
  }
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

    <p style="margin-top: 16px">
      <NuxtLink to="/actions">
        Custom service demo: /actions
      </NuxtLink>
    </p>

    <p style="margin-top: 8px">
      <NuxtLink to="/ldapusers">
        Remote service demo: /ldapusers
      </NuxtLink>
    </p>

    <p style="margin-top: 8px">
      <NuxtLink to="/tests">
        Connection & Auth tests: /tests
      </NuxtLink>
    </p>

    <p style="margin-top: 8px">
      <NuxtLink to="/remote/socketio">
        Remote Socket.IO validation
      </NuxtLink>
    </p>

    <p style="margin-top: 8px">
      <NuxtLink to="/remote/rest">
        Remote REST validation
      </NuxtLink>
    </p>

    <p style="margin-top: 8px">
      <NuxtLink to="/embedded">
        Embedded validation
      </NuxtLink>
    </p>

    <p style="margin-top: 8px">
      <NuxtLink to="/middleware">
        Middleware / modules validation
      </NuxtLink>
    </p>

    <p style="margin-top: 8px">
      <NuxtLink to="/validation">
        Scenario matrix: /validation
      </NuxtLink>
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
      <p v-if="errorMsg" style="color: #b91c1c; margin-bottom: 12px">{{ errorMsg }}</p>
      <h3>Local auth</h3>
      <div>
        <label for="userId">User ID:</label>
        <br />
        <input id="userId" v-model="localForm.userId" type="text" required />
      </div>
      <div>
        <label for="password">Password:</label>
        <br />
        <input id="password" v-model="localForm.password" type="password" required />
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
