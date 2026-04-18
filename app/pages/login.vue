<script setup lang="ts">
const route = useRoute()
const q = useQuasar()
const { login, loading, error, ensureSession, provider, isLocalProvider, isKeycloakProvider } = useLocalAuthUi()
const form = reactive({ email: 'admin@example.local', password: 'ChangeMe123!' })

const redirectTarget = computed(() => typeof route.query.redirect === 'string' ? route.query.redirect : '/')

onMounted(async () => {
  q.dark.set(false)
  try {
    const authenticated = await ensureSession('nfz-studio-login')
    if (authenticated)
      await navigateTo(redirectTarget.value)
  }
  catch (e) {
    console.error('[NFZ Studio] login bootstrap failed', e)
  }
})

async function submit() {
  try {
    await login({ email: form.email, password: form.password }, { redirectTo: redirectTarget.value })
    const authenticated = await ensureSession('nfz-studio-login-submit')
    if (!authenticated)
      throw new Error('Connexion réussie mais session non disponible pour la navigation protégée')
    await navigateTo(redirectTarget.value)
  }
  catch (e) {
    console.error('[NFZ Studio] login submit failed', e)
  }
}

definePageMeta({ layout: false })
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-10 page-shell">
    <div class="w-full max-w-md rounded-6 border border-[var(--nfz-border)] bg-[var(--nfz-surface)] p-6 md:p-8 shadow-lg">
      <div class="text-xs uppercase tracking-[0.24em] text-[var(--nfz-primary)]">{{ isKeycloakProvider ? 'Authentification SSO' : 'Authentification locale' }}</div>
      <h1 class="mt-3 text-3xl font-black nfz-title">Connexion</h1>
      <p class="mt-2 text-sm nfz-subtitle">
        <template v-if="isKeycloakProvider">Utilise Keycloak comme source d’identité puis synchronise la session FeathersJS côté NFZ.</template>
        <template v-else>Utilise l’utilisateur seedé pour entrer dans la console embedded NFZ.</template>
      </p>

      <QForm v-if="isLocalProvider" class="mt-6 grid gap-4" @submit.prevent="submit">
        <QInput v-model="form.email" outlined label="Email" name="email" input-class="nfz-login-email" autocomplete="username" :input-attr="{ id: 'nfz-login-email' }" />
        <QInput v-model="form.password" outlined label="Password" name="password" type="password" input-class="nfz-login-password" autocomplete="current-password" :input-attr="{ id: 'nfz-login-password' }" />
        <div v-if="error" class="rounded-4 border border-red-300/30 bg-red-100 px-4 py-2 text-sm text-red-700">{{ error }}</div>
        <QBtn type="submit" color="primary" unelevated icon="login" label="Se connecter" :loading="loading" />
      </QForm>

      <div v-else class="mt-6 grid gap-4">
        <div class="rounded-4 border border-[var(--nfz-border)] bg-[var(--nfz-surface-soft)]/50 px-4 py-3 text-sm nfz-subtitle">
          Provider actif : <strong>{{ provider }}</strong>. Le bouton ci-dessous déclenche la connexion Keycloak puis le bridge Bearer -> FeathersJS.
        </div>
        <div v-if="error" class="rounded-4 border border-red-300/30 bg-red-100 px-4 py-2 text-sm text-red-700">{{ error }}</div>
        <QBtn color="primary" unelevated icon="vpn_key" label="Se connecter avec Keycloak" :loading="loading" @click="submit" />
      </div>

      <div class="mt-5 text-xs nfz-subtitle">
        <template v-if="isLocalProvider">Valeurs par défaut : admin@example.local / ChangeMe123!</template>
        <template v-else>Redirect cible : {{ redirectTarget }}</template>
      </div>
    </div>
  </div>
</template>
