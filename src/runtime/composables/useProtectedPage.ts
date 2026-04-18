import { computed, onMounted, ref } from 'vue'
import { useAuthRuntime } from './useAuthRuntime'

export interface ProtectedPageOptions {
  auth?: 'required' | 'optional' | 'none'
  validateBearer?: boolean
  reason?: string
  stableUntilMounted?: boolean
}

export function useProtectedPage(options: ProtectedPageOptions = {}) {
  const auth = useAuthRuntime()
  const pending = ref(false)
  const ready = ref(false)
  const authorized = ref(false)
  const error = ref<any>(null)
  const mounted = ref(false)

  const authMode = computed(() => options.auth ?? 'required')
  const reason = computed(() => options.reason || 'protected-page')
  const stableUntilMounted = computed(() => options.stableUntilMounted !== false)
  const hydrated = computed(() => !stableUntilMounted.value || mounted.value)
  const displayState = computed(() => {
    if (!hydrated.value)
      return 'hydrating' as const
    if (pending.value)
      return 'pending' as const
    if (error.value)
      return 'error' as const
    if (ready.value && authorized.value)
      return 'authorized' as const
    if (ready.value && !authorized.value)
      return 'blocked' as const
    return 'idle' as const
  })

  onMounted(() => {
    mounted.value = true
  })

  async function ensure() {
    pending.value = true
    error.value = null

    try {
      if (authMode.value !== 'none') {
        await auth.ensureReady(`${reason.value}:ensureReady`)

        if (options.validateBearer !== false && auth.provider.value === 'keycloak')
          await auth.ensureValidatedBearer(`${reason.value}:validateBearer`)
      }

      const isAuthorized = authMode.value === 'none'
        ? true
        : authMode.value === 'optional'
          ? true
          : auth.authenticated.value === true

      authorized.value = isAuthorized
      ready.value = true
      auth.pushEvent({
        type: isAuthorized ? 'protected-page-ready' : 'protected-page-blocked',
        level: isAuthorized ? 'info' : 'warn',
        reason: reason.value,
        details: {
          authMode: authMode.value,
          provider: auth.provider.value,
          authenticated: auth.authenticated.value,
        },
      })
      return isAuthorized
    }
    catch (caught) {
      error.value = caught
      authorized.value = false
      ready.value = true
      auth.pushEvent({
        type: 'protected-page-blocked',
        level: 'error',
        reason: reason.value,
        message: (caught as any)?.message || 'Protected page bootstrap failed',
        details: { authMode: authMode.value },
      })
      return false
    }
    finally {
      pending.value = false
    }
  }

  return {
    auth,
    pending,
    ready,
    authorized,
    error,
    authMode,
    hydrated,
    displayState,
    ensure,
  }
}
