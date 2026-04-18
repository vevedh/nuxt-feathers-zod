import { storeToRefs } from 'pinia'

export function useLocalAuthUi() {
  const store = useNfzAuthUiStore()
  const refs = storeToRefs(store)

  return {
    ...refs,
    auth: store.auth,
    authStore: store.authStore,
    runtime: store.runtime,
    diagnostics: store.diagnostics,
    ensureSession: store.ensureSession,
    syncKeycloak: store.syncKeycloak,
    login: store.login,
    logout: store.logout,
  }
}
