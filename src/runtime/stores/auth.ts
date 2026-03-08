import { useNuxtApp } from '#app'
import { acceptHMRUpdate, defineStore } from 'pinia'
import { computed, reactive, toRefs } from 'vue'
import { getAccessTokenFromResult } from '../utils/auth'

export const useAuthStore = defineStore('auth', () => {
  const state = reactive({
    user: null as any,
    authenticated: false,
    accessToken: null as string | null,
    error: null as any,
  })

  const userId = computed(() =>
    (state.user)?.id
    ?? (state.user)?._id
    ?? null,
  )

  async function authenticate(payload: any) {
    const api = useNuxtApp().$api
    const result = await api.authenticate(payload)
    state.accessToken = getAccessTokenFromResult(result)
    state.user = result.user
    state.authenticated = true
  }

  async function reAuthenticate() {
    const api = useNuxtApp().$api
    try {
      const result = await api.reAuthenticate()
      state.accessToken = getAccessTokenFromResult(result)
      state.user = result.user
      state.authenticated = true
      state.error = null
    }
    catch (e) {
      // Token invalid/expired (or auth not configured). Do not call api.logout()
      // here because some clients may throw non-standard errors during cleanup.
      state.error = e
      state.user = null
      state.accessToken = null
      state.authenticated = false
    }
  }

  async function logout() {
    const api = useNuxtApp().$api
    try {
      await api.logout?.()
    }
    catch (e) {
      // ignore logout errors (network/offline/etc.)
      state.error = e
    }
    finally {
      state.user = null
      state.accessToken = null
      state.authenticated = false
    }
  }

  return {
    ...toRefs(state),
    userId,
    authenticate,
    reAuthenticate,
    logout,
  }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot))
