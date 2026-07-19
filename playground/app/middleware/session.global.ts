export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server)
    return

  // Restore an existing session without making the entire playground private.
  // Pages that require authentication declare the dedicated `auth` middleware.
  const auth = useAuthStore()
  if (!auth.ready)
    await auth.reAuthenticate().catch(() => undefined)
})
