export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server)
    return

  if (to.meta.public)
    return

  const session = useStudioSessionStore()
  await session.restore('route-middleware')

  if (!session.authenticated) {
    return navigateTo({
      path: '/login',
      query: { redirect: to.fullPath },
    })
  }

  const requiredRoles = Array.isArray(to.meta.roles)
    ? to.meta.roles
    : []

  if (requiredRoles.length && !session.hasAnyRole(requiredRoles)) {
    return navigateTo({
      path: '/dashboard',
      query: { forbidden: '1' },
    })
  }
})
