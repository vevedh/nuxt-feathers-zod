import { defineNuxtPlugin } from '#app'
import { useAuthRuntime } from '../composables/useAuthRuntime'

export default defineNuxtPlugin({
  name: 'nfz:session-auth',
  async setup() {
    if (import.meta.server)
      return

    const session = useAuthRuntime()
    try {
      await session.ensureReady('session-auth-plugin')
    }
    catch {
      // Ignore invalid/expired tokens at boot; the session middleware will
      // redirect protected pages when needed.
    }
  },
})
