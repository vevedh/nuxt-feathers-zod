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

  // Only Keycloak can do an interactive redirect here.
  if (auth.provider.value === 'keycloak' && !auth.isAuthenticated.value) {
    await auth.login({ redirectUri: window.location.origin + to.fullPath })
  }
})
