function getAuthStorageKey() {
  const runtimeConfig = useRuntimeConfig() as any
  const pub = runtimeConfig?.public || {}
  return pub?._feathers?.client?.remote?.auth?.storageKey
    || pub?._feathers?.auth?.client?.storageKey
    || 'feathers-jwt'
}

function readClientPersistedToken(storageKey: string) {
  if (import.meta.server)
    return null

  try {
    return localStorage.getItem(storageKey)
      || localStorage.getItem('feathers-jwt')
      || localStorage.getItem('accessToken')
      || null
  }
  catch {
    return null
  }
}

export default defineNuxtRouteMiddleware(async (to) => {
  const { info, warn, success } = useDashboardTrace()
  const publicPaths = new Set(['/login'])
  if (publicPaths.has(to.path)) {
    info('route', 'route:public', 'Accès à une route publique', { path: to.fullPath })
    return
  }

  const authUiStore = useNfzAuthUiStore()
  const runtime = useAuthRuntime()
  const storageKey = getAuthStorageKey()

  if (import.meta.server) {
    const tokenCookie = useCookie<string | null>(storageKey)
    if (!tokenCookie.value) {
      warn('route', 'route:server-redirect', 'Redirection serveur vers login', { path: to.fullPath, provider: runtime.provider.value || 'local' })
      return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
    }
    return
  }

  info('auth', 'auth:ensure-ready', 'Initialisation auth depuis middleware/store', { path: to.fullPath, provider: runtime.provider.value })
  await authUiStore.ensureSession(`route:${to.fullPath}`)

  if (!authUiStore.authenticated) {
    const persistedToken = runtime.accessToken.value || readClientPersistedToken(storageKey)
    if (persistedToken && typeof runtime.reAuthenticate === 'function') {
      info('auth', 'auth:guard:reauth', 'Tentative de resynchronisation de session avant blocage', { path: to.fullPath })
      await runtime.reAuthenticate()
      await authUiStore.ensureSession(`route:${to.fullPath}:reauth`)
    }
  }

  if (!authUiStore.authenticated) {
    warn('route', 'route:guard:blocked', 'Accès bloqué, authentification requise', { path: to.fullPath, provider: runtime.provider.value })
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }

  success('route', 'route:guard:ok', 'Accès autorisé', { path: to.fullPath, provider: runtime.provider.value })
})
