import { useKeycloakLdapBridge } from '~/composables/useKeycloakLdapBridge'
import { useLdapSessionStore } from '~/stores/ldap-session'
import { useSsoSessionStore } from '~/stores/sso-session'

function resolveSyncKey(): string {
  const sso = useSsoSessionStore()
  const user = sso.tokenParsed
  const sid = typeof user?.sid === 'string' ? user.sid : ''
  const sub = typeof user?.sub === 'string' ? user.sub : ''
  const username = sso.username || ''

  return `nfz:keycloak-ldap:auto-sync:${sid || sub || username || 'anonymous'}`
}

function shouldAutoSync(): boolean {
  const config = useRuntimeConfig()
  const value = config.public.ldapBridge?.autoSync

  return value !== false
}

export default defineNuxtPlugin({
  name: 'keycloak-ldap-auto-sync',
  enforce: 'post',
  setup(nuxtApp) {
    nuxtApp.hook('app:mounted', async () => {
      if (!shouldAutoSync()) {
        return
      }

      const sso = useSsoSessionStore()
      const ldap = useLdapSessionStore()

      if (!sso.authenticated || !sso.token) {
        return
      }

      if (ldap.synchronized && ldap.currentUser) {
        return
      }

      const syncKey = resolveSyncKey()

      if (sessionStorage.getItem(syncKey) === 'done') {
        return
      }

      sessionStorage.setItem(syncKey, 'running')

      const bridge = useKeycloakLdapBridge()
      const result = await bridge.synchronize('auto-after-keycloak')

      if (result?.user) {
        sessionStorage.setItem(syncKey, 'done')

        if (import.meta.dev) {
          console.info('[keycloak-ldap] synchronisation LDAP automatique réussie', {
            username: result.user.username,
            hasUser: true,
          })
        }

        return
      }

      sessionStorage.removeItem(syncKey)

      if (import.meta.dev) {
        console.warn('[keycloak-ldap] synchronisation LDAP automatique non finalisée', {
          error: ldap.error,
        })
      }
    })
  },
})
