import { acceptHMRUpdate, defineStore } from 'pinia'
import { computed } from 'vue'
import { useAuthRuntime } from '../composables/useAuthRuntime'

export const useAuthStore = defineStore('auth', () => {
  const runtime = useAuthRuntime()

  const userId = computed(() =>
    (runtime.user.value)?.userId
    ?? (runtime.user.value)?.email
    ?? (runtime.user.value)?.id
    ?? (runtime.user.value)?._id
    ?? null,
  )

  return {
    user: runtime.user,
    authenticated: runtime.authenticated,
    accessToken: runtime.accessToken,
    error: runtime.error,
    ready: runtime.ready,
    status: runtime.status,
    permissions: runtime.permissions,
    tokenSource: runtime.tokenSource,
    userId,
    setSession: runtime.setSession,
    authenticate: runtime.authenticate,
    reAuthenticate: runtime.reAuthenticate,
    ensureReady: runtime.ensureReady,
    logout: runtime.logout,
  }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot))
