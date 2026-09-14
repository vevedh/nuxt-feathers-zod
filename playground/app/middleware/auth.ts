/**
 * Provider-agnostic auth guard for the playground.
 *
 * - Keycloak (SSO, Option A): forces login only when the route uses this middleware.
 * - Local Feathers auth: calls the store login flow only when you explicitly do it in UI.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  // client-only
  if (import.meta.server)
    return

  const auth = useAuth()
  await auth.init()

  if (auth.isAuthenticated.value)
    return

  // Keycloak owns its interactive login redirect. Local/remote playground
  // scenarios return to a public entry page instead of leaving a protected
  // screen mounted with an anonymous session.
  if (auth.provider.value === 'keycloak') {
    await auth.login({ redirectUri: window.location.origin + to.fullPath })
    return
  }

  const target = auth.provider.value === 'remote' ? '/tests' : '/'
  return navigateTo({
    path: target,
    query: {
      auth: 'required',
      redirect: to.fullPath,
    },
  }, { replace: true })
})
