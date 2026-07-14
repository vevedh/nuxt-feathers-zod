export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server)
    return

  const auth = useAuthStore()

  if (!auth.authenticated) {
    await auth.reAuthenticate()
  }

  const publicRoutes = ['/']

  if (!auth.authenticated || !auth.user) {
    if (!publicRoutes.includes(to.path))
      return navigateTo('/')
  }
})
