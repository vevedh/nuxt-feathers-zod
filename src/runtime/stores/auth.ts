import { useNuxtApp } from '#app'
import { acceptHMRUpdate, defineStore } from 'pinia'
import { computed, reactive, toRefs } from 'vue'

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
    state.accessToken = result.accessToken
    state.user = result.user
    state.authenticated = true
  }

  async function reAuthenticate() {
    try {
      const api = useNuxtApp().$api
      const result = await api.reAuthenticate()
      state.accessToken = result.accessToken
      state.user = result.user
      state.authenticated = true
    }
    catch (e) {
      logout()
    }
  }

  function logout() {
    const api = useNuxtApp().$api
    api.logout?.()
    state.user = null
    state.accessToken = null
    state.authenticated = false
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
