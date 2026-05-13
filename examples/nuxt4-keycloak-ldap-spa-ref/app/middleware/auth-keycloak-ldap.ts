export default defineNuxtRouteMiddleware(async () => {
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
