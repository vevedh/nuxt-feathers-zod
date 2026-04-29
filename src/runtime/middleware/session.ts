import { defineNuxtRouteMiddleware, navigateTo, useRuntimeConfig } from '#imports'
import { useAuthRuntime } from '../composables/useAuthRuntime'

function normalizePath(path: string): string {
  if (!path || path === '/')
    return '/'
  return path.replace(/\/+$/, '') || '/'
}

function resolveSessionOptions() {
  const pub = useRuntimeConfig().public as any
  const session = pub?._feathers?.pinia?.session ?? {}
  return {
    redirectTo: typeof session.redirectTo === 'string' ? session.redirectTo : '/login',
    publicRoutes: Array.isArray(session.publicRoutes)
      ? session.publicRoutes.map((route: string) => normalizePath(route))
      : ['/', '/login', '/auth/login', '/auth/callback', '/silent-check-sso.html'],
  }
}

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server)
    return

  const session = useAuthRuntime()
  await session.ensureReady('session-middleware')

  // Preserve the Nuxt 404 behavior.
  if (!to.matched.length)
    return

  // No configured auth provider: do not block the application.
  if (session.provider.value === 'none')
    return

  const { redirectTo, publicRoutes } = resolveSessionOptions()
  const path = normalizePath(to.path)
  const isPublicByMeta = to.meta.public === true || to.meta.auth === false
  const isPublicByPath = publicRoutes.includes(path)

  if (isPublicByMeta || isPublicByPath)
    return

  if (!session.authenticated.value) {
    return navigateTo({
      path: redirectTo,
      query: to.fullPath === redirectTo ? undefined : { redirect: to.fullPath },
    })
  }
})
