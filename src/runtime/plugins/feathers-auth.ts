import { defineNuxtPlugin } from '#app'
import { useAuthStore } from '../stores/auth'

/**
 * Client-side authentication bootstrap.
 *
 * Why: In SSR, the Feathers client plugin may not be available yet (or may be
 * intentionally disabled) and calling the auth store would throw.
 *
 * We only attempt to re-authenticate in the browser and only when the Feathers
 * client has been injected.
 */
export default defineNuxtPlugin(async (nuxtApp) => {
  if (import.meta.server)
    return

  // If the Feathers client plugin has not been registered for some reason,
  // avoid throwing at runtime.
  if (!('$api' in nuxtApp) || !nuxtApp.$api)
    return

  const auth = useAuthStore()
  try {
    await auth.reAuthenticate()
  }
  catch (e) {
    // Ignore invalid/expired tokens at boot.
  }
})
