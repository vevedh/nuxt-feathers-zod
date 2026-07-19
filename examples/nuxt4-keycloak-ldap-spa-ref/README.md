# Nuxt 4 + Quasar + UnoCSS + NFZ 6.6.0 remote + Keycloak client-only + LDAP backend

Cette application est le **modèle de référence validé** pour une application SPA Nuxt 4 utilisant Keycloak, LDAP et NFZ.

```txt
Keycloak = uniquement côté client Nuxt
NFZ 6.6.0 = client Feathers remote direct
LDAP = uniquement côté backend Feathers
```

Le navigateur initialise Keycloak avec `keycloak-js`. Après `keycloak.init()` réussi, l'application :

1. stocke `token` + `tokenParsed` dans `sso-session` ;
2. nettoie l'URL pour retirer `#state=...&session_state=...&code=...` ;
3. lance automatiquement la synchronisation LDAP via NFZ remote ;
4. stocke l'utilisateur LDAP enrichi dans `ldap-session`.

Il n'y a pas de proxy Nitro local :

```txt
server/api/keycloak-ldap/authentication.post.ts ❌
server/api/keycloak-ldap/ping.get.ts ❌
/api/keycloak-ldap/authentication ❌
```

## Installation

```bash
bun install
bun dev
```

Nettoyage recommandé après changement d'archive ou de version Nuxt/NFZ :

```powershell
bun run clean:repo
Remove-Item -Recurse -Force .nuxt,node_modules,.output,node_modules\.vite,node_modules\.cache, .\bun.lock -ErrorAction SilentlyContinue
bun install
bun dev
```

## Variables

Copie `.env.example` vers `.env`.

```env
NFZ_REMOTE_URL=https://api.example.local
NFZ_REMOTE_REST_PATH=
NFZ_REMOTE_SOCKET_PATH=/socket.io

KEYCLOAK_SERVER_URL=https://keycloak.example.local
KEYCLOAK_REALM=EXAMPLE
KEYCLOAK_CLIENT_ID=nuxt4app
KEYCLOAK_ON_LOAD=check-sso

# Lance automatiquement le bridge LDAP après authentification Keycloak réussie.
NUXT_PUBLIC_LDAP_AUTO_SYNC=true

NUXT_PUBLIC_AUTH_DEBUG=true
```

## Configuration NFZ

Le backend expose `/authentication` à la racine. Le `restPath` NFZ doit donc rester vide :

```ts
feathers: {
  client: {
    mode: 'remote',
    remote: {
      url: process.env.NFZ_REMOTE_URL || 'https://api.example.local',
      transport: 'rest',
      restPath: process.env.NFZ_REMOTE_REST_PATH ?? '',
      services: [
        {
          path: 'authentication',
          methods: ['create', 'remove'],
        },
      ],
    },
    pinia: true,
  },

  keycloak: false,
  auth: false,
  server: {
    enabled: false,
  },
}
```

`keycloak: false` est volontaire : Keycloak n'est pas piloté par NFZ. Il est initialisé dans `app/plugins/keycloak.client.ts`.

## Payload envoyé au backend Feathers

La synchronisation LDAP utilise NFZ remote direct :

```ts
api.service('authentication').create({
  strategy: 'keycloak-ldap',
  username,
  authenticated: true,
  access_token: keycloakToken,
  tokenParsed,
  ssoUser: tokenParsed,
  reason: 'auto-after-keycloak',
})
```

Le bouton **Synchroniser LDAP** relance le même flux avec `reason: 'manual-refresh'`.

## Backend Feathers requis

Le backend doit enregistrer une stratégie :

```js
authentication.register('keycloak-ldap', new SsoLdapStrategy())
```

Et répondre à :

```txt
POST https://api.example.local/authentication
```

Résultat attendu :

```json
{
  "accessToken": "jwt-feathers",
  "authentication": {
    "strategy": "keycloak-ldap"
  },
  "user": {
    "username": "...",
    "email": "...",
    "ldap": {},
    "sso": {}
  }
}
```

## Point indispensable : CORS / OPTIONS côté backend

Comme l'appel est direct depuis le navigateur vers `https://api.example.local/authentication`, le backend doit accepter le preflight :

```txt
OPTIONS /authentication
```

Exemple Express/Feathers :

```js
import cors from 'cors'
import express from '@feathersjs/express'

const allowedOrigins = [
  'http://localhost:3000',
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
```

À placer avant `app.configure(express.rest())` et avant l'enregistrement des services.

Si le backend affiche encore :

```txt
Method OPTIONS not allowed
```

le frontend ne pourra pas appeler `/authentication`, même si NFZ est correctement configuré.

## Flux final

```txt
1. Nuxt démarre en SPA.
2. app/plugins/keycloak.client.ts initialise Keycloak.
3. Keycloak finalise le callback OAuth/OIDC.
4. L'application nettoie l'URL : suppression de #state=... après keycloak.init().
5. app/plugins/keycloak-ldap-bridge.client.ts lance automatiquement la synchronisation LDAP.
6. useKeycloakLdapBridge appelle api.service('authentication').create(...).
7. Le backend vérifie le token Keycloak, cherche l'utilisateur LDAP, retourne user + accessToken Feathers.
8. Le store ldap-session affiche l'utilisateur LDAP complet.
```

## Fichiers essentiels

```txt
app/plugins/keycloak.client.ts              # Keycloak client-only + nettoyage URL
app/plugins/keycloak-ldap-bridge.client.ts  # auto-sync LDAP après Keycloak
app/composables/useKeycloakLdapBridge.ts    # appel direct NFZ remote /authentication
app/stores/sso-session.ts                   # état Keycloak
app/stores/ldap-session.ts                  # état Feathers/LDAP
nuxt.config.ts                              # NFZ remote + Keycloak désactivé dans NFZ
```
