---
editLink: false
---
# Nuxt 4 SPA + Keycloak client-only + LDAP backend

Ce guide est le modèle simple recommandé pour NFZ `6.5.30` lorsqu'une application Nuxt 4 doit utiliser Keycloak SSO et un utilisateur LDAP/Active Directory enrichi.

Le principe validé est volontairement strict :

```txt
Keycloak = uniquement côté client Nuxt
NFZ = client Feathers remote direct
LDAP/AD = uniquement côté backend Feathers
```

NFZ ne pilote pas le flux OIDC Keycloak et ne crée pas de proxy Nitro `/api/keycloak-ldap`. L'application initialise Keycloak dans un plugin client, puis appelle directement le service Feathers distant `authentication` avec le token Keycloak.

## Flux cible

```txt
1. Nuxt démarre en SPA avec ssr: false.
2. app/plugins/keycloak.client.ts initialise keycloak-js.
3. keycloak.init() finalise le callback OIDC.
4. L'application stocke token + tokenParsed dans un store Pinia SSO.
5. L'URL est nettoyée après keycloak.init() pour retirer #state=...&session_state=...&code=...
6. L'application appelle NFZ remote : api.service('authentication').create(...).
7. Le backend Feathers vérifie ou accepte le token selon sa stratégie, interroge LDAP/AD et retourne user + accessToken.
8. L'application stocke l'utilisateur LDAP enrichi dans un store Pinia dédié.
```

## Configuration Nuxt minimale

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  compatibilityDate: '2025-12-01',
  ssr: false,

  modules: [
    '@pinia/nuxt',
    'pinia-plugin-persistedstate/nuxt',
    '@unocss/nuxt',
    'nuxt-quasar-ui',
    'nuxt-feathers-zod',
  ],

  runtimeConfig: {
    public: {
      keycloak: {
        serverUrl: process.env.KEYCLOAK_SERVER_URL || 'https://keycloak.example.local',
        realm: process.env.KEYCLOAK_REALM || 'EXAMPLE',
        clientId: process.env.KEYCLOAK_CLIENT_ID || 'nuxt4app',
        onLoad: process.env.KEYCLOAK_ON_LOAD || 'check-sso',
      },
      ldapBridge: {
        autoSync: process.env.NUXT_PUBLIC_LDAP_AUTO_SYNC !== 'false',
      },
    },
  },

  feathers: {
    client: {
      mode: 'remote',
      remote: {
        url: process.env.NFZ_REMOTE_URL || 'https://api.example.local',
        transport: 'rest',
        // Vide si le backend expose /authentication à la racine.
        restPath: process.env.NFZ_REMOTE_REST_PATH ?? '',
        websocketPath: process.env.NFZ_REMOTE_SOCKET_PATH || '/socket.io',
        services: [
          { path: 'authentication', methods: ['create', 'remove'] },
          { path: 'users', methods: ['find', 'get'] },
        ],
      },
      pinia: true,
    },

    // Important : Keycloak n'est pas configuré dans NFZ.
    // NFZ reste uniquement le client Feathers remote.
    keycloak: false,
    auth: false,
    server: {
      enabled: false,
    },
  },
})
```

## Variables d'environnement

```txt
NFZ_REMOTE_URL=https://api.example.local
NFZ_REMOTE_REST_PATH=
NFZ_REMOTE_SOCKET_PATH=/socket.io

KEYCLOAK_SERVER_URL=https://keycloak.example.local
KEYCLOAK_REALM=EXAMPLE
KEYCLOAK_CLIENT_ID=nuxt4app
KEYCLOAK_ON_LOAD=check-sso

NUXT_PUBLIC_LDAP_AUTO_SYNC=true
NUXT_PUBLIC_AUTH_DEBUG=true
```

## Plugin Keycloak client-only

```ts
// app/plugins/keycloak.client.ts
import Keycloak from 'keycloak-js'
import { useSsoSessionStore } from '~/stores/sso-session'

interface PublicKeycloakConfig {
  serverUrl?: string
  realm?: string
  clientId?: string
  onLoad?: 'check-sso' | 'login-required'
}

function cleanupOidcCallbackUrl(): void {
  const url = new URL(window.location.href)
  const hashValue = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash
  const hashParams = new URLSearchParams(hashValue)

  const hasKeycloakHash = hashParams.has('state')
    && (hashParams.has('code') || hashParams.has('session_state'))

  const hasKeycloakQuery = url.searchParams.has('state')
    && (url.searchParams.has('code') || url.searchParams.has('session_state'))

  if (hasKeycloakHash) {
    url.hash = ''
  }

  if (hasKeycloakQuery) {
    url.searchParams.delete('state')
    url.searchParams.delete('session_state')
    url.searchParams.delete('code')
  }

  if (hasKeycloakHash || hasKeycloakQuery) {
    window.history.replaceState(
      window.history.state,
      document.title,
      `${url.pathname}${url.search}${url.hash}`,
    )
  }
}

