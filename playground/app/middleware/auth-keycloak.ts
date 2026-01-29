export default defineNuxtRouteMiddleware(async (to) => {
  // on reste en client-only
  if (import.meta.server)
    return

  const { $keycloak } = useNuxtApp()

  console.log('Keycloak after init :', $keycloak)

  // si plugin pas encore hydraté, on laisse passer (cas rare)
  if (!$keycloak)
    return

  // pages protégées : on force le login
  if (!$keycloak.authenticated) {
    await $keycloak.login({
      redirectUri: window.location.origin + to.fullPath,
    })
  }
})

/*  Note: this middleware is intended to be used in a Nuxt 3 application
Su page protégée, il vérifie si l'utilisateur est authentifié via Keycloak.

definePageMeta({ middleware: ['auth-keycloak'] })
*/
