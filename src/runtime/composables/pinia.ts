import { useNuxtApp } from '#imports'

export interface NfzPiniaRuntime {
  available: boolean
  pinia: unknown | null
}

/**
 * Access the application Pinia instance registered by @pinia/nuxt.
 *
 * NFZ no longer wraps the Feathers client with the legacy service-store wrapper. Pinia is used
 * only for explicit application/session stores such as useSessionStore().
 */
export function useNfzPinia(): NfzPiniaRuntime {
  const nuxtApp = useNuxtApp() as any
  const pinia = nuxtApp.$pinia ?? null
  return {
    available: Boolean(pinia),
    pinia,
  }
}

export function hasNfzPinia(): boolean {
  return useNfzPinia().available
}
