import { useSsoSessionStore } from '~/stores/sso-session'

interface KeycloakClientRuntime {
  authenticated?: boolean
  token?(): string | undefined
  tokenParsed?(): Record<string, unknown> | undefined
  login?(options?: Record<string, unknown>): Promise<void>
  logout?(options?: Record<string, unknown>): Promise<void>
  updateToken?(minValidity?: number): Promise<boolean>
}

function getProvidedKeycloakClient(): KeycloakClientRuntime | null {
  const nuxtApp = useNuxtApp() as unknown as {
    $keycloakClient?: KeycloakClientRuntime
  }

  return nuxtApp.$keycloakClient ?? null
}

export function useKeycloakToken() {
  const sso = useSsoSessionStore()

  const keycloak = computed(() => getProvidedKeycloakClient())
  const token = computed(() => sso.token || keycloak.value?.token?.())
  const tokenParsed = computed(() => sso.tokenParsed || keycloak.value?.tokenParsed?.() || null)
  const authenticated = computed(() => sso.authenticated || keycloak.value?.authenticated === true)

  async function ensureFreshToken(): Promise<string | undefined> {
    const client = keycloak.value

    try {
      if (client?.updateToken) {
        await client.updateToken(30)
      }
    }
    catch {
      // Le caller gère l'absence de token.
    }

    return token.value || undefined
  }

  async function login(redirectUri?: string): Promise<void> {
    await keycloak.value?.login?.(redirectUri ? { redirectUri } : undefined)
  }

  async function logout(redirectUri?: string): Promise<void> {
    sso.clear()
    await keycloak.value?.logout?.(redirectUri ? { redirectUri } : undefined)
  }

  return {
    keycloak,
    token,
    tokenParsed,
    authenticated,
    ensureFreshToken,
    login,
    logout,
  }
}
