export default defineNuxtRouteMiddleware(async () => {
  // En SSR, Keycloak reste client-only : le serveur ne peut pas finaliser le login navigateur.
  // On laisse donc le rendu serveur produire un shell stable, puis le guard client finalise.
  if (import.meta.server) {
    return
  }

  const current = useCurrentLdapUser()

  if (!current.isSsoAuthenticated.value) {
    await current.login()
    return abortNavigation()
  }

  if (current.synchronized.value && current.user.value) {
    return
  }

  await current.refresh()

  if (current.synchronized.value && current.user.value) {
    return
  }

  return abortNavigation()
})
