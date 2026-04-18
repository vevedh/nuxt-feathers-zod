import { acceptHMRUpdate, defineStore, storeToRefs } from 'pinia'
import { computed, ref } from 'vue'

function extractAccessToken(result: any): string | null {
  const candidates = [
    result?.accessToken,
    result?.access_token,
    result?.token,
    result?.authentication?.accessToken,
    result?.authentication?.access_token,
    result?.authentication?.token,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate)
      return candidate
  }

  return null
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null
  return new Promise((resolve, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms)
    promise.then((value) => {
      if (timer)
        clearTimeout(timer)
      resolve(value)
    }).catch((err) => {
      if (timer)
        clearTimeout(timer)
      reject(err)
    })
  })
}

async function localAuthenticateViaRest(credentials: { email: string, password: string }) {
  return await $fetch('/feathers/authentication', {
    method: 'POST',
    body: {
      strategy: 'local',
      email: credentials.email.trim(),
      password: credentials.password,
    },
  })
}

function readPersistedTokenCandidate() {
  if (import.meta.server)
    return null

  try {
    return localStorage.getItem('feathers-jwt') || localStorage.getItem('accessToken') || null
  }
  catch {
    return null
  }
}

export const useNfzAuthUiStore = defineStore('nfz-auth-ui', () => {
  const auth = useAuth()
  const authStore = useAuthStore()
  const { user: authStoreUser, authenticated: authStoreAuthenticated, accessToken: authStoreAccessToken, permissions: authStorePermissions } = storeToRefs(authStore)
  const runtime = useAuthRuntime()
  const diagnostics = useAuthDiagnostics({ stableUntilMounted: true })
  const { $keycloak } = useNuxtApp() as any
  const loading = ref(false)
  const error = ref<string | null>(null)
  const { info, success, error: traceError, warn } = useDashboardTrace()

  const provider = computed(() => runtime.provider.value || auth.provider.value || 'local')
  const isLocalProvider = computed(() => provider.value === 'local')
  const isKeycloakProvider = computed(() => provider.value === 'keycloak')
  const authenticated = computed(() => runtime.authenticated.value || authStoreAuthenticated.value || auth.isAuthenticated.value)
  const currentUser = computed(() => authStoreUser.value || auth.user.value || runtime.user.value || null)
  const currentUsername = computed(() => {
    const user = currentUser.value as any
    return user?.username || user?.email || user?.preferred_username || 'Utilisateur'
  })

  async function ensureSession(reason = 'nfz-studio-ui-store') {
    await authStore.ensureReady(reason)

    if (isKeycloakProvider.value && typeof runtime.ensureValidatedBearer === 'function')
      await runtime.ensureValidatedBearer(`${reason}:validate-bearer`)

    if (!runtime.authenticated.value && isLocalProvider.value) {
      const candidateToken = authStoreAccessToken.value || auth.token.value || runtime.accessToken.value || readPersistedTokenCandidate()
      if (candidateToken && typeof authStore.setSession === 'function') {
        await authStore.setSession({
          accessToken: candidateToken,
          user: authStoreUser.value || auth.user.value || runtime.user.value || null,
          authenticated: true,
          permissions: runtime.permissions.value || authStorePermissions.value || [],
          error: null,
        }, 'nfz-studio-ensure-session-store')
      }
    }

    return runtime.authenticated.value || authStoreAuthenticated.value || auth.isAuthenticated.value
  }

  async function syncKeycloak(reason = 'nfz-studio-keycloak-sync-store') {
    loading.value = true
    error.value = null
    try {
      info('auth', 'auth:keycloak:sync:start', 'Synchronisation Keycloak -> FeathersJS via store', { reason })
      await runtime.synchronizeKeycloakSession?.(reason)
      await ensureSession(`${reason}:ready`)
      success('auth', 'auth:keycloak:sync:success', 'Synchronisation Keycloak réussie', { reason })
      return authenticated.value
    }
    catch (e: any) {
      error.value = e?.message || String(e)
      traceError('auth', 'auth:keycloak:sync:error', 'Synchronisation Keycloak en échec', { error: error.value, reason })
      throw e
    }
    finally {
      loading.value = false
    }
  }

  async function login(credentials: { email: string, password: string }, options: { redirectTo?: string } = {}) {
    loading.value = true
    error.value = null

    try {
      if (isKeycloakProvider.value) {
        const redirectUri = options.redirectTo && import.meta.client
          ? `${window.location.origin}${options.redirectTo}`
          : undefined

        if ($keycloak?.authenticated) {
          await syncKeycloak('nfz-studio-keycloak-login-store')
          return
        }

        if (typeof $keycloak?.login === 'function') {
          info('auth', 'auth:keycloak:login:start', 'Redirection vers Keycloak', { redirectUri })
          await $keycloak.login(redirectUri ? { redirectUri } : undefined)
          return
        }

        throw new Error('Keycloak SSO n’est pas disponible dans cette application')
      }

      const email = credentials.email.trim()
      info('auth', 'auth:login:start', 'Tentative de connexion locale via store auth', { email })

      let result: any
      try {
        result = await withTimeout(authStore.authenticate({
          strategy: 'local',
          email,
          password: credentials.password,
        }), 10000, 'Connexion locale en timeout. Vérifie que le transport REST /feathers/authentication répond et que Socket.IO n\'intercepte pas la session.')
      }
      catch (primaryError: any) {
        warn('auth', 'auth:login:rest-fallback', 'Fallback REST direct après échec du client généré', {
          email,
          error: primaryError?.message || String(primaryError),
        })
        result = await withTimeout(localAuthenticateViaRest({ email, password: credentials.password }), 8000, 'Le fallback REST /feathers/authentication a expiré.')
      }

      const accessToken = extractAccessToken(result)
      if (accessToken && typeof authStore.setSession === 'function') {
        warn('auth', 'auth:login:session-repair', 'Synchronisation explicite de la session locale après authenticate()', { email })
        await authStore.setSession({
          accessToken,
          user: (result as any)?.user ?? authStoreUser.value ?? auth.user.value ?? runtime.user.value ?? null,
          authenticated: true,
          permissions: (result as any)?.permissions ?? runtime.permissions.value ?? authStorePermissions.value ?? [],
          error: null,
        }, 'nfz-studio-local-login-store')
      }

      await nextTick()
      const sessionReady = await ensureSession('nfz-studio-local-login:verify-store')
      if (!sessionReady)
        throw new Error('La session locale n’a pas été propagée au runtime NFZ après authentification')

      success('auth', 'auth:login:success', 'Connexion locale réussie', {
        email,
        hasAccessToken: Boolean(runtime.accessToken.value || accessToken),
      })
      return result
    }
    catch (e: any) {
      error.value = e?.data?.message || e?.message || String(e)
      traceError('auth', 'auth:login:error', 'Connexion en échec', { error: error.value })
      throw e
    }
    finally {
      loading.value = false
    }
  }

  async function logout() {
    loading.value = true
    error.value = null
    try {
      info('auth', 'auth:logout:start', 'Déconnexion en cours via store auth')

      if (isKeycloakProvider.value && typeof $keycloak?.logout === 'function') {
        await authStore.logout()
        await $keycloak.logout({ redirectUri: import.meta.client ? `${window.location.origin}/login` : undefined })
      }
      else {
        await authStore.logout()
      }

      success('auth', 'auth:logout:success', 'Déconnexion réussie')
    }
    catch (e: any) {
      error.value = e?.message || String(e)
      traceError('auth', 'auth:logout:error', 'Déconnexion en échec', { error: error.value })
      throw e
    }
    finally {
      loading.value = false
    }
  }

  return {
    auth,
    authStore,
    runtime,
    diagnostics,
    loading,
    error,
    provider,
    isLocalProvider,
    isKeycloakProvider,
    authenticated,
    currentUser,
    currentUsername,
    ensureSession,
    syncKeycloak,
    login,
    logout,
  }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useNfzAuthUiStore, import.meta.hot))