export default defineNuxtPlugin(async () => {
  const config = useRuntimeConfig()
  const keycloakConfig = config.public.keycloak as PublicKeycloakConfig
  const sso = useSsoSessionStore()

  const keycloak = new Keycloak({
    url: keycloakConfig.serverUrl,
    realm: keycloakConfig.realm,
    clientId: keycloakConfig.clientId,
  })

  try {
    const authenticated = await keycloak.init({
      onLoad: keycloakConfig.onLoad || 'check-sso',
      pkceMethod: 'S256',
      checkLoginIframe: false,
      responseMode: 'fragment',
      silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
    })

    cleanupOidcCallbackUrl()

    sso.setSession({
      authenticated: authenticated === true && Boolean(keycloak.token),
      token: keycloak.token ?? null,
      tokenParsed: keycloak.tokenParsed as Record<string, unknown> | null,
    })
  } catch (error) {
    cleanupOidcCallbackUrl()
    sso.setError(error)
  }

  return {
    provide: {
      keycloakClient: keycloak,
    },
  }
})
```

## Store SSO

```ts
// app/stores/sso-session.ts
import { defineStore } from 'pinia'

export const useSsoSessionStore = defineStore('sso-session', {
  state: () => ({
    authenticated: false,
    token: null as string | null,
    tokenParsed: null as Record<string, unknown> | null,
    error: null as string | null,
  }),

  getters: {
    username: state => String(
      state.tokenParsed?.preferred_username
      || state.tokenParsed?.userid
      || state.tokenParsed?.username
      || state.tokenParsed?.email
      || '',
    ),
  },

  actions: {
    setSession(payload: {
      authenticated: boolean
      token: string | null
      tokenParsed: Record<string, unknown> | null
    }): void {
      this.authenticated = payload.authenticated
      this.token = payload.token
      this.tokenParsed = payload.tokenParsed
      this.error = null
    },

    setError(error: unknown): void {
      this.authenticated = false
      this.token = null
      this.tokenParsed = null
      this.error = error instanceof Error ? error.message : String(error)
    },

    clear(): void {
      this.authenticated = false
      this.token = null
      this.tokenParsed = null
      this.error = null
    },
  },
})
```

## Synchronisation LDAP via NFZ remote direct

```ts
// app/composables/useKeycloakLdapBridge.ts
import { useLdapSessionStore } from '~/stores/ldap-session'
import { useSsoSessionStore } from '~/stores/sso-session'

interface KeycloakLdapAuthResult {
  accessToken?: string
  authentication?: Record<string, unknown>
  user?: Record<string, unknown>
}

interface FeathersLikeApi {
  service(path: string): {
    create(data: Record<string, unknown>): Promise<KeycloakLdapAuthResult>
  }
}

export function useKeycloakLdapBridge() {
  const sso = useSsoSessionStore()
  const ldap = useLdapSessionStore()
  const nuxtApp = useNuxtApp() as unknown as { $api?: FeathersLikeApi }

  async function synchronize(reason = 'manual'): Promise<KeycloakLdapAuthResult | null> {
    if (!sso.authenticated || !sso.token) {
      ldap.setError('Token Keycloak indisponible')
      return null
    }

    if (!nuxtApp.$api) {
      ldap.setError('Client NFZ remote indisponible')
      return null
    }

    const result = await nuxtApp.$api.service('authentication').create({
      strategy: 'keycloak-ldap',
      username: sso.username,
      authenticated: true,
      access_token: sso.token,
      tokenParsed: sso.tokenParsed,
      ssoUser: sso.tokenParsed,
      reason,
    })

    ldap.setAuthResult(result)
    return result
  }

  return {
    synchronize,
  }
}
```

## Auto-sync après Keycloak

```ts
// app/plugins/keycloak-ldap-bridge.client.ts
import { useKeycloakLdapBridge } from '~/composables/useKeycloakLdapBridge'
import { useLdapSessionStore } from '~/stores/ldap-session'
import { useSsoSessionStore } from '~/stores/sso-session'

function resolveSyncKey(): string {
  const sso = useSsoSessionStore()
  const user = sso.tokenParsed
  const sid = typeof user?.sid === 'string' ? user.sid : ''
  const sub = typeof user?.sub === 'string' ? user.sub : ''

  return `nfz:keycloak-ldap:auto-sync:${sid || sub || sso.username || 'anonymous'}`
}

