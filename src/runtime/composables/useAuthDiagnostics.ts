import { computed, onMounted, ref } from 'vue'
import type { AuthStatus, TokenSource } from './useAuthRuntime'
import { useAuthRuntime } from './useAuthRuntime'

export interface AuthDiagnosticsOptions {
  stableUntilMounted?: boolean
}

export function useAuthDiagnostics(options: AuthDiagnosticsOptions = {}) {
  const auth = useAuthRuntime()
  const mounted = ref(false)
  const stableUntilMounted = options.stableUntilMounted !== false

  onMounted(() => {
    mounted.value = true
  })

  return computed(() => {
    const hydrationSafe = stableUntilMounted && !mounted.value

    if (hydrationSafe) {
      return {
        provider: auth.provider.value,
        status: (auth.bootstrapping.value ? 'bootstrapping' : 'idle') as AuthStatus,
        ready: false,
        bootstrapping: auth.bootstrapping.value,
        authenticated: false,
        hasAccessToken: false,
        tokenSource: 'none' as TokenSource,
        user: null,
        permissions: [],
        error: null,
        lastSyncAt: 0,
        lastReadyAt: 0,
        lastAuthenticateAt: 0,
        lastReAuthenticateAt: 0,
        lastBridgeAt: 0,
        lastEnsureReason: 'hydration-safe',
        bridgePath: auth.bridgePath.value,
        hydrationState: 'stable-until-mounted' as const,
        clientSync: {
          api: 'idle',
          client: 'idle',
          feathersClient: 'idle',
        },
        eventCount: 0,
        latestEvent: null,
      }
    }

    return {
      provider: auth.provider.value,
      status: auth.status.value,
      ready: auth.ready.value,
      bootstrapping: auth.bootstrapping.value,
      authenticated: auth.authenticated.value,
      hasAccessToken: Boolean(auth.accessToken.value),
      tokenSource: auth.tokenSource.value,
      user: auth.user.value,
      permissions: auth.permissions.value,
      error: auth.error.value,
      lastSyncAt: auth.lastSyncAt.value,
      lastReadyAt: auth.lastReadyAt.value,
      lastAuthenticateAt: auth.lastAuthenticateAt.value,
      lastReAuthenticateAt: auth.lastReAuthenticateAt.value,
      lastBridgeAt: auth.lastBridgeAt.value,
      lastEnsureReason: auth.lastEnsureReason.value,
      bridgePath: auth.bridgePath.value,
      hydrationState: 'live' as const,
      clientSync: auth.clientSync.value,
      eventCount: auth.events.value.length,
      latestEvent: auth.events.value[0] || null,
    }
  })
}
