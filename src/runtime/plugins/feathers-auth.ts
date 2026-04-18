import { defineNuxtPlugin } from '#app'
import { useAuthRuntime } from '../composables/useAuthRuntime'

export default defineNuxtPlugin({
  name: 'nfz:feathers-auth',
  async setup() {
    if (import.meta.server)
      return

    const auth = useAuthRuntime()
    try {
      await auth.ensureReady()
    }
    catch {
      // Ignore invalid/expired tokens at boot.
    }
  },
})
