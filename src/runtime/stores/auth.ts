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

  function setSession(payload: { user?: any, accessToken?: string | null, authenticated?: boolean, error?: any } = {}) {
    state.user = payload.user ?? null
    state.accessToken = payload.accessToken ?? null
    state.authenticated = payload.authenticated ?? Boolean(payload.accessToken || payload.user)
    state.error = payload.error ?? null
  }

  async function authenticate(payload: any) {
    const api = useNuxtApp().$api
    const result = await api.authenticate(payload)
    setSession({
      accessToken: getAccessTokenFromResult(result),
      user: result.user,
      authenticated: true,
      error: null,
    })
  }

  async function reAuthenticate() {
    const api = useNuxtApp().$api
    try {
      const result = await api.reAuthenticate()
      setSession({ accessToken: getAccessTokenFromResult(result), user: result.user, authenticated: true, error: null })
    }
    catch (e) {
      // Token invalid/expired (or auth not configured). Do not call api.logout()
      // here because some clients may throw non-standard errors during cleanup.
      setSession({ accessToken: null, user: null, authenticated: false, error: e })
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
      setSession({ accessToken: null, user: null, authenticated: false, error: state.error })
    }
  }

  return {
    ...toRefs(state),
    userId,
    setSession,
    authenticate,
    reAuthenticate,
    logout,
  }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useAuthStore, import.meta.hot))
