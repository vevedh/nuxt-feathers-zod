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
 *
 * IMPORTANT: we guard on `nuxtApp.$pinia` instead of declaring a plugin dependsOn,
 * to avoid noisy build-time warnings when Pinia is enabled dynamically by the module.
 */
export default defineNuxtPlugin({
  name: 'nfz:feathers-auth',
  async setup(nuxtApp: any) {
    if (import.meta.server)
      return

    // If the Feathers client plugin has not been registered for some reason,
    // avoid throwing at runtime.
    if (!('$api' in nuxtApp) || !nuxtApp.$api)
      return

    if (!nuxtApp.$pinia)
      return

    const auth = useAuthStore(nuxtApp.$pinia)
    try {
      await auth.reAuthenticate()
    }
    catch {
      // Ignore invalid/expired tokens at boot.
    }
  },
})
