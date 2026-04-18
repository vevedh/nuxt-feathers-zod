<script setup lang="ts">
const { auth, runtime, currentUser, currentUsername, login, logout, loading, error } = useLocalAuthUi()
const { info, success, error: traceError } = useDashboardTrace()
const form = reactive({ email: 'admin@example.local', password: 'ChangeMe123!' })
const reauthBusy = ref(false)
const authState = computed(() => ({
  isAuthenticated: auth.isAuthenticated.value,
  hasAccessToken: !!(runtime as any).accessToken?.value,
  username: currentUsername.value,
}))

async function submitLogin() {
  try {
    await login({ email: form.email, password: form.password })
  }
  catch {}
}

async function submitLogout() {
  try {
    await logout()
  }
  catch {}
}

async function reAuthenticate() {
  reauthBusy.value = true
  try {
    info('auth', 'auth:reauth:start', 'Re-authentification demandée depuis la démo')
    if (typeof (runtime as any).reAuthenticate === 'function')
      await (runtime as any).reAuthenticate()
    else if (typeof (auth as any).init === 'function')
      await (auth as any).init()
    success('auth', 'auth:reauth:success', 'Re-authentification terminée')
  }
  catch (e: any) {
    traceError('auth', 'auth:reauth:error', 'Re-authentification en erreur', { error: e?.message || String(e) })
  }
  finally {
    reauthBusy.value = false
  }
}
</script>

<template>
  <QPage class="dash-page">
    <AppHeroCard title="Auth demo" subtitle="Page de démonstration produit pour valider la simplicité du parcours auth NFZ : login, logout, réauthentification et inspection de l'état courant." />

    <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section class="dash-panel">
        <div class="dash-section-head">
          <div>
            <div class="dash-kicker">Actions</div>
            <h2 class="mt-2 dash-title">Tester le cycle auth</h2>
          </div>
        </div>
        <QForm class="grid gap-4 max-w-xl" @submit.prevent="submitLogin">
          <QInput v-model="form.email" outlined label="Email" autocomplete="username" />
          <QInput v-model="form.password" outlined type="password" label="Password" autocomplete="current-password" />
          <div v-if="error" class="rounded-4 border border-red-300/30 bg-red-400/10 px-4 py-2 text-sm text-red-1">{{ error }}</div>
          <div class="flex flex-wrap gap-3">
            <QBtn type="submit" color="primary" unelevated icon="login" label="Login" :loading="loading" />
            <QBtn color="secondary" outline icon="vpn_key" label="reAuthenticate" :loading="reauthBusy" @click="reAuthenticate" />
            <QBtn color="negative" outline icon="logout" label="Logout" :loading="loading" @click="submitLogout" />
          </div>
        </QForm>
      </section>

      <section class="dash-panel">
        <div class="dash-kicker">État courant</div>
        <h2 class="mt-2 dash-title">Session synthétique</h2>
        <div class="dash-stack mt-4">
          <div class="dash-list-item"><strong>Authentifié</strong><span>{{ authState.isAuthenticated ? 'oui' : 'non' }}</span></div>
          <div class="dash-list-item"><strong>Access token</strong><span>{{ authState.hasAccessToken ? 'présent' : 'absent' }}</span></div>
          <div class="dash-list-item"><strong>Utilisateur</strong><span>{{ authState.username }}</span></div>
        </div>
      </section>
    </div>

    <section class="dash-panel mt-5">
      <div class="dash-section-head">
        <div>
          <div class="dash-kicker">Inspection</div>
          <h2 class="mt-2 dash-title">Objets auth et user</h2>
        </div>
      </div>
      <div class="grid gap-5 xl:grid-cols-2">
        <div>
          <div class="text-sm font-semibold nfz-title mb-2">Utilisateur courant</div>
          <pre class="dash-code-block">{{ JSON.stringify(currentUser, null, 2) }}</pre>
        </div>
        <div>
          <div class="text-sm font-semibold nfz-title mb-2">État auth synthétique</div>
          <pre class="dash-code-block">{{ JSON.stringify(authState, null, 2) }}</pre>
        </div>
      </div>
    </section>
  </QPage>
</template>
