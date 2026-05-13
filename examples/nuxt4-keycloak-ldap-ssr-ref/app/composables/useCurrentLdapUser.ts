import type { LdapAppUser } from '~/types/ldap-user'
import { useLdapSessionStore } from '~/stores/ldap-session'
import { useSsoSessionStore } from '~/stores/sso-session'

function extractInitials(value: string | null | undefined): string {
  const source = value?.trim() || 'U'

  return source
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('')
}

export function useCurrentLdapUser() {
  const ssoStore = useSsoSessionStore()
  const store = useLdapSessionStore()
  const bridge = useKeycloakLdapBridge()
  const keycloak = useKeycloakToken()

  const user = computed<LdapAppUser | null>(() => store.currentUser)
  const ssoUser = computed(() => ssoStore.tokenParsed)
  const ldap = computed(() => user.value?.ldap ?? null)
  const sso = computed(() => user.value?.sso ?? ssoUser.value ?? null)

  const displayName = computed(() => {
    return user.value?.displayName
      || user.value?.username
      || user.value?.email
      || ssoUser.value?.name
      || ssoUser.value?.preferred_username
      || ssoUser.value?.email
      || 'Utilisateur'
  })

  const initials = computed(() => extractInitials(displayName.value))
  const roles = computed(() => user.value?.roles ?? [])
  const groups = computed(() => user.value?.groups ?? [])
  const isAdmin = computed(() => Boolean(user.value?.isAdmin))
  const isDsi = computed(() => Boolean(user.value?.isDsi))
  const loading = computed(() => store.loading)
  const error = computed(() => store.error || ssoStore.error)
  const synchronized = computed(() => store.synchronized && Boolean(user.value))
  const isSsoAuthenticated = computed(() => keycloak.authenticated.value || ssoStore.authenticated)
  const isFeathersAuthenticated = computed(() => store.isAuthenticated)

  async function refresh(): Promise<void> {
    await bridge.synchronize('manual-refresh')
  }

  async function login(): Promise<void> {
    await keycloak.login(window.location.origin)
  }

  async function logout(): Promise<void> {
    store.clear()
    ssoStore.clear()
    await keycloak.logout(window.location.origin)
  }

  return {
    user,
    ssoUser,
    ldap,
    sso,
    displayName,
    initials,
    roles,
    groups,
    isAdmin,
    isDsi,
    loading,
    error,
    synchronized,
    isSsoAuthenticated,
    isFeathersAuthenticated,
    refresh,
    login,
    logout,
  }
}
