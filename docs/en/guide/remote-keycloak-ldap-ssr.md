---
editLink: false
---
# Nuxt 4 SSR + client-only Keycloak + LDAP backend

This guide describes the recommended SSR model for a Nuxt 4 application using Keycloak SSO in the browser, a remote Feathers backend consumed through NFZ `6.5.30`, and a backend `keycloak-ldap` strategy to resolve the LDAP/Active Directory user.

The model keeps three responsibilities strictly separated:

```txt
Keycloak = Nuxt client only
NFZ 6.5.30 = direct remote Feathers client
LDAP/AD = Feathers backend only
```

The difference with the SPA model is the Nuxt rendering mode: `ssr: true` is enabled. Keycloak still remains client-only. The Nuxt server renders a stable shell, then the browser completes the SSO flow and starts LDAP synchronization.

## When to use this model

Use this model when:

- the application needs Nuxt SSR for structure, layouts or public pages;
- authentication is provided by Keycloak in the browser;
- the Feathers backend already exposes a `keycloak-ldap` or equivalent strategy;
- the frontend should call the remote Feathers API directly, without a local Nitro proxy;
- application-level user data must come from backend LDAP/AD resolution rather than from Keycloak `tokenParsed` only.

This model is not a server-side OIDC authentication flow with `httpOnly` cookies. That requires a dedicated server-side session architecture.

## Execution flow

```txt
1. Nuxt renders the page on the server with ssr: true.
2. Blocks depending on Keycloak or LDAP are wrapped in <ClientOnly>.
3. app/plugins/keycloak.client.ts initializes keycloak-js in the browser.
4. keycloak.init() completes the OIDC callback.
5. The app cleans the URL after keycloak.init() to remove #state=...&session_state=...&code=...
6. app/plugins/keycloak-ldap-bridge.client.ts starts automatic LDAP synchronization.
7. useKeycloakLdapBridge calls api.service('authentication').create(...).
8. The Feathers backend runs the keycloak-ldap strategy, queries LDAP/AD and returns user + accessToken.
9. The ldap-session store exposes the enriched application user.
```

## Nuxt configuration

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  compatibilityDate: '2025-12-01',
  ssr: true,

  modules: [
    '@pinia/nuxt',
    '@unocss/nuxt',
    'nuxt-quasar-ui',
    'nuxt-feathers-zod',
  ],

  runtimeConfig: {
    public: {
      authDebug: process.env.NUXT_PUBLIC_AUTH_DEBUG === 'true',
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
        restPath: process.env.NFZ_REMOTE_REST_PATH ?? '',
        websocketPath: process.env.NFZ_REMOTE_SOCKET_PATH || '/socket.io',
        services: [
          { path: 'authentication', methods: ['create', 'remove'] },
          { path: 'users', methods: ['find', 'get'] },
          { path: 'ldap-users', methods: ['find', 'get'] },
        ],
      },
      pinia: true,
    },

    keycloak: false,
    auth: false,
    server: {
      enabled: false,
    },
  },
})
```

Important points:

- `ssr: true` enables Nuxt server rendering.
- `keycloak: false` prevents NFZ from managing Keycloak.
- `auth: false` avoids mixing NFZ auth runtime with the client-only SSO flow.
- `server.enabled: false` confirms that the app consumes a remote Feathers backend.
- `restPath` stays empty when the backend exposes `/authentication` at the root.

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
NUXT_PUBLIC_AUTH_DEBUG=false
```

## Client-only Keycloak plugin

The plugin must use the `.client.ts` suffix. It never runs during server rendering.

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
  }
  catch (error) {
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

`cleanupOidcCallbackUrl()` must always run **after** `keycloak.init()`, never before it.

## Automatic LDAP synchronization

The LDAP bridge is also a client plugin. It waits for the app to be mounted, checks the Keycloak session, then calls the remote Feathers service.

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
  const username = sso.username || ''

  return `nfz:keycloak-ldap:auto-sync:${sid || sub || username || 'anonymous'}`
}

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('app:mounted', async () => {
    const config = useRuntimeConfig()

    if (config.public.ldapBridge?.autoSync === false) {
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
      return
    }

    sessionStorage.removeItem(syncKey)
  })
})
```

## Direct NFZ remote call

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
  const nuxtApp = useNuxtApp()
  const sso = useSsoSessionStore()
  const ldap = useLdapSessionStore()

  async function synchronize(reason = 'manual-refresh'): Promise<KeycloakLdapAuthResult | null> {
    if (!sso.token) {
      ldap.setError('Keycloak token is not available')
      return null
    }

    const api = nuxtApp.$api as FeathersLikeApi

    try {
      const result = await api.service('authentication').create({
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
    catch (error) {
      ldap.setError(error)
      return null
    }
  }

  return {
    synchronize,
  }
}
```

## SSR-safe rendering

Keycloak and LDAP data are only available after client mount. Components displaying them should use `<ClientOnly>`.

```vue
<template>
  <ClientOnly>
    <UserSessionPanel />

    <template #fallback>
      <div class="text-grey-7">
        Loading user session…
      </div>
    </template>
  </ClientOnly>
</template>
```

For protected pages, middleware must remain client-only while the session cannot be read on the server:

```ts
// app/middleware/auth-keycloak-ldap.ts
export default defineNuxtRouteMiddleware(() => {
  if (import.meta.server) {
    return
  }

  const ldap = useLdapSessionStore()

  if (!ldap.synchronized || !ldap.currentUser) {
    return navigateTo('/')
  }
})
```

## Expected backend contract

The Feathers backend must register a dedicated strategy:

```js
authentication.register('keycloak-ldap', new SsoLdapStrategy())
```

The frontend sends:

```json
{
  "strategy": "keycloak-ldap",
  "username": "jdupont",
  "authenticated": true,
  "access_token": "<keycloak-token>",
  "tokenParsed": {},
  "ssoUser": {}
}
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

Because the call is made directly from the browser to the Feathers backend, the server must handle `OPTIONS /authentication` before Feathers REST.

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

## Included example

The repository contains a complete example:

```txt
examples/nuxt4-keycloak-ldap-ssr-ref/
```

This example uses Nuxt 4 SSR, Quasar 2, UnoCSS, Pinia, direct NFZ `6.5.30` remote mode, client-only Keycloak and automatic LDAP synchronization.

## Production rules

- Do not put Keycloak or LDAP secrets in the frontend.
- Keep LDAP verification and enrichment on the backend.
- Configure a strict CORS allowlist.
- Never clean the Keycloak hash before `keycloak.init()`.
- Separate the SSO session (`sso-session`) from the LDAP application session (`ldap-session`).
- Plan a separate architecture if the application needs a real Nuxt server session with `httpOnly` cookies.
