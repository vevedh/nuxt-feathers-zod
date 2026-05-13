export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) {
    return
  }

  const auth = useNfzAuth()
  await auth.init()

  if (!auth.isAuthenticated.value) {
    return navigateTo('/login')
  }

  if (!auth.isAdmin.value) {
    return navigateTo('/forbidden')
  }
})
