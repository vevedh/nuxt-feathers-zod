---
editLink: false
---
# Nuxt 4 SPA + client-only Keycloak + LDAP backend

This guide is the recommended simple model for NFZ `6.5.30` when a Nuxt 4 application needs Keycloak SSO and an LDAP/Active Directory enriched user.

The validated rule is intentionally strict:

```txt
Keycloak = Nuxt client only
NFZ = direct remote Feathers client
LDAP/AD = Feathers backend only
```

NFZ does not drive the Keycloak OIDC flow and does not create a Nitro `/api/keycloak-ldap` proxy. The application initializes Keycloak in a client plugin, then directly calls the remote Feathers `authentication` service with the Keycloak token.

## Target flow

```txt
1. Nuxt starts as an SPA with ssr: false.
2. app/plugins/keycloak.client.ts initializes keycloak-js.
3. keycloak.init() completes the OIDC callback.
4. The app stores token + tokenParsed in a Pinia SSO store.
5. The URL is cleaned after keycloak.init() to remove #state=...&session_state=...&code=...
6. The app calls NFZ remote: api.service('authentication').create(...).
7. The Feathers backend verifies or accepts the token according to its strategy, resolves LDAP/AD and returns user + accessToken.
8. The app stores the enriched LDAP user in a dedicated Pinia store.
```

## Minimal Nuxt configuration

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
        // Empty when the backend exposes /authentication at the root.
        restPath: process.env.NFZ_REMOTE_REST_PATH ?? '',
        websocketPath: process.env.NFZ_REMOTE_SOCKET_PATH || '/socket.io',
        services: [
          { path: 'authentication', methods: ['create', 'remove'] },
          { path: 'users', methods: ['find', 'get'] },
        ],
      },
      pinia: true,
    },

    // Important: Keycloak is not configured in NFZ here.
    // NFZ only remains the remote Feathers client.
    keycloak: false,
    auth: false,
    server: {
      enabled: false,
    },
  },
})
```

## Environment variables

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

## Client-only Keycloak plugin

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

## SSO store

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

## LDAP synchronization through direct NFZ remote

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
      ldap.setError('Keycloak token is unavailable')
      return null
    }

    if (!nuxtApp.$api) {
      ldap.setError('NFZ remote client is unavailable')
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

## Auto-sync after Keycloak

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

## Minimal LDAP store

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

## Expected backend contract

The Feathers backend must register a dedicated strategy:

```js
authentication.register('keycloak-ldap', new SsoLdapStrategy())
```

The frontend calls:

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

Expected response:

```json
{
  "accessToken": "feathers-jwt",
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

## Required backend CORS

Because the call is direct from the browser, the backend must accept `OPTIONS /authentication` before Feathers REST:

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

## Validation test

```powershell
curl.exe -i -X OPTIONS "https://api.example.local/authentication" `
  -H "Origin: http://localhost:3000" `
  -H "Access-Control-Request-Method: POST" `
  -H "Access-Control-Request-Headers: content-type,authorization"
```

The response must be `204 No Content`. If the backend still logs `Method OPTIONS not allowed`, the direct NFZ remote call will be blocked by the browser.

## Included example

The module archive contains a complete example in:

```txt
examples/nuxt4-keycloak-ldap-spa-ref/
```

This example implements the validated model: Nuxt 4 SPA, Quasar, UnoCSS, Pinia, client-only Keycloak, direct NFZ `6.5.30` remote mode and automatic LDAP synchronization after `keycloak.init()`.

## Rules to keep

- Do not configure `feathers.keycloak` in this scenario: use `keycloak: false`.
- Do not create a Nitro `/api/keycloak-ldap` proxy when backend CORS is properly configured.
- Clean the URL only after `keycloak.init()`.
- Always separate `sso-session` and `ldap-session`.
- Keep a manual button to re-run LDAP synchronization.

## Nuxt 4 SSR variant

An SSR variant is available for applications that need `ssr: true` while keeping Keycloak strictly client-side: [Nuxt 4 SSR + client-only Keycloak + LDAP backend](/en/guide/remote-keycloak-ldap-ssr).