export default defineNuxtPlugin({
  name: 'keycloak-ldap-auto-sync',
  enforce: 'post',
  setup(nuxtApp) {
    nuxtApp.hook('app:mounted', async () => {
      const config = useRuntimeConfig()

      if (config.public.ldapBridge?.autoSync === false) {
        return
      }

      const sso = useSsoSessionStore()
      const ldap = useLdapSessionStore()

      if (!sso.authenticated || !sso.token || ldap.synchronized) {
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
        return
      }

      sessionStorage.removeItem(syncKey)
    })
  },
})
```

## Store LDAP minimal

```ts
// app/stores/ldap-session.ts
import { defineStore } from 'pinia'

interface KeycloakLdapAuthResult {
  accessToken?: string
  authentication?: Record<string, unknown>
  user?: Record<string, unknown>
}

export const useLdapSessionStore = defineStore('ldap-session', {
  state: () => ({
    synchronized: false,
    accessToken: null as string | null,
    authentication: null as Record<string, unknown> | null,
    currentUser: null as Record<string, unknown> | null,
    error: null as string | null,
    lastSyncAt: null as string | null,
  }),

  actions: {
    setAuthResult(result: KeycloakLdapAuthResult): void {
      this.synchronized = true
      this.accessToken = result.accessToken || null
      this.authentication = result.authentication || null
      this.currentUser = result.user || null
      this.error = null
      this.lastSyncAt = new Date().toISOString()
    },

    setError(error: unknown): void {
      this.synchronized = false
      this.error = error instanceof Error ? error.message : String(error)
    },
  },
})
```

## Contrat backend attendu

Le backend Feathers doit enregistrer une stratégie dédiée :

```js
authentication.register('keycloak-ldap', new SsoLdapStrategy())
```

Le frontend appelle :

```ts
await api.service('authentication').create({
  strategy: 'keycloak-ldap',
  username: 'jdupont',
  authenticated: true,
  access_token: '<keycloak-token>',
  tokenParsed: {},
  ssoUser: {},
})
```

La réponse attendue :

```json
{
  "accessToken": "jwt-feathers",
  "authentication": {
    "strategy": "keycloak-ldap"
  },
  "user": {
    "username": "jdupont",
    "email": "jdupont@example.local",
    "displayName": "Jean Dupont",
    "ldap": {},
    "sso": {}
  }
}
```

## CORS indispensable côté backend

Comme l'appel est direct depuis le navigateur, le backend doit accepter `OPTIONS /authentication` avant Feathers REST :

```js
import cors from 'cors'
import express from '@feathersjs/express'

const allowedOrigins = [
  'http://localhost:3000',
  'https://app.example.local',
]

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true)
    }

    return callback(new Error(`CORS origin rejected: ${origin}`))
  },
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
}

app.use(cors(corsOptions))
app.options(/.*/, cors(corsOptions))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.configure(express.rest())
```

## Test de validation

```powershell
curl.exe -i -X OPTIONS "https://api.example.local/authentication" `
  -H "Origin: http://localhost:3000" `
  -H "Access-Control-Request-Method: POST" `
  -H "Access-Control-Request-Headers: content-type,authorization"
```

La réponse doit être `204 No Content`. Si le backend affiche encore `Method OPTIONS not allowed`, l'appel NFZ remote direct sera bloqué par le navigateur.

## Exemple inclus

L'archive du module contient un exemple complet dans :

```txt
examples/nuxt4-keycloak-ldap-spa-ref/
```

Cet exemple reprend le modèle validé : Nuxt 4 SPA, Quasar, UnoCSS, Pinia, Keycloak client-only, NFZ `6.5.30` remote direct et synchronisation LDAP automatique après `keycloak.init()`.

## Règles à retenir

- Ne configure pas `feathers.keycloak` dans ce scénario : utilise `keycloak: false`.
- Ne crée pas de proxy Nitro `/api/keycloak-ldap` si le backend CORS est correctement configuré.
- Nettoie l'URL seulement après `keycloak.init()`.
- Sépare toujours `sso-session` et `ldap-session`.
- Garde un bouton manuel pour relancer la synchronisation LDAP.

## Variante SSR Nuxt 4

Une variante SSR est disponible pour les applications qui souhaitent garder `ssr: true` tout en conservant Keycloak strictement côté client : [Nuxt 4 SSR + Keycloak client-only + LDAP backend](/guide/remote-keycloak-ldap-ssr).
