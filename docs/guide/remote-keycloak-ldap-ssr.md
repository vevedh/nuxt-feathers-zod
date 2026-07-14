---
editLink: false
---
# Nuxt 4 SSR + Keycloak client-only + LDAP backend

Ce guide décrit le modèle SSR recommandé pour une application Nuxt 4 qui utilise Keycloak SSO côté navigateur, un backend Feathers distant exposé via NFZ `6.5.30`, et une stratégie backend `keycloak-ldap` pour résoudre l'utilisateur LDAP/Active Directory.

Le modèle est volontairement séparé en trois responsabilités :

```txt
Keycloak = uniquement côté client Nuxt
NFZ 6.5.30 = client Feathers remote direct
LDAP/AD = uniquement côté backend Feathers
```

La différence avec le modèle SPA tient au rendu Nuxt : `ssr: true` est activé. Keycloak reste cependant strictement client-only. Le serveur Nuxt rend un shell stable, puis le navigateur finalise l'authentification SSO et lance la synchronisation LDAP.

## Quand utiliser ce modèle

Utilise ce modèle lorsque :

- l'application doit conserver le rendu SSR Nuxt pour la structure, les layouts ou les pages publiques ;
- l'authentification réelle est fournie par Keycloak dans le navigateur ;
- le backend Feathers possède déjà une stratégie `keycloak-ldap` ou équivalente ;
- le frontend doit appeler directement l'API Feathers distante, sans proxy Nitro local ;
- les informations applicatives doivent venir du LDAP/AD backend plutôt que du seul `tokenParsed` Keycloak.

Ce modèle n'est pas une authentification OIDC serveur avec cookies `httpOnly`. Pour ce besoin, il faut prévoir une architecture serveur dédiée.

## Flux d'exécution

```txt
1. Nuxt rend la page côté serveur avec ssr: true.
2. Les blocs dépendants de Keycloak ou LDAP sont encapsulés dans <ClientOnly>.
3. app/plugins/keycloak.client.ts initialise keycloak-js côté navigateur.
4. keycloak.init() finalise le callback OIDC.
5. L'application nettoie l'URL après keycloak.init() pour retirer #state=...&session_state=...&code=...
6. app/plugins/keycloak-ldap-bridge.client.ts lance la synchronisation LDAP automatique.
7. useKeycloakLdapBridge appelle api.service('authentication').create(...).
8. Le backend Feathers exécute la stratégie keycloak-ldap, interroge LDAP/AD et retourne user + accessToken.
9. Le store ldap-session expose l'utilisateur applicatif enrichi.
```

## Configuration Nuxt

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

Points importants :

- `ssr: true` active le rendu serveur Nuxt.
- `keycloak: false` évite toute gestion Keycloak dans NFZ.
- `auth: false` évite de mélanger l'auth runtime NFZ avec le SSO client-only.
- `server.enabled: false` confirme que l'application consomme un backend Feathers distant.
- `restPath` reste vide si le backend expose directement `/authentication`.

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
NUXT_PUBLIC_AUTH_DEBUG=false
```

## Plugin Keycloak client-only

Le plugin doit être suffixé `.client.ts`. Il ne s'exécute jamais pendant le rendu serveur.

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

La fonction `cleanupOidcCallbackUrl()` doit toujours être exécutée **après** `keycloak.init()`, jamais avant.

## Synchronisation LDAP automatique

Le bridge LDAP est aussi un plugin client. Il attend que l'application soit montée, vérifie la session Keycloak, puis appelle le service Feathers distant.

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

## Appel NFZ remote direct

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

## Rendu SSR-safe

Les informations Keycloak et LDAP ne sont disponibles qu'après montage côté navigateur. Les composants qui les affichent doivent donc utiliser `<ClientOnly>`.

```vue
<template>
  <ClientOnly>
    <UserSessionPanel />

    <template #fallback>
      <div class="text-grey-7">
        Chargement de la session utilisateur…
      </div>
    </template>
  </ClientOnly>
</template>
```

Pour les pages protégées, les middlewares doivent rester client-only tant que la session n'est pas lisible côté serveur :

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

## Contrat backend attendu

Le backend Feathers doit enregistrer une stratégie dédiée :

```js
authentication.register('keycloak-ldap', new SsoLdapStrategy())
```

Le frontend envoie :

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

Réponse attendue :

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

## CORS indispensable côté backend

Comme l'appel est direct depuis le navigateur vers le backend Feathers, le serveur doit gérer `OPTIONS /authentication` avant Feathers REST.

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

## Exemple inclus

Le dépôt contient un exemple complet :

```txt
examples/nuxt4-keycloak-ldap-ssr-ref/
```

Cet exemple reprend la structure Nuxt 4 SSR, Quasar 2, UnoCSS, Pinia, NFZ `6.5.30` remote direct, Keycloak client-only et synchronisation LDAP automatique.

## Règles de production

- Ne place pas de secrets Keycloak ou LDAP dans le frontend.
- Garde la vérification et l'enrichissement LDAP côté backend.
- Configure une allowlist CORS stricte.
- Ne nettoie jamais le hash Keycloak avant `keycloak.init()`.
- Sépare la session SSO (`sso-session`) de la session applicative LDAP (`ldap-session`).
- Prévois une évolution distincte si tu veux une vraie session serveur Nuxt avec cookies `httpOnly`.
